const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

/** Extract unique, lower-cased email addresses from CSV/text content. */
export function parseEmails(text: string): string[] {
  return [...new Set((text.match(EMAIL_RE) ?? []).map((e) => e.toLowerCase()))];
}

export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(s);

/** "Tue 9:15:12 AM" style label used on scheduled rows. */
export const formatSlot = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit', second: '2-digit' }).replace(',', '') : '-';

/** Value for <input type="datetime-local"> in local time. */
export function toLocalInput(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export const textOf = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
