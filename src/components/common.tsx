import type { ReactNode } from 'react';

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="state-block" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="state-block">
      <div className="state-emoji" aria-hidden="true">📭</div>
      <strong>{title}</strong>
      {hint && <span className="muted">{hint}</span>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state-block error" role="alert">
      <div className="state-emoji" aria-hidden="true">⚠️</div>
      <strong>Something went wrong</strong>
      <span className="muted">{message}</span>
      {onRetry && (
        <button className="btn" onClick={onRetry} type="button">
          Try again
        </button>
      )}
    </div>
  );
}

/** Render loading / error / empty / content based on async state. */
export function AsyncBoundary<T>({
  loading,
  error,
  data,
  isEmpty,
  emptyTitle,
  emptyHint,
  onRetry,
  children,
  loadingLabel,
}: {
  loading: boolean;
  error?: string;
  data: T | undefined;
  isEmpty?: (data: T) => boolean;
  emptyTitle?: string;
  emptyHint?: string;
  onRetry?: () => void;
  loadingLabel?: string;
  children: (data: T) => ReactNode;
}) {
  if (loading) return <Spinner label={loadingLabel} />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (data === undefined) return <EmptyState title={emptyTitle ?? 'Nothing to show'} hint={emptyHint} />;
  if (isEmpty?.(data)) return <EmptyState title={emptyTitle ?? 'Nothing to show'} hint={emptyHint} />;
  return <>{children(data)}</>;
}

export function StatusBadge({ label, tone }: { label: string; tone: string }) {
  return <span className={`badge badge-${tone}`}>{label}</span>;
}
