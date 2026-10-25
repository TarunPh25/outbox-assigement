export default function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-brand/15 border border-brand/30">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-brand" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.63 19.79 19.79 0 01.07 4C.06 2.91.93 2 2.02 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
        </svg>
        <div className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-brand shadow-glow-sm" />
      </div>
      <span className="font-display text-[17px] font-bold tracking-tight text-ink">ReachInbox</span>
    </div>
  );
}
