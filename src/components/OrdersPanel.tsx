import { useMemo, useRef, useState } from 'react';
import { StatusBadge } from './common';
import { formatMoney } from '../lib/format';
import type {
  GoodsReceipt,
  GoodsReceiptKind,
  PurchaseOrder,
  PurchaseOrderStatus,
} from '../models';
import {
  PO_APPROVAL_LABEL,
  PO_STATUS_LABEL,
  PO_STATUS_TONE,
  confirmReceipt,
  downloadReceiptEvidence,
  uploadReceiptEvidence,
} from '../services';
import { useAppState } from '../state/AppState';

const RECEIPT_KIND_LABEL: Record<GoodsReceiptKind, string> = {
  FullReceipt: 'Full receipt',
  PartialReceipt: 'Partial receipt',
  MilestoneConfirmed: 'Milestone confirmed',
  Rejected: 'Rejected',
};

const RECEIPT_KIND_TONE: Record<GoodsReceiptKind, string> = {
  FullReceipt: 'success',
  PartialReceipt: 'info',
  MilestoneConfirmed: 'info',
  Rejected: 'danger',
};

const RECEIPT_KINDS: GoodsReceiptKind[] = [
  'FullReceipt',
  'PartialReceipt',
  'MilestoneConfirmed',
  'Rejected',
];

/** Ordered PO lifecycle stages used to render a simple progress indicator. */
const PO_STAGES: { key: PurchaseOrderStatus; label: string }[] = [
  { key: 'None', label: 'Ordered' },
  { key: 'OpenOrder', label: 'Partially received' },
  { key: 'Received', label: 'Received' },
  { key: 'Invoiced', label: 'Invoiced' },
];

function formatDateTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(d);
}

