/**
 * Purchase-order service — read-only tracking of the purchase orders generated
 * from a requisition. Wraps the F&O virtual entities for PO headers and lines
 * and maps them to clean app models.
 *
 * The link from a PO back to its requisition is the line field
 * `mserp_purchaserequisitionid` (the F&O `PurchaseRequisitionId`). Receipt
 * confirmations are handled separately by `receiptService` (custom table).
 */

import {
  Mserp_purchpurchaseorderheaderv2entitiesService,
  Mserp_purchpurchaseorderlinev2entitiesService,
} from '../generated';
import {
  Mserp_purchpurchaseorderheaderv2entitiesmserp_documentapprovalstatus,
  Mserp_purchpurchaseorderheaderv2entitiesmserp_purchaseorderstatus,
  type Mserp_purchpurchaseorderheaderv2entities,
} from '../generated/models/Mserp_purchpurchaseorderheaderv2entitiesModel';
import {
  Mserp_purchpurchaseorderlinev2entitiesmserp_purchaseorderlinestatus,
  type Mserp_purchpurchaseorderlinev2entities,
} from '../generated/models/Mserp_purchpurchaseorderlinev2entitiesModel';
import type {
  PurchaseOrder,
  PurchaseOrderApprovalStatus,
  PurchaseOrderLine,
  PurchaseOrderStatus,
} from '../models';
import { odataString } from './config';
import { guard } from './errors';
import { fetchAll } from './paging';
import { getMyRequisitions } from './requisitionService';

/**
 * Big `or` filters on these F&O-backed virtual entities can silently truncate
 * (see repo memory). Keep each `or` batch small and merge client-side.
 */
const FILTER_CHUNK_SIZE = 10;

const HEADER_SELECT = [
  'mserp_purchpurchaseorderheaderv2entityid',
  'mserp_purchaseordernumber',
  'mserp_dataareaid',
  'mserp_ordervendoraccountnumber',
  'mserp_purchaseordername',
  'mserp_currencycode',
  'mserp_purchaseorderstatus',
  'mserp_documentapprovalstatus',
  'mserp_requesteddeliverydate',
  'mserp_confirmeddeliverydate',
  'mserp_requesterpersonnelnumber',
];

const LINE_SELECT = [
  'mserp_purchaseordernumber',
  'mserp_linenumber',
  'mserp_itemnumber',
  'mserp_linedescription',
  'mserp_procurementproductcategoryname',
  'mserp_orderedpurchasequantity',
  'mserp_purchaseprice',
  'mserp_purchaseunitsymbol',
  'mserp_lineamount',
  'mserp_purchaseorderlinestatus',
  'mserp_confirmeddeliverydate',
  'mserp_purchaserequisitionid',
  'mserp_dataareaid',
];

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Map the remapped PurchStatus option-set label to an app PO status. */
function mapPoStatus(label?: string): PurchaseOrderStatus {
  switch (label) {
    case 'None':
      return 'None';
    case 'Openorder':
      return 'OpenOrder';
    case 'Received':
      return 'Received';
    case 'Invoiced':
      return 'Invoiced';
    case 'Canceled':
      return 'Canceled';
    default:
      return 'Unknown';
  }
}

/** Map the remapped DocumentApprovalStatus option-set label to an app status. */
function mapPoApproval(label?: string): PurchaseOrderApprovalStatus {
  switch (label) {
    case 'Draft':
      return 'Draft';
    case 'Inreview':
      return 'InReview';
    case 'Rejected':
      return 'Rejected';
    case 'Approved':
      return 'Approved';
    case 'Inexternalreview':
      return 'InExternalReview';
    case 'Confirmed':
      return 'Confirmed';
    case 'Finalized':
      return 'Finalized';
    default:
      return 'Unknown';
  }
}

function mapLine(l: Mserp_purchpurchaseorderlinev2entities): PurchaseOrderLine {
  const quantity = l.mserp_orderedpurchasequantity ?? 0;
  const unitPrice = l.mserp_purchaseprice ?? 0;
  const statusLabel =
    l.mserp_purchaseorderlinestatus != null
      ? Mserp_purchpurchaseorderlinev2entitiesmserp_purchaseorderlinestatus[l.mserp_purchaseorderlinestatus]
      : undefined;
  return {
    purchaseOrderNumber: l.mserp_purchaseordernumber,
    lineNumber: l.mserp_linenumber,
    itemNumber: l.mserp_itemnumber ?? undefined,
    description: l.mserp_linedescription || l.mserp_itemnumber || '',
    categoryName: l.mserp_procurementproductcategoryname ?? undefined,
    quantity,
    unitPrice,
    unit: l.mserp_purchaseunitsymbol ?? undefined,
    lineAmount: l.mserp_lineamount ?? quantity * unitPrice,
    status: mapPoStatus(statusLabel),
    confirmedDeliveryDate: l.mserp_confirmeddeliverydate ?? undefined,
    requisitionNumber: l.mserp_purchaserequisitionid ?? undefined,
  };
}

