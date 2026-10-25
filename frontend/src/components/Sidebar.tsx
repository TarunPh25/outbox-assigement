import { Activity, ChevronDown, Clock, LogOut, Send, Zap } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { Counts } from '../types';
import Avatar from './Avatar';
import Logo from './Logo';
import SlackItem from './SlackItem';

const navCls = ({ isActive }: { isActive: boolean }) =>
  `nav-link${isActive ? ' active' : ''}`;

export default function Sidebar({ counts }: { counts: Counts }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  if (!user) return null;
  return (
    <aside className="flex w-[220px] shrink-0 flex-col gap-2 border-r border-surface-border bg-night-800/60 backdrop-blur-glass px-3 py-5">
      {/* Logo */}
      <div className="px-1 mb-2">
        <Logo />
      </div>

      {/* User card */}
      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex w-full items-center gap-2.5 rounded-xl border border-surface-border bg-surface px-3 py-2.5 text-left hover:bg-surface-hover transition-all duration-200"
        >
          <Avatar user={user} size={30} />
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-xs font-semibold text-ink">{user.name}</span>
            <span className="block truncate text-[9px] text-muted">{user.email}</span>
          </span>
          <ChevronDown size={13} className={`text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="absolute left-0 right-0 top-full z-20 mt-1.5 glass-raised p-1.5">
            <button
              onClick={logout}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
            >
              <LogOut size={14} /> Log out
            </button>
          </div>
        )}
      </div>

      {/* Compose button */}
      <Link
        to="/compose"
        className="mt-1 flex items-center justify-center gap-2 rounded-xl btn-primary text-[13px] py-2.5"
      >
        <Zap size={13} /> Compose Email
      </Link>

      {/* Nav section */}
      <div className="mt-3">
        <p className="mb-1.5 px-3 text-[9px] font-semibold tracking-widest uppercase text-muted/60">Inbox</p>
        <nav className="flex flex-col gap-0.5">
          <NavLink to="/dashboard/scheduled" className={navCls}>
            <Clock size={15} />
            <span className="flex-1">Scheduled</span>
            <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
              {counts.scheduled}
            </span>
          </NavLink>
          <NavLink to="/dashboard/sent" className={navCls}>
            <Send size={15} />
            <span className="flex-1">Sent</span>
            <span className="rounded-full bg-surface-raised px-1.5 py-0.5 text-[10px] text-muted">
              {counts.sent}
            </span>
          </NavLink>
        </nav>
      </div>

      {/* Integrations */}
      <div className="mt-3">
        <p className="mb-1.5 px-3 text-[9px] font-semibold tracking-widest uppercase text-muted/60">Integrations</p>
        <SlackItem />
        <a
          href="/admin/queues"
          target="_blank"
          rel="noreferrer"
          className="nav-link"
        >
          <Activity size={15} />
          <span>Queue Monitor</span>
        </a>
      </div>

      {/* Footer */}
      <div className="mt-auto pt-4 px-3">
        <div className="h-px bg-surface-border mb-3" />
        <p className="text-[9px] text-muted/50 text-center">ReachInbox Scheduler v1.0</p>
      </div>
    </aside>
  );
}
