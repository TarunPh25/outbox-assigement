export interface User { id: string; name: string; email: string; avatar: string | null }
export type EmailStatus = 'scheduled' | 'processing' | 'sent' | 'failed';
export interface EmailRow {
  id: string; to: string; subject: string; preview: string; status: EmailStatus; sender: string;
  scheduledAt: string; sentAt: string | null; previewUrl?: string | null; error?: string | null;
}
export interface ScheduleRequest {
  subject: string; body: string; leads: string[]; startTime: string; delaySeconds: number; hourlyLimit?: number;
}
export interface ScheduleResponse { scheduled: number; duplicatesRemoved: number }
export interface SlackStatus { connected: boolean; channel: string | null }
export interface Counts { scheduled: number; sent: number }
