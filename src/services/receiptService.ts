/**
 * Receipt service — goods/service receipt confirmations on a purchase order.
 * Backed by the custom Dataverse table `sd_goodsreceipt` (keyed to F&O by a
 * plain purchase-order number), since F&O virtual entities cannot host
 * Dataverse files/notes. Mirrors the collaboration (comment) service.
 *
 * The requester confirms from the app that a delivery or service milestone was
 * received; the confirmation and its evidence file are recorded here so they
 * travel with the purchase order for audit.
 */

import { Sd_goodsreceiptsService } from '../generated';
import {
  Sd_goodsreceiptssd_kind,
  type Sd_goodsreceipts,
  type Sd_goodsreceiptsBase,
} from '../generated/models/Sd_goodsreceiptsModel';
import type { ConfirmReceiptInput, GoodsReceipt, GoodsReceiptKind } from '../models';
import { odataString } from './config';
import { guard, unwrap } from './errors';
import { fetchAll } from './paging';
import { getClient } from '@microsoft/power-apps/data';
import { dataSourcesInfo } from '../../.power/schemas/appschemas/dataSourcesInfo';

/** Dataverse data source name for the goods-receipt table. */
const DATA_SOURCE = 'sd_goodsreceipts';

/** Direct client for file operations the generated service doesn't expose. */
const client = getClient(dataSourcesInfo);

const RECEIPT_SELECT = [
  'sd_goodsreceiptid',
  'sd_purchaseordernumber',
  'sd_purchaseorderline',
  'sd_requisitionnumber',
  'sd_company',
  'sd_vendoraccount',
  'sd_receivedquantity',
  'sd_receiveddate',
  'sd_kind',
  'sd_notes',
  'sd_confirmedbypersonnelnumber',
  'sd_confirmedbyname',
  'sd_attachment_name',
  'createdon',
];

/** sd_kind choice values (must match the option set created in Dataverse). */
const KIND_CODE: Record<GoodsReceiptKind, number> = {
  FullReceipt: 100000000,
  PartialReceipt: 100000001,
  MilestoneConfirmed: 100000002,
  Rejected: 100000003,
};

function mapReceipt(r: Sd_goodsreceipts): GoodsReceipt {
  const kind = (r.sd_kind != null
    ? Sd_goodsreceiptssd_kind[r.sd_kind]
    : 'FullReceipt') as GoodsReceiptKind;
  return {
    id: r.sd_goodsreceiptid,
    purchaseOrderNumber: r.sd_purchaseordernumber,
    purchaseOrderLine: r.sd_purchaseorderline ?? undefined,
    requisitionNumber: r.sd_requisitionnumber ?? undefined,
    company: r.sd_company ?? undefined,
    vendorAccount: r.sd_vendoraccount ?? undefined,
    receivedQuantity: r.sd_receivedquantity ?? undefined,
    receivedDate: r.sd_receiveddate ?? undefined,
    kind,
    notes: r.sd_notes ?? undefined,
    confirmedByPersonnelNumber: r.sd_confirmedbypersonnelnumber ?? undefined,
    confirmedByName: r.sd_confirmedbyname ?? undefined,
    createdOn: r.createdon ?? undefined,
    evidenceName: r.sd_attachment_name ?? undefined,
    hasEvidence: !!r.sd_attachment_name,
  };
}

/** Load every receipt confirmation for a purchase order, newest first. */
export async function getReceiptsForOrder(purchaseOrderNumber: string): Promise<GoodsReceipt[]> {
  return guard('Load receipts', async () => {
    if (!purchaseOrderNumber) return [];
    const rows = await fetchAll<Sd_goodsreceipts>(
      'Load receipts',
      (o) => Sd_goodsreceiptsService.getAll(o),
      {
        select: RECEIPT_SELECT,
        filter: `sd_purchaseordernumber eq '${odataString(purchaseOrderNumber)}' and statecode eq 0`,
        orderBy: ['createdon desc'],
      },
    );
    return rows.map(mapReceipt);
  });
}

/**
 * Load receipt confirmations for a set of purchase orders in one query. Returns
 * a map keyed by purchase-order number. Used to badge connected POs on a
 * requisition without a request per order.
 */
export async function getReceiptsForOrders(
  purchaseOrderNumbers: string[],
): Promise<Map<string, GoodsReceipt[]>> {
  return guard('Load receipts', async () => {
    const byOrder = new Map<string, GoodsReceipt[]>();
    const distinct = Array.from(new Set(purchaseOrderNumbers.filter(Boolean)));
    if (distinct.length === 0) return byOrder;

    const filter =
      '(' +
      distinct.map((n) => `sd_purchaseordernumber eq '${odataString(n)}'`).join(' or ') +
      ') and statecode eq 0';
    const rows = await fetchAll<Sd_goodsreceipts>(
      'Load receipts',
      (o) => Sd_goodsreceiptsService.getAll(o),
      { select: RECEIPT_SELECT, filter, orderBy: ['createdon desc'] },
    );
    for (const receipt of rows.map(mapReceipt)) {
      const list = byOrder.get(receipt.purchaseOrderNumber) ?? [];
      list.push(receipt);
      byOrder.set(receipt.purchaseOrderNumber, list);
    }
    return byOrder;
  });
}

/** Record a receipt confirmation and return the created record. */
export async function confirmReceipt(input: ConfirmReceiptInput): Promise<GoodsReceipt> {
  return guard('Confirm receipt', async () => {
    const kind = input.kind ?? 'FullReceipt';
    const receivedDate = input.receivedDate ?? new Date().toISOString();
    // owner/statecode are set server-side; the generated type marks them
    // required, so we build the payload and cast.
    const record = {
      sd_name: `${input.purchaseOrderNumber} · ${kind}`,
      sd_purchaseordernumber: input.purchaseOrderNumber,
      sd_kind: KIND_CODE[kind],
      sd_receiveddate: receivedDate,
      ...(input.purchaseOrderLine != null ? { sd_purchaseorderline: input.purchaseOrderLine } : {}),
      ...(input.requisitionNumber ? { sd_requisitionnumber: input.requisitionNumber } : {}),
      ...(input.company ? { sd_company: input.company } : {}),
      ...(input.vendorAccount ? { sd_vendoraccount: input.vendorAccount } : {}),
      ...(input.receivedQuantity != null ? { sd_receivedquantity: input.receivedQuantity } : {}),
      ...(input.notes ? { sd_notes: input.notes } : {}),
      ...(input.confirmedByPersonnelNumber
        ? { sd_confirmedbypersonnelnumber: input.confirmedByPersonnelNumber }
        : {}),
      ...(input.confirmedByName ? { sd_confirmedbyname: input.confirmedByName } : {}),
    } as Omit<Sd_goodsreceiptsBase, 'sd_goodsreceiptid'>;

    const created = unwrap(await Sd_goodsreceiptsService.create(record), 'Confirm receipt');
    return mapReceipt(created);
  });
}

/** Attach receipt evidence to an existing confirmation (sd_attachment column). */
export async function uploadReceiptEvidence(receiptId: string, file: File): Promise<void> {
  return guard('Upload evidence', async () => {
    unwrap(
      await Sd_goodsreceiptsService.upload(receiptId, 'sd_attachment', file, file.name),
      'Upload evidence',
    );
  });
}

/** Download a receipt's evidence file (sd_attachment column) as bytes. */
export async function downloadReceiptEvidence(receiptId: string): Promise<Uint8Array> {
  return guard('Download evidence', async () => {
    return unwrap(
      await client.downloadFileFromRecord(DATA_SOURCE, receiptId, 'sd_attachment'),
      'Download evidence',
    );
  });
}
