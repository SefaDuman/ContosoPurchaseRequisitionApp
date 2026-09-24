/**
 * Requisition service — create requisitions, list a user's requisitions, and
 * drive the approver queue. Wraps the generated header/line virtual-entity
 * services and maps to clean app models.
 */

import {
  Mserp_purchaserequisitionheaderv2entitiesService,
  Mserp_purchaserequisitionlinev2entitiesService,
} from '../generated';
import type { Mserp_purchaserequisitionheaderv2entities } from '../generated/models/Mserp_purchaserequisitionheaderv2entitiesModel';
import type { Mserp_purchaserequisitionlinev2entities } from '../generated/models/Mserp_purchaserequisitionlinev2entitiesModel';
import type {
  ApprovalDecision,
  CreateRequisitionInput,
  Requisition,
  RequisitionLine,
  RequisitionStatus,
} from '../models';
import {
  DEFAULT_COMPANY,
  PURPOSE_CODE,
  PURPOSE_FROM_CODE,
  STATUS_CODE,
  STATUS_FROM_CODE,
  odataString,
} from './config';
import { AppError, guard, unwrap } from './errors';
import { fetchAll } from './paging';
import { getWorkers, resolveWorker } from './workerService';

const HEADER_SELECT = [
  'mserp_purchaserequisitionheaderv2entityid',
  'mserp_requisitionnumber',
  'mserp_requisitionname',
  'mserp_requisitionpurpose',
  'mserp_requisitionstatus',
  'mserp_defaultbusinessjustificationdetails',
  'mserp_defaultrequesteddate',
  'mserp_preparerpersonnelnumber',
];

const LINE_SELECT = [
  'mserp_requisitionnumber',
  'mserp_requisitionlinenumber',
  'mserp_itemnumber',
  'mserp_linedescription',
  'mserp_productname',
  'mserp_procurementproductcategoryname',
  'mserp_requestedpurchasequantity',
  'mserp_purchaseprice',
  'mserp_purchaseunitsymbol',
  'mserp_lineamount',
];

function mapStatus(code: number | undefined): RequisitionStatus {
  return (code != null && STATUS_FROM_CODE[code]) || 'Unknown';
}

function mapLine(l: Mserp_purchaserequisitionlinev2entities): RequisitionLine {
  const quantity = l.mserp_requestedpurchasequantity ?? 0;
  const unitPrice = l.mserp_purchaseprice ?? 0;
  return {
    requisitionNumber: l.mserp_requisitionnumber,
    lineNumber: l.mserp_requisitionlinenumber,
    itemNumber: l.mserp_itemnumber,
    description: l.mserp_linedescription || l.mserp_productname || l.mserp_itemnumber || '',
    categoryName: l.mserp_procurementproductcategoryname,
    quantity,
    unitPrice,
    unit: l.mserp_purchaseunitsymbol,
    lineAmount: l.mserp_lineamount ?? quantity * unitPrice,
  };
}

function mapHeader(
  h: Mserp_purchaserequisitionheaderv2entities,
  lines: RequisitionLine[],
  nameMap: Map<string, string>,
): Requisition {
  const preparer = h.mserp_preparerpersonnelnumber ?? undefined;
  return {
    requisitionNumber: h.mserp_requisitionnumber ?? '',
    name: h.mserp_requisitionname ?? h.mserp_requisitionnumber ?? '',
    purpose: (h.mserp_requisitionpurpose != null && PURPOSE_FROM_CODE[h.mserp_requisitionpurpose]) || 'Consumption',
    status: mapStatus(h.mserp_requisitionstatus),
    businessJustification: h.mserp_defaultbusinessjustificationdetails,
    requestedDate: h.mserp_defaultrequesteddate,
    preparerPersonnelNumber: preparer,
    preparerName: preparer ? nameMap.get(preparer) : undefined,
    total: lines.reduce((sum, l) => sum + l.lineAmount, 0),
    lines,
  };
}

/** Load all lines for the given requisition numbers in a single OR query. */
async function loadLinesFor(requisitionNumbers: string[]): Promise<Map<string, RequisitionLine[]>> {
  const byReq = new Map<string, RequisitionLine[]>();
  if (requisitionNumbers.length === 0) return byReq;

  const filter = requisitionNumbers
    .map((n) => `mserp_requisitionnumber eq '${odataString(n)}'`)
    .join(' or ');
  const rows = await fetchAll<Mserp_purchaserequisitionlinev2entities>(
    'Load requisition lines',
    (o) => Mserp_purchaserequisitionlinev2entitiesService.getAll(o),
    { select: LINE_SELECT, filter, orderBy: ['mserp_requisitionlinenumber'] },
  );

  for (const line of rows.map(mapLine)) {
    const list = byReq.get(line.requisitionNumber) ?? [];
    list.push(line);
    byReq.set(line.requisitionNumber, list);
  }
  return byReq;
}