/** Save bytes to the user's device with the given file name. */
function saveBytes(bytes: Uint8Array, fileName: string): void {
  const blob = new Blob([bytes as BlobPart], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName || 'evidence';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function PurchaseOrderProgress({ order }: { order: PurchaseOrder }) {
  if (order.status === 'Canceled') {
    return <div className="progress rejected">Ordered → <strong>Canceled</strong></div>;
  }
  const activeIndex = PO_STAGES.findIndex((s) => s.key === order.status);
  // "None" (open order) sits at the first stage; Invoiced past the last.
  const reached = order.status === 'Invoiced' ? PO_STAGES.length - 1 : Math.max(activeIndex, 0);
  return (
    <ol className="progress">
      {PO_STAGES.map((stage, i) => (
        <li key={stage.key} className={i <= reached ? 'done' : ''}>
          <span className="dot" aria-hidden="true" />
          {stage.label}
        </li>
      ))}
    </ol>
  );
}

/** A single receipt confirmation row with evidence download. */
function ReceiptItem({ receipt }: { receipt: GoodsReceipt }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string>();

  const download = async () => {
    if (downloading) return;
    setDownloading(true);
    setError(undefined);
    try {
      const bytes = await downloadReceiptEvidence(receipt.id);
      saveBytes(bytes, receipt.evidenceName ?? 'evidence');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed.');
    } finally {
      setDownloading(false);
    }
  };

  const who = receipt.confirmedByName || receipt.confirmedByPersonnelNumber || 'Unknown';
  return (
    <li className="receipt-item">
      <div className="receipt-head">
        <StatusBadge label={RECEIPT_KIND_LABEL[receipt.kind]} tone={RECEIPT_KIND_TONE[receipt.kind]} />
        {receipt.purchaseOrderLine != null && (
          <span className="timeline-line">Line {receipt.purchaseOrderLine}</span>
        )}
        {receipt.receivedQuantity != null && (
          <span className="receipt-qty">Qty {receipt.receivedQuantity}</span>
        )}
        <span className="timeline-time">
          {formatDateTime(receipt.receivedDate || receipt.createdOn)}
        </span>
      </div>
      <div className="receipt-body">
        <span className="muted">Confirmed by </span>
        <strong>{who}</strong>
        {receipt.notes && <p className="timeline-text">{receipt.notes}</p>}
        {receipt.hasEvidence && (
          <button
            type="button"
            className="timeline-attachment"
            onClick={download}
            disabled={downloading}
            title={`Download ${receipt.evidenceName ?? 'evidence'}`}
          >
            📎 {downloading ? 'Downloading…' : receipt.evidenceName || 'Evidence'}
          </button>
        )}
        {error && <span className="composer-error">{error}</span>}
      </div>
    </li>
  );
}

/** Form to confirm receipt of a product/service on a purchase order. */
function ReceiptConfirmForm({
  order,
  onConfirmed,
}: {
  order: PurchaseOrder;
  onConfirmed: () => void;
}) {
  const { currentWorker, userFullName } = useAppState();
  const [kind, setKind] = useState<GoodsReceiptKind>('FullReceipt');
  const [line, setLine] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(undefined);
    try {
      const created = await confirmReceipt({
        purchaseOrderNumber: order.purchaseOrderNumber,
        purchaseOrderLine: line ? Number(line) : undefined,
        requisitionNumber: order.requisitionNumbers[0],
        company: order.company,
        vendorAccount: order.vendorAccount,
        receivedQuantity: quantity ? Number(quantity) : undefined,
        receivedDate: date ? new Date(date).toISOString() : undefined,
        kind,
        notes: notes.trim() || undefined,
        confirmedByPersonnelNumber: currentWorker?.personnelNumber,
        confirmedByName: currentWorker?.name || userFullName,
      });
      if (file) {
        await uploadReceiptEvidence(created.id, file);
      }
      setKind('FullReceipt');
      setLine('');
      setQuantity('');
      setNotes('');
      setFile(undefined);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onConfirmed();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm receipt.');
    } finally {
      setSubmitting(false);
    }
  };

  const lineOptions = order.lines.map((l) => l.lineNumber);

  return (
    <div className="composer">
      <div className="composer-controls">
        <label className="composer-field">
          <span>Type</span>
          <select value={kind} onChange={(e) => setKind(e.target.value as GoodsReceiptKind)}>
            {RECEIPT_KINDS.map((k) => (
              <option key={k} value={k}>
                {RECEIPT_KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </label>
        {lineOptions.length > 0 && (
          <label className="composer-field">
            <span>Line</span>
            <select value={line} onChange={(e) => setLine(e.target.value)}>
              <option value="">Whole order</option>
              {lineOptions.map((n) => (
                <option key={n} value={n}>
                  Line {n}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="composer-field">
          <span>Quantity</span>
          <input
            type="number"
            min="0"
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Optional"
          />
        </label>
        <label className="composer-field">
          <span>Received date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="composer-field composer-file">
          <span>Evidence</span>
          <input
            ref={fileInputRef}
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? undefined)}
          />
        </label>
      </div>
      <textarea
        className="composer-text"
        placeholder="Notes (delivery note reference, condition, milestone details…)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
      />
      <div className="composer-controls">
        <button className="btn primary composer-submit" type="button" onClick={submit} disabled={submitting}>
          {submitting ? 'Recording…' : '✅ Confirm receipt'}
        </button>
      </div>
      {error && <p className="composer-error">{error}</p>}
    </div>
  );
}

/** A purchase-order card: header, stages, lines, and receipt confirmation. */
export function PurchaseOrderCard({
  order,
  receipts,
  onReceiptChanged,
  defaultOpen = false,
}: {
  order: PurchaseOrder;
  receipts: GoodsReceipt[];
  onReceiptChanged: () => void;
  defaultOpen?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultOpen);
  const [confirming, setConfirming] = useState(false);

  return (
    <article className={`po-card${expanded ? ' expanded' : ''}`}>
      <button className="req-head" type="button" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
        <div className="req-head-main">
          <span className="req-number">{order.purchaseOrderNumber}</span>
          <span className="req-name">{order.vendorName || order.vendorAccount || 'Purchase order'}</span>
        </div>
        <div className="req-head-side">
          <StatusBadge label={PO_STATUS_LABEL[order.status]} tone={PO_STATUS_TONE[order.status]} />
          <span className="req-total">{formatMoney(order.total)}</span>
          <span className="chevron" aria-hidden="true">{expanded ? '▾' : '▸'}</span>
        </div>
      </button>

      {expanded && (
        <div className="req-detail">
          <div className="req-meta">
            <div><span className="muted">Vendor</span><strong>{order.vendorName || order.vendorAccount || '—'}</strong></div>
            <div><span className="muted">Approval</span><strong>{PO_APPROVAL_LABEL[order.approvalStatus]}</strong></div>
            <div><span className="muted">Confirmed delivery</span><strong>{order.confirmedDeliveryDate?.slice(0, 10) ?? '—'}</strong></div>
            {order.requisitionNumbers.length > 0 && (
              <div><span className="muted">From requisition</span><strong>{order.requisitionNumbers.join(', ')}</strong></div>
            )}
          </div>

          <PurchaseOrderProgress order={order} />

          <table className="lines-table compact">
            <thead>
              <tr>
                <th>#</th>
                <th>Description</th>
                <th>Category</th>
                <th className="num">Qty</th>
                <th className="num">Unit price</th>
                <th className="num">Line total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {order.lines.length === 0 ? (
                <tr><td colSpan={7} className="muted">No lines.</td></tr>
              ) : (
                order.lines.map((l) => (
                  <tr key={l.lineNumber}>
                    <td>{l.lineNumber}</td>
                    <td>{l.description}</td>
                    <td>{l.categoryName || '—'}</td>
                    <td className="num">{l.quantity}</td>
                    <td className="num">{formatMoney(l.unitPrice)}</td>
                    <td className="num">{formatMoney(l.lineAmount)}</td>
                    <td>{PO_STATUS_LABEL[l.status]}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="receipts">
            <div className="receipts-head">
              <h3 className="collab-title">Receipts</h3>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setConfirming((v) => !v)}
              >
                {confirming ? 'Close' : '✅ Confirm receipt'}
              </button>
            </div>
            {confirming && (
              <ReceiptConfirmForm
                order={order}
                onConfirmed={() => {
                  setConfirming(false);
                  onReceiptChanged();
                }}
              />
            )}
            {receipts.length === 0 ? (
              <p className="muted">No receipts recorded yet.</p>
            ) : (
              <ul className="receipt-list">
                {receipts.map((r) => (
                  <ReceiptItem key={r.id} receipt={r} />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

/** A list of purchase orders with their receipts, grouped by receipt map. */
export function PurchaseOrderList({
  orders,
  receiptsByOrder,
  onReceiptChanged,
}: {
  orders: PurchaseOrder[];
  receiptsByOrder: Map<string, GoodsReceipt[]>;
  onReceiptChanged: () => void;
}) {
  const sorted = useMemo(
    () => [...orders].sort((a, b) => b.purchaseOrderNumber.localeCompare(a.purchaseOrderNumber)),
    [orders],
  );
  return (
    <div className="po-list">
      {sorted.map((order, i) => (
        <PurchaseOrderCard
          key={order.purchaseOrderNumber}
          order={order}
          receipts={receiptsByOrder.get(order.purchaseOrderNumber) ?? []}
          onReceiptChanged={onReceiptChanged}
          defaultOpen={i === 0}
        />
      ))}
    </div>
  );
}
