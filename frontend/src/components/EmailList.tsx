import { Clock, ExternalLink, Star, CheckCircle, XCircle, Timer } from 'lucide-react';
import { useState } from 'react';
import { formatSlot } from '../lib';
import type { EmailRow } from '../types';
import Spinner from './ui/Spinner';

function Badge({ row }: { row: EmailRow }) {
  if (row.status === 'sent')
    return (
      <span className="badge-sent">
        <CheckCircle size={10} /> Sent
      </span>
    );
  if (row.status === 'failed')
    return (
      <span title={row.error ?? ''} className="badge-failed">
        <XCircle size={10} /> Failed
      </span>
    );
  if (row.status === 'processing')
    return (
      <span className="badge-processing">
        <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" /> Processing
      </span>
    );
  return (
    <span className="badge-scheduled">
      <Clock size={10} /> {formatSlot(row.scheduledAt)}
    </span>
  );
}

function Row({ row }: { row: EmailRow }) {
  const [starred, setStarred] = useState(false);
  return (
    <li className="group flex items-center gap-4 border-b border-surface-border px-4 py-3.5 hover:bg-surface-hover transition-colors duration-150 animate-fade-up">
      {/* To */}
      <div className="w-44 shrink-0 min-w-0">
        <p className="truncate text-[13px] font-medium text-ink">{row.to}</p>
        <p className="truncate text-[10px] text-muted">{row.sender}</p>
      </div>

      {/* Badge */}
      <Badge row={row} />

      {/* Subject + Preview */}
      <div className="min-w-0 flex-1">
        <span className="text-[13px] font-medium text-ink">{row.subject}</span>
        {row.preview && (
          <span className="text-[12px] text-muted"> — {row.preview}</span>
        )}
      </div>

      {/* Actions */}
      <div className="shrink-0 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        {row.previewUrl && (
          <a
            href={row.previewUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-brand-line bg-brand-soft px-2 py-1 text-[10px] font-medium text-brand hover:bg-brand/20 transition-colors"
          >
            <ExternalLink size={10} /> Preview
          </a>
        )}
        <button
          onClick={() => setStarred((s) => !s)}
          aria-label="Star"
          className={`rounded-full p-1 transition-colors ${starred ? 'text-amber-400' : 'text-muted hover:text-amber-400'}`}
        >
          <Star size={13} className={starred ? 'fill-amber-400' : ''} />
        </button>
      </div>
    </li>
  );
}

function SkeletonRow() {
  return (
    <li className="flex items-center gap-4 border-b border-surface-border px-4 py-3.5">
      <div className="w-44 shrink-0 space-y-1.5">
        <div className="skeleton h-3 w-32" />
        <div className="skeleton h-2 w-20" />
      </div>
      <div className="skeleton h-5 w-16 rounded-full" />
      <div className="skeleton h-3 flex-1" />
    </li>
  );
}

interface Props { rows: EmailRow[]; loading: boolean; error: string | null; kind: 'scheduled' | 'sent'; searching: boolean }

export default function EmailList({ rows, loading, error, kind, searching }: Props) {
  if (loading) return (
    <ul className="mt-2">
      {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
    </ul>
  );

  if (error) return (
    <div className="flex flex-col items-center py-24 gap-3">
      <XCircle size={36} className="text-red-400/60" />
      <p className="text-sm text-muted">Could not load emails: {error}</p>
    </div>
  );

  if (!rows.length) {
    const [title, subtitle] = searching
      ? ['No matches found', 'Try a different recipient, subject, or keyword.']
      : kind === 'scheduled'
      ? ['Nothing scheduled yet', 'Use Compose to schedule a batch of emails.']
      : ['No emails sent yet', 'Sent emails will appear here once their scheduled time arrives.'];

    const Icon = kind === 'scheduled' ? Timer : CheckCircle;

    return (
      <div className="flex flex-col items-center justify-center py-28 gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface border border-surface-border">
          <Icon size={28} className="text-muted/50" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-ink">{title}</p>
          <p className="mt-1 text-sm text-muted max-w-xs">{subtitle}</p>
        </div>
      </div>
    );
  }

  return (
    <ul className="mt-2">
      {rows.map((r) => <Row key={r.id} row={r} />)}
    </ul>
  );
}
