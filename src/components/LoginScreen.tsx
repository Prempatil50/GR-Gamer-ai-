import { useState } from 'react';
import { Compass, Mic, Palette, ShieldCheck } from 'lucide-react';

interface LoginScreenProps {
  onGoogleLogin: () => Promise<void>;
  authError: string | null;
}

export function LoginScreen({ onGoogleLogin, authError }: LoginScreenProps) {
  const [signingIn, setSigningIn] = useState(false);

  const handleLoginClick = async () => {
    setSigningIn(true);
    try {
      await onGoogleLogin();
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div
      className="min-h-[100dvh] flex flex-col justify-between px-5 py-6 md:px-12 md:py-8 pb-safe"
      style={{
        backgroundColor: 'var(--canvas-bg)',
        color: 'var(--text-primary)',
      }}
    >
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between gap-4">
        <span className="text-lg font-bold tracking-tight whitespace-nowrap shrink-0">
          Aurora AI Studio
        </span>
        <button
          onClick={handleLoginClick}
          disabled={signingIn}
          className="min-h-[44px] md:min-h-0 px-4 py-2 rounded-xl md:rounded-lg text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-60 cursor-pointer whitespace-nowrap shrink-0"
          style={{
            backgroundColor: 'var(--accent-primary)',
            color: 'var(--accent-fg)',
          }}
        >
          {signingIn ? 'Signing in...' : 'Sign in'}
        </button>
      </header>

      <main className="max-w-5xl w-full mx-auto my-auto py-8 md:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        <div className="lg:col-span-7 space-y-5 md:space-y-6">
          <p
            className="text-xs sm:text-sm font-medium"
            style={{ color: 'var(--text-muted)' }}
          >
            Conversational Workspace · Powered by Gemini & Firebase
          </p>
          <h1
            className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight leading-[1.12]"
            style={{ textWrap: 'balance' }}
          >
            Your personal AI workspace for ideas, voice dialogue, and new opportunities.
          </h1>
          <p
            className="text-sm sm:text-base md:text-lg leading-relaxed max-w-xl"
            style={{ color: 'var(--text-secondary)' }}
          >
            Ask anything in English, Hindi, or Hinglish. Speak naturally with instant voice replies, organize dedicated opportunity pages, and customize your workspace canvas—securely synced to your Google account.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <button
              onClick={handleLoginClick}
              disabled={signingIn}
              className="w-full sm:w-auto min-h-[48px] inline-flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl text-sm font-semibold transition-transform active:scale-[0.99] disabled:opacity-60 cursor-pointer shadow-sm"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'var(--accent-fg)',
              }}
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27c3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10c5.35 0 9.25-3.67 9.25-9.09c0-1.15-.15-1.81-.15-1.81Z"
                />
              </svg>
              <span>{signingIn ? 'Connecting Google Account...' : 'Continue with Google'}</span>
            </button>
          </div>

          {authError && (
            <div
              role="alert"
              className="p-3.5 rounded-lg text-sm border"
              style={{
                backgroundColor: 'var(--surface-bg)',
                borderColor: '#dc2626',
                color: '#ef4444',
              }}
            >
              {authError}
            </div>
          )}
        </div>

        <div
          className="lg:col-span-5 rounded-2xl p-6 md:p-8 border space-y-6"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            borderColor: 'var(--surface-border)',
          }}
        >
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Workspace Capabilities</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Everything saved privately under your verified account.
            </p>
          </div>

          <div className="space-y-5 pt-2">
            <div className="flex items-start gap-3.5">
              <Mic className="w-5 h-5 mt-0.5 shrink-0" style={{ color: 'var(--accent-primary)' }} />
              <div>
                <h3 className="text-sm font-semibold">Voice Commands & Spoken Replies</h3>
                <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  Speak prompts or commands hands-free and listen to natural AI voice replies.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <Compass className="w-5 h-5 mt-0.5 shrink-0" style={{ color: 'var(--accent-primary)' }} />
              <div>
                <h3 className="text-sm font-semibold">New Pages & Opportunity Modes</h3>
                <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  Launch focused workspaces for career growth, coding, study, or custom workflows.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <Palette className="w-5 h-5 mt-0.5 shrink-0" style={{ color: 'var(--accent-primary)' }} />
              <div>
                <h3 className="text-sm font-semibold">Adaptive Background Themes</h3>
                <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  Switch curated palettes or pick any custom background color with automatic contrast.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <ShieldCheck className="w-5 h-5 mt-0.5 shrink-0" style={{ color: 'var(--accent-primary)' }} />
              <div>
                <h3 className="text-sm font-semibold">Firebase Cloud Persistence</h3>
                <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  Google Sign-In and Firestore sync keep your chats and preferences across sessions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer
        className="max-w-6xl w-full mx-auto pt-6 border-t flex items-center justify-between text-xs"
        style={{
          borderColor: 'var(--surface-border)',
          color: 'var(--text-muted)',
        }}
      >
        <span>Aurora AI Studio</span>
        <span>Private Firebase Workspace</span>
      </footer>
    </div>
  );
}
