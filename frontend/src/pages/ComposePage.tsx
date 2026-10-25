import { ArrowLeft, Clock, Paperclip, Send, Upload, Zap } from 'lucide-react';
import { FormEvent, ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import RecipientsField from '../components/RecipientsField';
import RichTextEditor from '../components/RichTextEditor';
import SendLaterPopover from '../components/SendLaterPopover';
import Spinner from '../components/ui/Spinner';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { textOf } from '../lib';

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex items-start gap-4 py-3 border-b border-surface-border last:border-0">
    <span className="w-16 shrink-0 pt-1 text-[11px] font-medium uppercase tracking-wider text-muted">{label}</span>
    <div className="min-w-0 flex-1">{children}</div>
  </div>
);

export default function ComposePage() {
  const { user } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [leads, setLeads] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [delay, setDelay] = useState('');
  const [hourly, setHourly] = useState('');
  const [sendAt, setSendAt] = useState('');
  const [later, setLater] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!leads.length) return toast('error', 'Add recipients or upload a CSV/text file.');
    if (!subject.trim()) return toast('error', 'Please enter a subject.');
    if (!textOf(body)) return toast('error', 'Please write the email body.');
    setBusy(true);
    try {
      const start = sendAt ? new Date(sendAt) : new Date(Date.now() + 3000);
      const res = await api.schedule({
        subject: subject.trim(), body, leads, startTime: start.toISOString(),
        delaySeconds: Number(delay) || 0, hourlyLimit: Number(hourly) || undefined,
      });
      toast('success', `${res.scheduled} emails scheduled successfully!`);
      nav('/dashboard/scheduled');
    } catch (err) { toast('error', (err as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex flex-col bg-night-900">
      {/* Top bar */}
      <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-surface-border bg-night-800/80 backdrop-blur-glass px-5 py-3">
        <button
          type="button"
          onClick={() => nav(-1)}
          aria-label="Back"
          className="flex items-center justify-center rounded-xl border border-surface-border bg-surface p-2 text-muted hover:text-ink hover:bg-surface-hover transition-all duration-200"
        >
          <ArrowLeft size={15} />
        </button>
        <h1 className="flex-1 text-base font-semibold text-ink">Compose New Email</h1>

        {/* Send later popover */}
        <div className="relative">
          <button
            type="button"
            aria-label="Schedule for later"
            onClick={() => setLater((l) => !l)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs transition-all duration-200 ${
              sendAt
                ? 'border-brand/40 bg-brand-soft text-brand'
                : 'border-surface-border bg-surface text-muted hover:text-ink hover:bg-surface-hover'
            }`}
          >
            <Clock size={13} />
            {sendAt ? <span>Scheduled</span> : <span>Send Later</span>}
          </button>
          {later && (
            <SendLaterPopover
              initial={sendAt}
              onCancel={() => { setSendAt(''); setLater(false); }}
              onDone={(v) => { setSendAt(v); setLater(false); }}
            />
          )}
        </div>

        <button
          type="button"
          disabled
          title="Attachments not supported"
          aria-label="Attachments (unsupported)"
          className="flex items-center justify-center rounded-xl border border-surface-border bg-surface p-2 text-muted/30 cursor-not-allowed"
        >
          <Paperclip size={15} />
        </button>

        <button
          form="compose-form"
          type="submit"
          disabled={busy}
          className="btn-primary gap-2 px-5 py-2 text-sm"
        >
          {busy ? <Spinner className="h-4 w-4" /> : <Zap size={14} />}
          {sendAt ? 'Schedule' : 'Send Now'}
        </button>
      </header>

      {/* Form */}
      <form id="compose-form" onSubmit={submit} className="flex-1 px-6 py-6 mx-auto w-full max-w-3xl">
        <div className="glass p-0 overflow-hidden">
          <Row label="From">
            <div className="flex items-center gap-2 py-0.5">
              <span className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-surface-raised px-3 py-1.5 text-xs text-ink">
                <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
                {user?.email} <span className="text-muted">(via Ethereal SMTP)</span>
              </span>
            </div>
          </Row>

          <Row label="To">
            <RecipientsField leads={leads} onChange={setLeads} />
          </Row>

          <Row label="Subject">
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter email subject…"
              aria-label="Subject"
              className="w-full bg-transparent text-sm text-white font-medium outline-none placeholder:text-muted/60 py-1"
              style={{ color: '#ffffff' }}
            />
          </Row>

          {/* Settings row */}
          <div className="flex items-center gap-6 px-4 py-3 border-b border-surface-border bg-surface/50">
            <label className="flex items-center gap-3 text-[11px] font-medium text-muted">
              <Clock size={12} className="text-brand/70" />
              Delay between emails
              <input
                value={delay}
                onChange={(e) => setDelay(e.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
                placeholder="0"
                aria-label="Delay in seconds"
                className="w-14 rounded-lg border border-surface-border bg-night-800 px-2 py-1 text-center text-xs text-white font-semibold outline-none focus:border-brand/50"
                style={{ color: '#ffffff' }}
              />
              <span className="text-muted">sec</span>
            </label>
            <div className="h-4 w-px bg-surface-border" />
            <label className="flex items-center gap-3 text-[11px] font-medium text-muted">
              <Zap size={12} className="text-brand/70" />
              Hourly limit
              <input
                value={hourly}
                onChange={(e) => setHourly(e.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
                placeholder="200"
                aria-label="Hourly limit"
                className="w-16 rounded-lg border border-surface-border bg-night-800 px-2 py-1 text-center text-xs text-white font-semibold outline-none focus:border-brand/50"
                style={{ color: '#ffffff' }}
              />
              <span className="text-muted">/hr</span>
            </label>
          </div>

          {/* Rich text */}
          <div className="p-4">
            <RichTextEditor onChange={setBody} />
          </div>
        </div>

        {sendAt && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-brand/20 bg-brand-soft px-4 py-2.5">
            <Clock size={13} className="text-brand shrink-0" />
            <p className="text-xs text-brand font-medium">
              Scheduled for <strong>{new Date(sendAt).toLocaleString()}</strong>
            </p>
          </div>
        )}
      </form>
    </div>
  );
}
