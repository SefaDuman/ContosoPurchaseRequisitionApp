import { useState } from 'react';
import { AsyncBoundary } from '../components/common';
import { formatMoney } from '../lib/format';
import { useAsync } from '../hooks/useAsync';
import type { ApprovalDecision, Requisition } from '../models';
import { decideApproval, getPendingApprovals, toMessage } from '../services';
import { RequisitionProgress } from './MyRequisitionsScreen';

export function ApprovalsScreen() {
  const state = useAsync(() => getPendingApprovals(), []);
  const [notice, setNotice] = useState<string>();

  return (
    <div className="page">
      <div className="page-head">
        <h1>Approvals</h1>
        <button className="btn ghost" type="button" onClick={state.reload}>Refresh</button>
      </div>
      <p className="muted">Requisitions pending your review.</p>

      {notice && <div className="inline-success" role="status">{notice}</div>}

      <AsyncBoundary
        loading={state.loading}
        error={state.error}
        data={state.data}
        isEmpty={(d) => d.length === 0}
        emptyTitle="Nothing to approve"
        emptyHint="There are no requisitions in review right now."
        onRetry={state.reload}
        loadingLabel="Loading approval queue…"
      >
        {(requisitions) => (
          <div className="req-list">
            {requisitions.map((r) => (
              <ApprovalItem
                key={r.requisitionNumber}
                requisition={r}
                onDecided={(msg) => {
                  setNotice(msg);
                  state.reload();
                }}
              />
            ))}
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}

function ApprovalItem({
  requisition,
  onDecided,
}: {
  requisition: Requisition;
  onDecided: (message: string) => void;
}) {
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState<ApprovalDecision | undefined>();
  const [error, setError] = useState<string>();

  const decide = async (decision: ApprovalDecision) => {
    if (decision !== 'Approve' && !comment.trim()) {
      setError('Please add a comment when rejecting or requesting changes.');
      return;
    }
    setError(undefined);
    setBusy(decision);
    try {
      await decideApproval(requisition.requisitionNumber, decision, comment.trim());
      const verb =
        decision === 'Approve' ? 'approved' : decision === 'Reject' ? 'rejected' : 'sent back for changes';
      onDecided(`Requisition ${requisition.requisitionNumber} ${verb}.`);
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusy(undefined);
    }
  };

  return (
    <article className="req-card expanded">
      <div className="req-head static">
        <div className="req-head-main">
          <span className="req-number">{requisition.requisitionNumber}</span>
          <span className="req-name">{requisition.name}</span>
        </div>
        <div className="req-head-side">
          <span className="req-total">{formatMoney(requisition.total)}</span>
        </div>
      </div>

      <div className="req-detail">
        <div className="req-meta">
          <div><span className="muted">Requester</span><strong>{requisition.preparerName ?? requisition.preparerPersonnelNumber ?? '—'}</strong></div>
          <div><span className="muted">Purpose</span><strong>{requisition.purpose}</strong></div>
          <div><span className="muted">Requested date</span><strong>{requisition.requestedDate?.slice(0, 10) ?? '—'}</strong></div>
        </div>
        {requisition.businessJustification && (
          <p className="req-justification"><span className="muted">Justification: </span>{requisition.businessJustification}</p>
        )}

        <RequisitionProgress status={requisition.status} />

        <table className="lines-table compact">
          <thead>
            <tr>
              <th>#</th><th>Description</th><th>Category</th>
              <th className="num">Qty</th><th className="num">Unit price</th><th className="num">Line total</th>
            </tr>
          </thead>
          <tbody>
            {requisition.lines.map((l) => (
              <tr key={l.lineNumber}>
                <td>{l.lineNumber}</td>
                <td>{l.description}</td>
                <td>{l.categoryName || '—'}</td>
                <td className="num">{l.quantity}</td>
                <td className="num">{formatMoney(l.unitPrice)}</td>
                <td className="num">{formatMoney(l.lineAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <label className="approval-comment">
          Comment
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a note (required to reject or request changes)…"
          />
        </label>

        {error && <div className="inline-error" role="alert">{error}</div>}

        <div className="approval-actions">
          <button className="btn success" type="button" disabled={!!busy} onClick={() => decide('Approve')}>
            {busy === 'Approve' ? 'Approving…' : 'Approve'}
          </button>
          <button className="btn danger" type="button" disabled={!!busy} onClick={() => decide('Reject')}>
            {busy === 'Reject' ? 'Rejecting…' : 'Reject'}
          </button>
          <button className="btn" type="button" disabled={!!busy} onClick={() => decide('RequestChange')}>
            {busy === 'RequestChange' ? 'Sending…' : 'Request change'}
          </button>
        </div>
      </div>
    </article>
  );
}
