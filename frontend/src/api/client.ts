import type { Counts, EmailRow, ScheduleRequest, ScheduleResponse, SlackStatus, User } from '../types';

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(data.error ?? `Request failed (${res.status})`, res.status);
  }
  return res.json();
}

export const api = {
  me: () => request<User>('/api/auth/me'),
  logout: () => request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),
  counts: () => request<Counts>('/api/emails/counts'),
  scheduled: () => request<EmailRow[]>('/api/emails/scheduled'),
  sent: () => request<EmailRow[]>('/api/emails/sent'),
  search: (q: string, tab: 'scheduled' | 'sent') =>
    request<EmailRow[]>(`/api/emails/search?q=${encodeURIComponent(q)}&tab=${tab}`),
  schedule: (body: ScheduleRequest) =>
    request<ScheduleResponse>('/api/emails/schedule', { method: 'POST', body: JSON.stringify(body) }),
  slackStatus: () => request<SlackStatus>('/api/slack/status'),
  slackDisconnect: () => request<{ ok: boolean }>('/api/slack/disconnect', { method: 'POST' }),
};
