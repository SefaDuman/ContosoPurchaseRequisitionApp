import { useState } from 'react';
import { AsyncBoundary, StatusBadge } from '../components/common';
import { formatMoney } from '../lib/format';
import { useAsync } from '../hooks/useAsync';
import type { Requisition, RequisitionStatus } from '../models';
import { getMyRequisitions, STATUS_LABEL } from '../services';
import { useAppState } from '../state/AppState';
import { RequisitionDetailScreen } from './RequisitionDetailScreen';

const STATUS_TONE: Record<RequisitionStatus, string> = {
  Draft: 'neutral',
  InReview: 'info',
  Approved: 'success',
  Rejected: 'danger',
  Cancelled: 'neutral',
  Closed: 'neutral',
  BudgetReserved: 'info',
  Unknown: 'neutral',
};

/** Ordered stages used to render a simple approval-progress indicator. */
const PROGRESS: { key: RequisitionStatus; label: string }[] = [
  { key: 'Draft', label: 'Draft' },
  { key: 'InReview', label: 'In review' },
  { key: 'Approved', label: 'Approved' },
];

export function RequisitionProgress({ status }: { status: RequisitionStatus }) {
  if (status === 'Rejected') {
    return <div className="progress rejected">Draft → In review → <strong>Rejected</strong></div>;
  }
  const activeIndex = PROGRESS.findIndex((p) => p.key === status);
  return (
    <ol className="progress">
      {PROGRESS.map((stage, i) => (
        <li key={stage.key} className={i <= activeIndex ? 'done' : ''}>
          <span className="dot" aria-hidden="true" />
          {stage.label}
        </li>
      ))}
    </ol>
  );
}

export function RequisitionCard({
  requisition,
  expanded,
  onToggle,
  onOpen,
}: {
  requisition: Requisition;
  expanded: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  return (
    <article className={`req-card${expanded ? ' expanded' : ''}`}>
      <button className="req-head" type="button" onClick={onToggle} aria-expanded={expanded}>
        <div className="req-head-main">
          <span className="req-number">{requisition.requisitionNumber || '(pending number)'}</span>
          <span className="req-name">{requisition.name}</span>
        </div>
        <div className="req-head-side">
          <StatusBadge label={STATUS_LABEL[requisition.status]} tone={STATUS_TONE[requisition.status]} />
          <span className="req-total">{formatMoney(requisition.total)}</span>
          <span className="chevron" aria-hidden="true">{expanded ? '▾' : '▸'}</span>
        </div>
      </button>

      {expanded && (
        <div className="req-detail">
          <div className="req-meta">
            <div><span className="muted">Requester</span><strong>{requisition.preparerName ?? requisition.preparerPersonnelNumber ?? '—'}</strong></div>
            <div><span className="muted">Purpose</span><strong>{requisition.purpose}</strong></div>
            <div><span className="muted">Requested date</span><strong>{requisition.requestedDate?.slice(0, 10) ?? '—'}</strong></div>
          </div>
          {requisition.businessJustification && (
            <p className="req-justification"><span className="muted">Justification: </span>{requisition.businessJustification}</p>
          )}

          <div className="req-actions">
            <button className="btn ghost" type="button" onClick={onOpen}>
              💬 Open collaboration
            </button>
          </div>

          <RequisitionProgress status={requisition.status} />

          <table className="lines-table compact">
            <thead>
              <tr>
                <th>#</th>
                <th>Description</th>
                <th>Category</th>
                <th className="num">Qty</th>
                <th className="num">Unit price</th>
                <th className="num">Line total</th>
              </tr>
            </thead>
            <tbody>
              {requisition.lines.length === 0 ? (
                <tr><td colSpan={6} className="muted">No lines.</td></tr>
              ) : (
                requisition.lines.map((l) => (
                  <tr key={l.lineNumber}>
                    <td>{l.lineNumber}</td>
                    <td>{l.description}</td>
                    <td>{l.categoryName || '—'}</td>
                    <td className="num">{l.quantity}</td>
                    <td className="num">{formatMoney(l.unitPrice)}</td>
                    <td className="num">{formatMoney(l.lineAmount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}

export function MyRequisitionsScreen() {
  const { requesterPersonnelNumber, currentWorker, resolvingUser } = useAppState();
  const state = useAsync(() => getMyRequisitions(requesterPersonnelNumber), [requesterPersonnelNumber]);
  const [expanded, setExpanded] = useState<string>();
  const [detail, setDetail] = useState<Requisition>();

  const who = currentWorker
    ? `${currentWorker.name} (${currentWorker.personnelNumber})`
    : requesterPersonnelNumber;

  if (detail) {
    return <RequisitionDetailScreen requisition={detail} onBack={() => setDetail(undefined)} />;
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1>My requisitions</h1>
        <button className="btn ghost" type="button" onClick={state.reload}>Refresh</button>
      </div>
      {resolvingUser ? (
        <p className="muted">Identifying your worker record…</p>
      ) : (
        <p className="muted">
          Requisitions prepared by {who}
          {currentWorker?.email ? ` · ${currentWorker.email}` : ''}
          {!currentWorker ? ' (default requester — signed-in user not matched to a worker)' : ''}.
        </p>
      )}

      <AsyncBoundary
        loading={state.loading}
        error={state.error}
        data={state.data}
        isEmpty={(d) => d.length === 0}
        emptyTitle="No requisitions yet"
        emptyHint="Submit a requisition from the cart to see it here."
        onRetry={state.reload}
        loadingLabel="Loading your requisitions…"
      >
        {(requisitions) => (
          <div className="req-list">
            {requisitions.map((r) => (
              <RequisitionCard
                key={r.requisitionNumber}
                requisition={r}
                expanded={expanded === r.requisitionNumber}
                onToggle={() =>
                  setExpanded((cur) => (cur === r.requisitionNumber ? undefined : r.requisitionNumber))
                }
                onOpen={() => setDetail(r)}
              />
            ))}
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
