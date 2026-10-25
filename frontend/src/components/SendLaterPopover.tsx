import { Calendar, Clock } from 'lucide-react';
import { useState } from 'react';
import { toLocalInput } from '../lib';

const at = (h: number, m = 0) => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(h, m, 0, 0); return d; };
const OPTIONS = [
  { label: 'Tomorrow 9:00 AM', date: at(9) },
  { label: 'Tomorrow 11:00 AM', date: at(11) },
  { label: 'Tomorrow 3:00 PM', date: at(15) },
  { label: 'Tomorrow 6:00 PM', date: at(18) },
];

interface Props { initial: string; onCancel: () => void; onDone: (value: string) => void }

export default function SendLaterPopover({ initial, onCancel, onDone }: Props) {
  const [value, setValue] = useState(initial);
  return (
    <div className="absolute right-0 top-full z-30 mt-2 w-[220px] glass-raised p-3" role="dialog" aria-label="Schedule send">
      <div className="flex items-center gap-2 mb-3">
        <Clock size={13} className="text-brand shrink-0" />
        <p className="text-xs font-semibold text-ink">Schedule Send</p>
      </div>

      <label className="flex items-center gap-2 rounded-lg border border-surface-border bg-surface px-2.5 py-2 mb-3 focus-within:border-brand/50">
        <Calendar size={11} className="shrink-0 text-muted" />
        <input
          type="datetime-local"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label="Pick date and time"
          className="w-full bg-transparent text-xs text-white font-medium outline-none"
          style={{ color: '#ffffff' }}
        />
      </label>

      <div className="space-y-0.5 mb-3">
        {OPTIONS.map((o) => (
          <button
            key={o.label}
            type="button"
            onClick={() => setValue(toLocalInput(o.date))}
            className={`w-full rounded-lg px-2.5 py-2 text-left text-[11px] transition-colors duration-150 ${
              value === toLocalInput(o.date) ? 'bg-brand-soft text-brand font-medium' : 'text-muted hover:text-ink hover:bg-surface-hover'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-border">
        <button type="button" onClick={onCancel} className="text-[11px] text-muted hover:text-ink transition-colors">
          Cancel
        </button>
        <button
          type="button"
          disabled={!value}
          onClick={() => onDone(value)}
          className="btn-outline py-1 px-3 text-[11px]"
        >
          Confirm
        </button>
      </div>
    </div>
  );
}
