import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AsyncBoundary, StatusBadge } from '../components/common';
import { PurchaseOrderList } from '../components/OrdersPanel';
import { formatMoney } from '../lib/format';
import {
  extractMentions,
  getActiveMention,
  insertMention,
  renderWithMentions,
  type ActiveMention,
} from '../lib/mentions';
import { useAsync } from '../hooks/useAsync';
import type {
  GoodsReceipt,
  MentionUser,
  PurchaseOrder,
  Requisition,
  RequisitionComment,
  RequisitionCommentKind,
  RequisitionStatus,
} from '../models';
import {
  addComment,
  downloadCommentAttachment,
  getComments,
  getPurchaseOrdersForRequisition,
  getReceiptsForOrders,
  openRequisitionTeamsChat,
  searchDirectoryUsers,
  sendMentionNotifications,
  STATUS_LABEL,
  uploadCommentAttachment,
} from '../services';
import { useAppState } from '../state/AppState';
import { useAssistant } from '../state/AssistantContext';

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

const KIND_LABEL: Record<RequisitionCommentKind, string> = {
  Comment: 'Comment',
  Clarification: 'Clarification',
  BudgetNote: 'Budget note',
  System: 'System',
};

const KIND_TONE: Record<RequisitionCommentKind, string> = {
  Comment: 'neutral',
  Clarification: 'info',
  BudgetNote: 'success',
  System: 'neutral',
};

const COMPOSER_KINDS: RequisitionCommentKind[] = ['Comment', 'Clarification', 'BudgetNote'];

function formatDateTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
}