/** Resolve worker names for a set of personnel numbers (best-effort). */
async function loadWorkerNames(personnelNumbers: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const distinct = Array.from(new Set(personnelNumbers.filter(Boolean)));
  if (distinct.length === 0) return map;
  const workers = await getWorkers();
  for (const w of workers) map.set(w.personnelNumber, w.name);
  return map;
}

/** Assemble full Requisition objects (with lines + preparer names) from headers. */
async function assemble(
  headers: Mserp_purchaserequisitionheaderv2entities[],
): Promise<Requisition[]> {
  const numbers = headers.map((h) => h.mserp_requisitionnumber ?? '').filter(Boolean);
  const [linesByReq, nameMap] = await Promise.all([
    loadLinesFor(numbers),
    loadWorkerNames(headers.map((h) => h.mserp_preparerpersonnelnumber ?? '')),
  ]);
  return headers.map((h) =>
    mapHeader(h, linesByReq.get(h.mserp_requisitionnumber ?? '') ?? [], nameMap),
  );
}

/**
 * Create a purchase requisition header + lines in Dataverse (writes through to
 * F&O). Enforces the preparer-must-be-a-current-worker constraint up front.
 */
export async function createRequisition(
  input: CreateRequisitionInput,
): Promise<{ requisitionNumber: string }> {
  return guard('Create requisition', async () => {
    if (input.lines.length === 0) {
      throw new AppError('Add at least one line before submitting.');
    }

    // F&O rejects the requisition if the preparer is not a current worker.
    // Validate before writing anything so the user gets a clear, early message.
    const preparer = await resolveWorker(input.preparerPersonnelNumber);
    if (!preparer) {
      throw new AppError(
        `Preparer "${input.preparerPersonnelNumber}" is not a current F&O worker. ` +
          `Pick a valid requester from the worker list before submitting.`,
      );
    }

    // 1) Create the header. RequisitionNumber is assigned by the F&O number
    //    sequence, so we do not set it and read it back from the result.
    const headerResult = await Mserp_purchaserequisitionheaderv2entitiesService.create({
      mserp_requisitionname: input.name,
      mserp_requisitionpurpose: PURPOSE_CODE[input.purpose],
      mserp_defaultbusinessjustificationdetails: input.businessJustification,
      mserp_defaultrequesteddate: input.requestedDate,
      mserp_preparerpersonnelnumber: preparer.personnelNumber,
      mserp_requisitionstatus: STATUS_CODE.Draft,
    });
    const header = unwrap(headerResult, 'Create requisition header');
    const requisitionNumber = header.mserp_requisitionnumber;
    if (!requisitionNumber) {
      throw new AppError('The requisition header was created but no requisition number was returned.');
    }

    // 2) Create each line against the new header. buyinglegalentityid is the
    //    required company field on the line (the header exposes no company).
    for (let i = 0; i < input.lines.length; i++) {
      const line = input.lines[i];
      const lineResult = await Mserp_purchaserequisitionlinev2entitiesService.create({
        mserp_requisitionnumber: requisitionNumber,
        mserp_requisitionlinenumber: i + 1,
        mserp_buyinglegalentityid: input.company || DEFAULT_COMPANY,
        mserp_receivingsiteid: input.site || undefined,
        mserp_receivingwarehouseid: input.warehouse || undefined,
        mserp_receivingoperatingunitnumber: input.receivingOperatingUnit || undefined,
        mserp_itemnumber: line.isNonCatalog ? undefined : line.product?.itemNumber,
        mserp_linedescription: line.description,
        mserp_procurementproductcategoryname: line.categoryName,
        mserp_productcolorid: line.color || undefined,
        mserp_productsizeid: line.size || undefined,
        mserp_productconfigurationid: line.configuration || undefined,
        mserp_productstyleid: line.style || undefined,
        mserp_requestedpurchasequantity: line.quantity,
        // Indicative price only — D365 trade agreements set the final PO price.
        mserp_purchaseprice: line.indicativePrice,
        mserp_purchaseunitsymbol: line.unit,
        mserp_requesteddate: input.requestedDate,
        mserp_requisitionerpersonnelnumber: preparer.personnelNumber,
      });
      unwrap(lineResult, `Create requisition line ${i + 1}`);
    }

    return { requisitionNumber };
  });
}