function mapHeader(
  h: Mserp_purchpurchaseorderheaderv2entities,
  lines: PurchaseOrderLine[],
): PurchaseOrder {
  const statusLabel =
    h.mserp_purchaseorderstatus != null
      ? Mserp_purchpurchaseorderheaderv2entitiesmserp_purchaseorderstatus[h.mserp_purchaseorderstatus]
      : undefined;
  const approvalLabel =
    h.mserp_documentapprovalstatus != null
      ? Mserp_purchpurchaseorderheaderv2entitiesmserp_documentapprovalstatus[h.mserp_documentapprovalstatus]
      : undefined;
  const requisitionNumbers = Array.from(
    new Set(lines.map((l) => l.requisitionNumber).filter((n): n is string => !!n)),
  );
  return {
    purchaseOrderNumber: h.mserp_purchaseordernumber ?? '',
    company: h.mserp_dataareaid ?? '',
    vendorAccount: h.mserp_ordervendoraccountnumber ?? undefined,
    vendorName: h.mserp_purchaseordername ?? undefined,
    currencyCode: h.mserp_currencycode ?? undefined,
    status: mapPoStatus(statusLabel),
    approvalStatus: mapPoApproval(approvalLabel),
    requestedDeliveryDate: h.mserp_requesteddeliverydate ?? undefined,
    confirmedDeliveryDate: h.mserp_confirmeddeliverydate ?? undefined,
    requesterPersonnelNumber: h.mserp_requesterpersonnelnumber ?? undefined,
    requisitionNumbers,
    total: lines.reduce((sum, l) => sum + l.lineAmount, 0),
    lines,
  };
}

/** Load PO lines matching an `or` filter built from the given values (chunked). */
async function loadLinesByFilter(
  context: string,
  values: string[],
  clause: (v: string) => string,
): Promise<Mserp_purchpurchaseorderlinev2entities[]> {
  const distinct = Array.from(new Set(values.filter(Boolean)));
  if (distinct.length === 0) return [];
  const all: Mserp_purchpurchaseorderlinev2entities[] = [];
  for (const batch of chunk(distinct, FILTER_CHUNK_SIZE)) {
    const filter = batch.map(clause).join(' or ');
    const rows = await fetchAll<Mserp_purchpurchaseorderlinev2entities>(
      context,
      (o) => Mserp_purchpurchaseorderlinev2entitiesService.getAll(o),
      { select: LINE_SELECT, filter, orderBy: ['mserp_purchaseordernumber', 'mserp_linenumber'] },
    );
    all.push(...rows);
  }
  return all;
}

/** Load PO headers for the given PO numbers (chunked `or` filter). */
async function loadHeaders(
  purchaseOrderNumbers: string[],
): Promise<Map<string, Mserp_purchpurchaseorderheaderv2entities>> {
  const byNumber = new Map<string, Mserp_purchpurchaseorderheaderv2entities>();
  const distinct = Array.from(new Set(purchaseOrderNumbers.filter(Boolean)));
  for (const batch of chunk(distinct, FILTER_CHUNK_SIZE)) {
    const filter = batch.map((n) => `mserp_purchaseordernumber eq '${odataString(n)}'`).join(' or ');
    const rows = await fetchAll<Mserp_purchpurchaseorderheaderv2entities>(
      'Load purchase orders',
      (o) => Mserp_purchpurchaseorderheaderv2entitiesService.getAll(o),
      { select: HEADER_SELECT, filter },
    );
    for (const h of rows) {
      if (h.mserp_purchaseordernumber) byNumber.set(h.mserp_purchaseordernumber, h);
    }
  }
  return byNumber;
}

/** Assemble full PurchaseOrder objects from a set of PO lines. */
async function assembleOrders(
  lines: Mserp_purchpurchaseorderlinev2entities[],
): Promise<PurchaseOrder[]> {
  const linesByOrder = new Map<string, PurchaseOrderLine[]>();
  for (const line of lines.map(mapLine)) {
    const list = linesByOrder.get(line.purchaseOrderNumber) ?? [];
    list.push(line);
    linesByOrder.set(line.purchaseOrderNumber, list);
  }
  const headers = await loadHeaders(Array.from(linesByOrder.keys()));

  const orders: PurchaseOrder[] = [];
  for (const [poNumber, poLines] of linesByOrder) {
    const header = headers.get(poNumber);
    if (header) {
      orders.push(mapHeader(header, poLines));
    } else {
      // Header not returned (e.g. company scope) — still show what we know.
      orders.push({
        purchaseOrderNumber: poNumber,
        company: '',
        status: 'Unknown',
        approvalStatus: 'Unknown',
        requisitionNumbers: Array.from(
          new Set(poLines.map((l) => l.requisitionNumber).filter((n): n is string => !!n)),
        ),
        total: poLines.reduce((sum, l) => sum + l.lineAmount, 0),
        lines: poLines,
      });
    }
  }
  return orders;
}

/** Purchase orders generated from a single requisition. */
export async function getPurchaseOrdersForRequisition(
  requisitionNumber: string,
): Promise<PurchaseOrder[]> {
  return guard('Load purchase orders', async () => {
    if (!requisitionNumber) return [];
    const lines = await loadLinesByFilter(
      'Load purchase orders',
      [requisitionNumber],
      (v) => `mserp_purchaserequisitionid eq '${odataString(v)}'`,
    );
    return assembleOrders(lines);
  });
}

/** All purchase orders generated from the signed-in user's requisitions. */
export async function getMyPurchaseOrders(personnelNumber: string): Promise<PurchaseOrder[]> {
  return guard('Load my purchase orders', async () => {
    const requisitions = await getMyRequisitions(personnelNumber);
    const numbers = requisitions.map((r) => r.requisitionNumber).filter(Boolean);
    if (numbers.length === 0) return [];
    const lines = await loadLinesByFilter(
      'Load my purchase orders',
      numbers,
      (v) => `mserp_purchaserequisitionid eq '${odataString(v)}'`,
    );
    return assembleOrders(lines);
  });
}
