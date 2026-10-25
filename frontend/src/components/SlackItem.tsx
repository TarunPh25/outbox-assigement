import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useToast } from '../hooks/useToast';
import type { SlackStatus } from '../types';

const SlackIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.528 2.528 0 012.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 012.521 2.521 2.528 2.528 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 012.522-2.521A2.528 2.528 0 0124 8.834a2.528 2.528 0 01-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 01-2.523 2.521 2.527 2.527 0 01-2.52-2.521V2.522A2.527 2.527 0 0115.165 0a2.528 2.528 0 012.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 012.523 2.522A2.528 2.528 0 0115.165 24a2.527 2.527 0 01-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 01-2.52-2.523 2.526 2.526 0 012.52-2.52h6.313A2.527 2.527 0 0124 15.165a2.528 2.528 0 01-2.522 2.523h-6.313z"/>
  </svg>
);

export default function SlackItem() {
  const [status, setStatus] = useState<SlackStatus | null>(null);
  const toast = useToast();

  useEffect(() => {
    api.slackStatus().then(setStatus).catch(() => setStatus({ connected: false, channel: null }));
    const flag = new URLSearchParams(window.location.search).get('slack');
    if (flag === 'connected') toast('success', 'Slack connected! You\'ll be notified on rate limit hits.');
    if (flag === 'error') toast('error', 'Could not connect Slack. Try again.');
    if (flag) window.history.replaceState({}, '', window.location.pathname);
  }, [toast]);

  if (!status) return null;

  if (status.connected) {
    const disconnect = async () => {
      if (!window.confirm('Disconnect Slack? You will stop getting rate-limit alerts.')) return;
      await api.slackDisconnect();
      setStatus({ connected: false, channel: null });
      toast('success', 'Slack disconnected');
    };
    return (
      <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm bg-emerald-500/8 border border-emerald-500/15">
        <SlackIcon />
        <span className="flex-1 truncate min-w-0 text-xs">
          <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-400 font-medium">{status.channel || 'Slack'}</span>
        </span>
        <button onClick={disconnect} className="shrink-0 text-[10px] text-muted hover:text-red-400 transition-colors duration-150">
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => { window.location.href = '/api/slack/connect'; }}
      className="nav-link w-full text-left"
    >
      <SlackIcon />
      <span>Connect Slack</span>
    </button>
  );
}
