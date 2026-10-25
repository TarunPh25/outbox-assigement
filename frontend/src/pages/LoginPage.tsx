const Google = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.5 17.7 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/>
    <path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z"/>
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/>
  </svg>
);

export default function LoginPage() {
  const failed = new URLSearchParams(window.location.search).get('error');
  const off = 'Email sign-in is not available. Please use Google OAuth.';
  return (
    <main className="grid min-h-screen place-items-center px-4 relative overflow-hidden">
      {/* Background orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/3 left-1/2 -translate-x-1/2 h-[600px] w-[600px] rounded-full bg-brand/8 blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 h-[400px] w-[400px] rounded-full bg-violet-600/6 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-[360px] animate-fade-up">
        {/* Card */}
        <div className="glass-raised p-8">
          {/* Logo */}
          <div className="mb-8 flex flex-col items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/15 border border-brand/25 shadow-glow">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.63 19.79 19.79 0 01.07 4C.06 2.91.93 2 2.02 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
              </svg>
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-ink font-display tracking-tight">ReachInbox</h1>
              <p className="mt-1 text-sm text-muted">Email Scheduler Dashboard</p>
            </div>
          </div>

          {/* Error */}
          {failed && (
            <div className="mb-5 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
              Google sign-in failed. Please try again.
            </div>
          )}

          {/* Quick Demo button for instant testing / demo video */}
          <button
            onClick={() => { window.location.href = '/api/auth/demo'; }}
            className="w-full mb-3 flex items-center justify-center gap-2 rounded-xl bg-brand text-night-900 py-3 text-sm font-semibold shadow-glow hover:bg-brand-dark transition-all duration-200"
            style={{ backgroundColor: '#22d3a5', color: '#070b12' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            <span>Instant Demo Sign-in</span>
          </button>

          {/* Google button */}
          <button
            onClick={() => { window.location.href = '/api/auth/google'; }}
            className="w-full flex items-center justify-center gap-3 rounded-xl border border-surface-border bg-surface py-2.5 text-sm font-medium text-ink hover:bg-surface-hover hover:border-brand/30 transition-all duration-200 group"
          >
            <Google />
            <span>Continue with Google</span>
          </button>

          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-surface-border" />
            <span className="text-[10px] text-muted uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-surface-border" />
          </div>

          {/* Disabled email fields */}
          <div className="space-y-3">
            <input
              disabled
              title={off}
              placeholder="Email address"
              aria-label="Email address"
              className="input-field cursor-not-allowed opacity-40"
            />
            <input
              disabled
              title={off}
              type="password"
              placeholder="Password"
              aria-label="Password"
              className="input-field cursor-not-allowed opacity-40"
            />
            <button
              disabled
              title={off}
              className="w-full btn-primary opacity-30 cursor-not-allowed py-2.5 text-sm"
            >
              Sign in with Email
            </button>
          </div>

          <p className="mt-5 text-center text-[10px] text-muted">
            Email sign-in is disabled. Use Google OAuth above.
          </p>
        </div>

        {/* Bottom note */}
        <p className="mt-4 text-center text-[10px] text-muted/60">
          ReachInbox · Built for the Full-Stack Internship Assignment
        </p>
      </div>
    </main>
  );
}