/** List the current user's requisitions (by preparer personnel number). */
export async function getMyRequisitions(personnelNumber: string): Promise<Requisition[]> {
  return guard('Load my requisitions', async () => {
    const headers = await fetchAll<Mserp_purchaserequisitionheaderv2entities>(
      'Load my requisitions',
      (o) => Mserp_purchaserequisitionheaderv2entitiesService.getAll(o),
      {
        select: HEADER_SELECT,
        filter: `mserp_preparerpersonnelnumber eq '${odataString(personnelNumber)}'`,
      },
    );
    return assemble(headers);
  });
}

/**
 * Infer the user's most-used legal entity from their existing requisition lines
 * (`mserp_buyinglegalentityid`). Returns the most frequent company code, or
 * undefined when the user has no lines. Used to default the active company.
 */
export async function inferUserCompany(personnelNumber: string): Promise<string | undefined> {
  return guard('Infer user legal entity', async () => {
    const lines = await fetchAll<Mserp_purchaserequisitionlinev2entities>(
      'Infer user legal entity',
      (o) => Mserp_purchaserequisitionlinev2entitiesService.getAll(o),
      {
        select: ['mserp_buyinglegalentityid', 'mserp_requisitionerpersonnelnumber'],
        filter: `mserp_requisitionerpersonnelnumber eq '${odataString(personnelNumber)}'`,
      },
    );

    const counts = new Map<string, number>();
    for (const l of lines) {
      const company = l.mserp_buyinglegalentityid;
      if (company) counts.set(company, (counts.get(company) ?? 0) + 1);
    }

    let best: string | undefined;
    let bestCount = 0;
    for (const [company, count] of counts) {
      if (count > bestCount) {
        best = company;
        bestCount = count;
      }
    }
    return best;
  });
}

/** Approver queue: requisitions currently in review. */
export async function getPendingApprovals(): Promise<Requisition[]> {
  return guard('Load pending approvals', async () => {
    const headers = await fetchAll<Mserp_purchaserequisitionheaderv2entities>(
      'Load pending approvals',
      (o) => Mserp_purchaserequisitionheaderv2entitiesService.getAll(o),
      {
        select: HEADER_SELECT,
        filter: `mserp_requisitionstatus eq ${STATUS_CODE.InReview}`,
      },
    );
    return assemble(headers);
  });
}

/**
 * Record an approval decision on a requisition.
 *
 * NOTE: F&O requisition approval is workflow-driven. Writing the status through
 * the virtual entity reflects app intent; any F&O workflow restriction is
 * surfaced to the user via the centralised error handling.
 */
export async function decideApproval(
  requisitionNumber: string,
  decision: ApprovalDecision,
  comment: string,
): Promise<void> {
  return guard('Submit approval decision', async () => {
    const headers = await fetchAll<Mserp_purchaserequisitionheaderv2entities>(
      'Find requisition to decide',
      (o) => Mserp_purchaserequisitionheaderv2entitiesService.getAll(o),
      {
        top: 1,
        select: ['mserp_purchaserequisitionheaderv2entityid', 'mserp_requisitionnumber'],
        filter: `mserp_requisitionnumber eq '${odataString(requisitionNumber)}'`,
      },
    );
    const header = headers[0];
    if (!header?.mserp_purchaserequisitionheaderv2entityid) {
      throw new AppError(`Requisition ${requisitionNumber} could not be found.`);
    }

    const statusCode =
      decision === 'Approve'
        ? STATUS_CODE.Approved
        : decision === 'Reject'
          ? STATUS_CODE.Rejected
          : STATUS_CODE.Draft; // Request-change sends it back to the requester.

    const result = await Mserp_purchaserequisitionheaderv2entitiesService.update(
      header.mserp_purchaserequisitionheaderv2entityid,
      {
        mserp_requisitionstatus: statusCode,
        // No dedicated approval-comment field on the virtual entity; the note is
        // stored as the on-hold explanation so it is not lost.
        mserp_onholdexplanation: comment || undefined,
      },
    );
    unwrap(result, 'Submit approval decision');
  });
}
