import { useEffect, useRef, useState } from 'react';
import { Bean, Blob } from './primitives';
import { signInWithGoogle, signInWithMagicLink } from '../lib/syncEngine';

interface Props {
  onClose: () => void;
}

type Status = 'idle' | 'sending' | 'sent' | 'error';

export default function AuthSheet({ onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 20);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === 'sending') return;
    const trimmed = email.trim();
    if (!trimmed) return;
    setStatus('sending');
    setErrorMsg(null);
    try {
      await signInWithMagicLink(trimmed);
      setStatus('sent');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Could not send the link.');
    }
  }

  return (
    <div
      ref={backdropRef}
      role="dialog"
      aria-modal="true"
      aria-label="Sign in to sync your practice"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 90,
        background: 'rgba(42,29,58,0.35)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
    >
      <div
        style={{
          background: 'var(--page)',
          width: '100%',
          maxWidth: 520,
          borderRadius: '28px 28px 0 0',
          padding: '28px 24px 24px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: 'var(--sh-lg)',
          transform: mounted ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 320ms cubic-bezier(.2,.8,.3,1)',
        }}
      >
        <Blob size={160} color="var(--mint)" style={{ position: 'absolute', top: -40, right: -30, opacity: 0.6 }} />
        <div style={{ position: 'relative', zIndex: 2 }}>
          {status !== 'sent' ? (
            <>
              <div
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 11,
                  color: 'var(--ink-3)',
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  marginBottom: 6,
                }}
              >
                cloud sync
              </div>
              <h2
                style={{
                  fontFamily: 'var(--disp)',
                  fontSize: 28,
                  fontWeight: 600,
                  letterSpacing: -0.015,
                  lineHeight: 1.1,
                  margin: '0 0 10px',
                }}
              >
                Sync your practice across <span style={{ fontStyle: 'italic', color: 'var(--mint-ink)' }}>devices.</span>
              </h2>
              <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.5, margin: '0 0 18px' }}>
                We'll email a magic link — no password needed. Your sessions and progress will follow you to any device you sign in on.
              </p>
              <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    fontFamily: 'var(--ui)',
                    fontSize: 16,
                    padding: '14px 16px',
                    borderRadius: 14,
                    border: '1.5px solid var(--ink-5)',
                    background: 'var(--card)',
                    color: 'var(--ink-1)',
                    outline: 'none',
                  }}
                />
                {errorMsg && (
                  <div style={{ fontSize: 13, color: 'var(--coral-ink)' }}>{errorMsg}</div>
                )}
                <Bean
                  tone="coral"
                  size="lg"
                  type="submit"
                  disabled={status === 'sending'}
                  style={{ justifyContent: 'center' }}
                >
                  {status === 'sending' ? 'sending…' : 'send magic link'}
                </Bean>
              </form>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0 10px' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--ink-5)' }} />
                <span style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: 1, textTransform: 'uppercase' }}>or</span>
                <div style={{ flex: 1, height: 1, background: 'var(--ink-5)' }} />
              </div>
              <Bean
                tone="soft"
                size="lg"
                onClick={async () => {
                  try { await signInWithGoogle(); }
                  catch (err) { setErrorMsg(err instanceof Error ? err.message : 'Could not start Google sign-in.'); setStatus('error'); }
                }}
                style={{ justifyContent: 'center', width: '100%' }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                    <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.61z"/>
                    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.32A9 9 0 0 0 9 18z"/>
                    <path fill="#FBBC05" d="M3.97 10.71A5.41 5.41 0 0 1 3.68 9c0-.6.1-1.17.29-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.04l3.01-2.33z"/>
                    <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/>
                  </svg>
                  continue with Google
                </span>
              </Bean>
              <Bean tone="ghost" size="sm" onClick={onClose} style={{ alignSelf: 'center', marginTop: 6 }}>
                not now
              </Bean>
            </>
          ) : (
            <>
              <div
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 11,
                  color: 'var(--mint-ink)',
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  marginBottom: 6,
                }}
              >
                ✓ link sent
              </div>
              <h2
                style={{
                  fontFamily: 'var(--disp)',
                  fontSize: 28,
                  fontWeight: 600,
                  letterSpacing: -0.015,
                  lineHeight: 1.1,
                  margin: '0 0 10px',
                }}
              >
                Check <span style={{ fontStyle: 'italic', color: 'var(--mint-ink)' }}>{email}</span>.
              </h2>
              <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.5, margin: '0 0 18px' }}>
                Tap the magic link in the email to sign in. The link opens this app and you'll be signed in automatically.
              </p>
              <Bean tone="ghost" size="sm" onClick={onClose} style={{ alignSelf: 'center' }}>
                close
              </Bean>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
