import { useCallback, useEffect, useRef, useState } from 'react';
import { toMessage } from '../services';

export interface AsyncState<T> {
  data: T | undefined;
  loading: boolean;
  error: string | undefined;
  /** Re-run the async function. */
  reload: () => void;
}

interface Status {
  loading: boolean;
  error?: string;
}

/**
 * Run an async loader and track loading/error/data state. Re-runs whenever a
 * value in `deps` changes (or when `reload` is called). Ignores stale runs so
 * out-of-order responses can't clobber newer data.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [data, setData] = useState<T>();
  const [status, setStatus] = useState<Status>({ loading: true });
  const [nonce, setNonce] = useState(0);
  const runId = useRef(0);

  useEffect(() => {
    const current = ++runId.current;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus({ loading: true });
    fn()
      .then((result) => {
        if (current === runId.current) {
          setData(result);
          setStatus({ loading: false });
        }
      })
      .catch((err) => {
        if (current === runId.current) {
          setStatus({ loading: false, error: toMessage(err) });
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return { data, loading: status.loading, error: status.error, reload };
}
