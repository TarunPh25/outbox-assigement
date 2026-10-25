import { Filter, RefreshCw, Search, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Navigate, useParams, Link } from 'react-router-dom';
import EmailList from '../components/EmailList';
import Sidebar from '../components/Sidebar';
import { useEmails } from '../hooks/useEmails';

export default function DashboardPage() {
  const { tab } = useParams();
  const kind = tab === 'sent' ? 'sent' : 'scheduled';
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [menu, setMenu] = useState(false);
  const { rows, counts, loading, error, reload } = useEmails(kind, q);

  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => { setStatus('all'); }, [kind]);

  if (tab !== 'scheduled' && tab !== 'sent') return <Navigate to="/dashboard/scheduled" replace />;
  const options = kind === 'scheduled' ? ['all', 'scheduled', 'processing'] : ['all', 'sent', 'failed'];
  const visible = status === 'all' ? rows : rows.filter((r) => r.status === status);

  return (
    <div className="flex min-h-screen">
      <Sidebar counts={counts} />

      <main className="min-w-0 flex-1 flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-surface-border bg-night-800/80 backdrop-blur-glass px-5 py-3">
          {/* Tabs */}
          <div className="flex items-center gap-1 rounded-xl border border-surface-border bg-surface p-1">
            <Link
              to="/dashboard/scheduled"
              className={`rounded-lg px-4 py-1.5 text-xs font-medium transition-all duration-200 ${
                kind === 'scheduled' ? 'bg-brand text-night-900 shadow-glow-sm' : 'text-muted hover:text-ink'
              }`}
            >
              Scheduled
            </Link>
            <Link
              to="/dashboard/sent"
              className={`rounded-lg px-4 py-1.5 text-xs font-medium transition-all duration-200 ${
                kind === 'sent' ? 'bg-brand text-night-900 shadow-glow-sm' : 'text-muted hover:text-ink'
              }`}
            >
              Sent
            </Link>
          </div>

          {/* Search */}
          <label className="flex flex-1 items-center gap-2 rounded-xl border border-surface-border bg-surface px-3.5 py-2 transition-all duration-200 focus-within:border-brand/50 focus-within:ring-1 focus-within:ring-brand/20">
            <Search size={13} className="shrink-0 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${kind} emails…`}
              aria-label="Search emails"
              className="w-full bg-transparent text-xs text-white font-medium outline-none placeholder:text-muted/60"
              style={{ color: '#ffffff' }}
            />
            {search && (
              <button onClick={() => setSearch('')} className="shrink-0 text-muted hover:text-ink text-[10px]">✕</button>
            )}
          </label>

          {/* Filter */}
          <div className="relative">
            <button
              onClick={() => setMenu((m) => !m)}
              aria-label="Filter by status"
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs transition-all duration-200 ${
                status !== 'all'
                  ? 'border-brand/40 bg-brand-soft text-brand'
                  : 'border-surface-border bg-surface text-muted hover:text-ink hover:bg-surface-hover'
              }`}
            >
              <Filter size={12} />
              <span className="capitalize">{status}</span>
            </button>
            {menu && (
              <div className="absolute right-0 z-20 mt-1.5 glass-raised min-w-[130px] p-1.5">
                {options.map((o) => (
                  <button
                    key={o}
                    onClick={() => { setStatus(o); setMenu(false); }}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs capitalize transition-colors duration-150 ${
                      status === o ? 'bg-brand-soft text-brand font-medium' : 'text-muted hover:text-ink hover:bg-surface-hover'
                    }`}
                  >
                    {status === o && <span className="h-1.5 w-1.5 rounded-full bg-brand shrink-0" />}
                    {o}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Refresh */}
          <button
            onClick={reload}
            aria-label="Refresh"
            className="flex items-center gap-1.5 rounded-xl border border-surface-border bg-surface px-3 py-2 text-xs text-muted hover:text-ink hover:bg-surface-hover transition-all duration-200"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          </button>

          {/* Compose shortcut */}
          <Link
            to="/compose"
            className="hidden sm:flex items-center gap-1.5 rounded-xl btn-primary py-2 px-4 text-xs"
          >
            <Zap size={12} /> Compose
          </Link>
        </header>

        {/* Page heading */}
        <div className="px-6 pt-5 pb-2 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-ink capitalize">{kind} Emails</h1>
            <p className="text-xs text-muted mt-0.5">
              {loading ? 'Loading…' : `${visible.length} email${visible.length !== 1 ? 's' : ''}${q ? ` matching "${q}"` : ''}`}
            </p>
          </div>
        </div>

        {/* Table header */}
        {!loading && visible.length > 0 && (
          <div className="flex items-center gap-4 border-b border-surface-border px-4 py-2">
            <div className="w-44 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted">Recipient</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted w-28">Status</div>
            <div className="flex-1 text-[10px] font-semibold uppercase tracking-wider text-muted">Subject</div>
            <div className="w-16" />
          </div>
        )}

        <EmailList rows={visible} loading={loading} error={error} kind={kind} searching={!!q} />
      </main>
    </div>
  );
}
