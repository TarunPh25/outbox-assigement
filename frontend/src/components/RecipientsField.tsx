import { Upload, X } from 'lucide-react';
import { ChangeEvent, KeyboardEvent, useRef, useState } from 'react';
import { isEmail, parseEmails } from '../lib';

interface Props { leads: string[]; onChange: (leads: string[]) => void }

export default function RecipientsField({ leads, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [fileInfo, setFileInfo] = useState('');

  const add = (list: string[]) => onChange([...new Set([...leads, ...list])]);
  const commit = () => { const v = draft.trim().replace(/,$/, '').toLowerCase(); if (isEmail(v)) add([v]); setDraft(''); };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (['Enter', ',', ' '].includes(e.key) && draft) { e.preventDefault(); commit(); }
    if (e.key === 'Backspace' && !draft && leads.length) onChange(leads.slice(0, -1));
  };
  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const found = parseEmails(await f.text());
    add(found);
    setFileInfo(found.length ? `${found.length} addresses found in ${f.name}` : `No email addresses found in ${f.name}`);
    e.target.value = '';
  };

  const shown = expanded ? leads : leads.slice(0, 4);
  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 min-h-[32px] py-1">
        {shown.map((l) => (
          <span
            key={l}
            className="inline-flex items-center gap-1 rounded-full border border-brand-line bg-brand-soft px-2.5 py-1 text-[11px] text-brand font-medium"
          >
            {l}
            <button
              type="button"
              aria-label={`Remove ${l}`}
              onClick={() => onChange(leads.filter((x) => x !== l))}
              className="text-brand/60 hover:text-brand transition-colors"
            >
              <X size={9} />
            </button>
          </span>
        ))}
        {!expanded && leads.length > 4 && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="rounded-full border border-surface-border bg-surface px-2.5 py-1 text-[11px] text-muted hover:text-ink transition-colors"
          >
            +{leads.length - 4} more
          </button>
        )}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          onBlur={commit}
          placeholder={leads.length ? '' : 'recipient@example.com, …'}
          aria-label="Recipients"
          className="min-w-[180px] flex-1 bg-transparent py-1 text-sm text-white outline-none placeholder:text-muted/60"
          style={{ color: '#ffffff' }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="btn-outline py-1.5 px-3 text-[11px] shrink-0"
        >
          <Upload size={11} /> Upload CSV
        </button>
        <input ref={fileRef} type="file" accept=".csv,.txt,text/csv,text/plain" onChange={onFile} className="hidden" />
      </div>
      {(fileInfo || leads.length > 0) && (
        <p className={`mt-1.5 text-[11px] font-medium ${fileInfo.startsWith('No') ? 'text-red-400' : 'text-brand'}`}>
          {fileInfo || `${leads.length} email address${leads.length !== 1 ? 'es' : ''} added`}
          {fileInfo && leads.length > 0 && !fileInfo.startsWith('No') ? ` · ${leads.length} total` : ''}
        </p>
      )}
    </div>
  );
}
