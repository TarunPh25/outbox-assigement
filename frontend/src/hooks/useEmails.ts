import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Counts, EmailRow } from '../types';

/** Loads scheduled/sent lists (or search results) and polls so status changes show up live. */
export function useEmails(kind: 'scheduled' | 'sent', query: string) {
  const [rows, setRows] = useState<EmailRow[]>([]);
  const [counts, setCounts] = useState<Counts>({ scheduled: 0, sent: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [list, c] = await Promise.all([query ? api.search(query, kind) : api[kind](), api.counts()]);
      setRows(list); setCounts(c); setError(null);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [kind, query]);

  useEffect(() => {
    load();
    const t = setInterval(() => load(true), 10_000);
    return () => clearInterval(t);
  }, [load]);

  return { rows, counts, loading, error, reload: () => load() };
}