function initialsOf(name?: string): string {
  return (
    (name ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || '?'
  );
}

/** Save bytes to the user's device with the given file name. */
function saveBytes(bytes: Uint8Array, fileName: string): void {
  const blob = new Blob([bytes as BlobPart], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName || 'attachment';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** A single comment bubble in the activity timeline. */
function CommentItem({
  comment,
  isReply,
  onReply,
  children,
}: {
  comment: RequisitionComment;
  isReply: boolean;
  onReply: (comment: RequisitionComment) => void;
  children?: ReactNode;
}) {
  const author = comment.authorName || comment.authorPersonnelNumber || 'Unknown';
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string>();

  const download = async () => {
    if (downloading) return;
    setDownloading(true);
    setDownloadError(undefined);
    try {
      const bytes = await downloadCommentAttachment(comment.id);
      saveBytes(bytes, comment.attachmentName ?? 'attachment');
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Download failed.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <li className={`timeline-item${isReply ? ' reply' : ''}`}>
      <span className="timeline-avatar" aria-hidden="true">
        {initialsOf(comment.authorName || comment.authorPersonnelNumber)}
      </span>
      <div className="timeline-body">
        <div className="timeline-head">
          <strong className="timeline-author">{author}</strong>
          <StatusBadge label={KIND_LABEL[comment.kind]} tone={KIND_TONE[comment.kind]} />
          {comment.lineNumber != null && (
            <span className="timeline-line">Line {comment.lineNumber}</span>
          )}
          <span className="timeline-time">{formatDateTime(comment.createdOn)}</span>
        </div>
        <p className="timeline-text">{renderWithMentions(comment.body)}</p>
        {comment.hasAttachment && (
          <button
            type="button"
            className="timeline-attachment"
            onClick={download}
            disabled={downloading}
            title={`Download ${comment.attachmentName ?? 'attachment'}`}
          >
            📎 {downloading ? 'Downloading…' : comment.attachmentName}
          </button>
        )}
        {downloadError && <span className="composer-error">{downloadError}</span>}
        <div className="timeline-actions">
          <button type="button" className="link-btn" onClick={() => onReply(comment)}>
            Reply
          </button>
        </div>
        {children && <ul className="timeline nested">{children}</ul>}
      </div>
    </li>
  );
}

/** Threaded activity timeline: top-level comments with one level of replies. */
function CommentThread({
  comments,
  onReply,
}: {
  comments: RequisitionComment[];
  onReply: (comment: RequisitionComment) => void;
}) {
  const { roots, repliesByParent } = useMemo(() => {
    const repliesByParent = new Map<string, RequisitionComment[]>();
    const roots: RequisitionComment[] = [];
    for (const c of comments) {
      if (c.parentCommentId) {
        const list = repliesByParent.get(c.parentCommentId) ?? [];
        list.push(c);
        repliesByParent.set(c.parentCommentId, list);
      } else {
        roots.push(c);
      }
    }
    return { roots, repliesByParent };
  }, [comments]);

  return (
    <ul className="timeline">
      {roots.map((root) => (
        <CommentItem key={root.id} comment={root} isReply={false} onReply={onReply}>
          {(repliesByParent.get(root.id) ?? []).map((reply) => (
            <CommentItem key={reply.id} comment={reply} isReply onReply={onReply} />
          ))}
        </CommentItem>
      ))}
    </ul>
  );
}

/** Composer for a new comment, with kind, optional line, and attachment. */
function CommentComposer({
  requisition,
  replyTo,
  onCancelReply,
  onPosted,
}: {
  requisition: Requisition;
  replyTo?: RequisitionComment;
  onCancelReply: () => void;
  onPosted: () => void;
}) {
  const { currentWorker, userFullName } = useAppState();
  const [body, setBody] = useState('');
  const [kind, setKind] = useState<RequisitionCommentKind>('Comment');
  const [lineNumber, setLineNumber] = useState<string>('');
  const [file, setFile] = useState<File>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // @mention autocomplete state.
  const [mention, setMention] = useState<ActiveMention | null>(null);
  const [candidates, setCandidates] = useState<MentionUser[]>([]);
  const [mentionLoading, setMentionLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const menuOpen = !!mention && mention.query.length >= 1 && (mentionLoading || candidates.length > 0);

  // Debounced directory search whenever the active @query changes. All state
  // updates happen inside the async callback to avoid cascading renders.
  useEffect(() => {
    const query = mention?.query ?? '';
    if (query.length < 1) return;
    let cancelled = false;
    const handle = setTimeout(async () => {
      setMentionLoading(true);
      const users = await searchDirectoryUsers(query);
      if (cancelled) return;
      setCandidates(users);
      setActiveIndex(0);
      setMentionLoading(false);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [mention?.query]);

  const applyMention = (user: MentionUser) => {
    if (!mention) return;
    const caret = textareaRef.current?.selectionStart ?? body.length;
    const { text, caret: nextCaret } = insertMention(body, mention, caret, user);
    setBody(text);
    setMention(null);
    setCandidates([]);
    requestAnimationFrame(() => {
      const node = textareaRef.current;
      if (node) {
        node.focus();
        node.setSelectionRange(nextCaret, nextCaret);
      }
    });
  };

  const authorName = currentWorker?.name || userFullName;
  const authorPersonnelNumber = currentWorker?.personnelNumber;

  const submit = async () => {
    const text = body.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    setError(undefined);
    try {
      const created = await addComment({
        requisitionNumber: requisition.requisitionNumber,
        body: text,
        kind,
        parentCommentId: replyTo?.id,
        lineNumber: lineNumber ? Number(lineNumber) : undefined,
        authorPersonnelNumber,
        authorName,
      });
      if (file) {
        await uploadCommentAttachment(created.id, file);
      }
      // Fire-and-forget: notify any @mentioned people. Never blocks posting.
      const mentions = extractMentions(text);
      if (mentions.length) {
        void sendMentionNotifications({
          requisitionNumber: requisition.requisitionNumber,
          requisitionName: requisition.name,
          authorName: authorName || 'Someone',
          commentBody: text,
          mentions,
        });
      }
      setBody('');
      setKind('Comment');
      setLineNumber('');
      setFile(undefined);
      setMention(null);
      setCandidates([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onCancelReply();
      onPosted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post comment.');
    } finally {
      setSubmitting(false);
    }
  };

  const lineOptions = requisition.lines.map((l) => l.lineNumber);

  return (
    <div className="composer">
      {replyTo && (
        <div className="composer-reply-to">
          Replying to <strong>{replyTo.authorName || replyTo.authorPersonnelNumber || 'comment'}</strong>
          <button type="button" className="link-btn" onClick={onCancelReply}>
            Cancel
          </button>
        </div>
      )}
      <div className="composer-mention-wrap">
        <textarea
          ref={textareaRef}
          className="composer-text"
          placeholder="Add a comment, clarification, or budget note… Type @ to mention someone."
          value={body}
          onChange={(e) => {
            const value = e.target.value;
            setBody(value);
            const caret = e.target.selectionStart ?? value.length;
            setMention(getActiveMention(value, caret));
          }}
          onKeyDown={(e) => {
            if (!menuOpen) return;
            if (e.key === 'Escape') {
              e.preventDefault();
              setMention(null);
              return;
            }
            if (!candidates.length) return;
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActiveIndex((i) => (i + 1) % candidates.length);
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActiveIndex((i) => (i - 1 + candidates.length) % candidates.length);
            } else if (e.key === 'Enter' || e.key === 'Tab') {
              e.preventDefault();
              applyMention(candidates[activeIndex] ?? candidates[0]);
            }
          }}
          onBlur={() => window.setTimeout(() => setMention(null), 120)}
          rows={3}
        />
        {menuOpen && (
          <ul className="mention-menu" role="listbox">
            {mentionLoading && candidates.length === 0 ? (
              <li className="mention-empty">Searching…</li>
            ) : (
              candidates.map((user, i) => (
                <li key={user.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === activeIndex}
                    className={`mention-option${i === activeIndex ? ' active' : ''}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => applyMention(user)}
                  >
                    <span className="mention-avatar" aria-hidden="true">
                      {initialsOf(user.displayName)}
                    </span>
                    <span className="mention-info">
                      <span className="mention-name">{user.displayName}</span>
                      <span className="mention-sub">{user.jobTitle || user.email || user.id}</span>
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
      <div className="composer-controls">
        <label className="composer-field">
          <span>Type</span>
          <select value={kind} onChange={(e) => setKind(e.target.value as RequisitionCommentKind)}>
            {COMPOSER_KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </label>
        {lineOptions.length > 0 && (
          <label className="composer-field">
            <span>Line</span>
            <select value={lineNumber} onChange={(e) => setLineNumber(e.target.value)}>
              <option value="">General</option>
              {lineOptions.map((n) => (
                <option key={n} value={n}>
                  Line {n}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="composer-field composer-file">
          <span>Attachment</span>
          <input
            ref={fileInputRef}
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? undefined)}
          />
        </label>
        <button className="btn primary composer-submit" type="button" onClick={submit} disabled={submitting}>
          {submitting ? 'Posting…' : replyTo ? 'Reply' : 'Post'}
        </button>
      </div>
      {error && <p className="composer-error">{error}</p>}
    </div>
  );
}

interface RequisitionOrdersData {
  orders: PurchaseOrder[];
  receiptsByOrder: Map<string, GoodsReceipt[]>;
}

async function loadRequisitionOrders(requisitionNumber: string): Promise<RequisitionOrdersData> {
  const orders = await getPurchaseOrdersForRequisition(requisitionNumber);
  const receiptsByOrder = await getReceiptsForOrders(orders.map((o) => o.purchaseOrderNumber));
  return { orders, receiptsByOrder };
}

/** Connected purchase orders for a requisition, with receipt confirmation. */
function PurchaseOrdersSection({ requisitionNumber }: { requisitionNumber: string }) {
  const state = useAsync(() => loadRequisitionOrders(requisitionNumber), [requisitionNumber]);
  return (
    <section className="collab">
      <div className="receipts-head">
        <h2 className="collab-title">Purchase orders</h2>
        <button type="button" className="btn ghost" onClick={state.reload}>Refresh</button>
      </div>
      <AsyncBoundary
        loading={state.loading}
        error={state.error}
        data={state.data}
        isEmpty={(d) => d.orders.length === 0}
        emptyTitle="No purchase orders yet"
        emptyHint="Purchase orders created from this requisition in D365 appear here for tracking and receipt."
        onRetry={state.reload}
        loadingLabel="Loading purchase orders…"
      >
        {(data) => (
          <PurchaseOrderList
            orders={data.orders}
            receiptsByOrder={data.receiptsByOrder}
            onReceiptChanged={state.reload}
          />
        )}
      </AsyncBoundary>
    </section>
  );
}

/** Full requisition detail with collaboration timeline. */
export function RequisitionDetailScreen({
  requisition,
  onBack,
}: {
  requisition: Requisition;
  onBack: () => void;
}) {
  const { openAssistant } = useAssistant();
  const [replyTo, setReplyTo] = useState<RequisitionComment>();
  const [openingTeams, setOpeningTeams] = useState(false);
  const comments = useAsync(
    () => getComments(requisition.requisitionNumber),
    [requisition.requisitionNumber],
  );

  const discussInTeams = async () => {
    if (openingTeams) return;
    setOpeningTeams(true);
    try {
      await openRequisitionTeamsChat(requisition);
    } finally {
      setOpeningTeams(false);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <button className="btn ghost" type="button" onClick={onBack}>
          ← Back
        </button>
        <button className="btn ghost" type="button" onClick={() => openAssistant()}>
          🤖 Ask assistant
        </button>
        <button className="btn ghost" type="button" onClick={discussInTeams} disabled={openingTeams}>
          {openingTeams ? 'Opening Teams…' : '💬 Discuss in Teams'}
        </button>
        <button className="btn ghost" type="button" onClick={comments.reload}>
          Refresh
        </button>
      </div>

      <article className="detail-card">
        <div className="detail-top">
          <div>
            <span className="req-number">{requisition.requisitionNumber || '(pending number)'}</span>
            <h1 className="detail-name">{requisition.name}</h1>
          </div>
          <div className="detail-top-side">
            <StatusBadge label={STATUS_LABEL[requisition.status]} tone={STATUS_TONE[requisition.status]} />
            <span className="req-total">{formatMoney(requisition.total)}</span>
          </div>
        </div>
        <div className="req-meta">
          <div><span className="muted">Requester</span><strong>{requisition.preparerName ?? requisition.preparerPersonnelNumber ?? '—'}</strong></div>
          <div><span className="muted">Purpose</span><strong>{requisition.purpose}</strong></div>
          <div><span className="muted">Requested date</span><strong>{requisition.requestedDate?.slice(0, 10) ?? '—'}</strong></div>
        </div>
        {requisition.businessJustification && (
          <p className="req-justification"><span className="muted">Justification: </span>{requisition.businessJustification}</p>
        )}
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
      </article>

      <PurchaseOrdersSection requisitionNumber={requisition.requisitionNumber} />

      <section className="collab">
        <h2 className="collab-title">Activity</h2>
        <CommentComposer
          requisition={requisition}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(undefined)}
          onPosted={comments.reload}
        />
        <AsyncBoundary
          loading={comments.loading}
          error={comments.error}
          data={comments.data}
          isEmpty={(d) => d.length === 0}
          emptyTitle="No activity yet"
          emptyHint="Start the conversation with a comment or clarification."
          onRetry={comments.reload}
          loadingLabel="Loading activity…"
        >
          {(list) => <CommentThread comments={list} onReply={setReplyTo} />}
        </AsyncBoundary>
      </section>
    </div>
  );
}
