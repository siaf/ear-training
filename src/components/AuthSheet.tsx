import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { Bean, Blob } from './primitives';
import { signInWithGoogle, signInWithMagicLink, verifyEmailCode } from '../lib/syncEngine';
import { phCapture } from '../lib/posthog';
import { reportError } from '../lib/reportError';

interface Props {
  onClose: () => void;
  // 'first_lesson' = the soft ask after someone's first finished lesson.
  // 'lesson_limit' = the wall after the free lessons (ANON_LESSON_LIMIT in App.tsx).
  // 'link_used' = they arrived from an email link that was already used or has expired.
  reason?: AuthSheetReason;
}

export type AuthSheetReason = 'sync' | 'first_lesson' | 'lesson_limit' | 'link_used';

type Status = 'idle' | 'sending' | 'sent' | 'error';

// Supabase's answers, in words a learner can act on. null: not one we expect, so show it
// as it is and report it.
function friendlyAuthMessage(message: string): string | null {
  if (/email rate limit exceeded|over_email_send_rate_limit/i.test(message)) {
    return "We've sent several emails in the last few minutes. Use the newest one, or continue with Google.";
  }
  if (/token has expired or is invalid|otp.*(expired|invalid)|invalid.*(token|otp)/i.test(message)) {
    return "That code didn't work. Check the newest email, or send a new one.";
  }
  return null;
}

export default function AuthSheet({ onClose, reason = 'sync' }: Props) {
  const firstLesson = reason === 'first_lesson';
  const wall = reason === 'lesson_limit';
  const linkUsed = reason === 'link_used';
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [emailOpen, setEmailOpen] = useState(linkUsed);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resent, setResent] = useState(false);
  const [googleStarting, setGoogleStarting] = useState(false);
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

  // Separate from the effect above: onClose changes on every parent render.
  useEffect(() => {
    phCapture('auth_sheet_opened', { reason });
  }, [reason]);

  // 'wait': Supabase refused because one was asked for seconds ago, so that one is on its way.
  async function sendEmail(): Promise<'sent' | 'wait' | 'failed'> {
    phCapture('auth_provider_clicked', { provider: 'magic_link' });
    try {
      await signInWithMagicLink(email.trim());
      return 'sent';
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown';
      phCapture('auth_failed', { provider: 'magic_link', reason: message });
      if (/only request this after \d+ seconds/i.test(message)) return 'wait';
      const friendly = friendlyAuthMessage(message);
      if (!friendly) reportError('auth', err, { provider: 'magic_link' });
      setErrorMsg(friendly ?? (err instanceof Error ? err.message : 'Could not send the email.'));
      return 'failed';
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === 'sending' || !email.trim()) return;
    setStatus('sending');
    setErrorMsg(null);
    const result = await sendEmail();
    // On 'wait', the earlier email is on its way, so go on to its code rather than show an error.
    setStatus(result === 'failed' ? 'error' : 'sent');
  }

  async function resend() {
    setErrorMsg(null);
    setResent(false);
    setCode('');
    const result = await sendEmail();
    if (result === 'sent') setResent(true);
    if (result === 'wait') setErrorMsg('A new email can go in a few seconds. Try again shortly.');
  }

  // Signing in here, in this tab. App closes the sheet once the session lands
  // (and carries on with whatever the learner was starting).
  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    const digits = code.replace(/\D/g, '');
    if (verifying || digits.length < 6) return;
    setVerifying(true);
    setErrorMsg(null);
    phCapture('auth_provider_clicked', { provider: 'email_code' });
    try {
      await verifyEmailCode(email.trim(), digits);
      phCapture('auth_code_verified');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown';
      phCapture('auth_failed', { provider: 'email_code', reason: message });
      const friendly = friendlyAuthMessage(message);
      if (!friendly) reportError('auth', err, { provider: 'email_code' });
      setErrorMsg(friendly ?? (err instanceof Error ? err.message : 'Could not sign in with that code.'));
      setVerifying(false);
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
                {linkUsed ? 'link already used' : firstLesson ? 'nice work' : wall ? 'free account' : 'cloud sync'}
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
                {linkUsed ? (
                  <>That sign-in link has <span style={{ fontStyle: 'italic', color: 'var(--mint-ink)' }}>already been used.</span></>
                ) : wall ? (
                  <>Save your progress to <span style={{ fontStyle: 'italic', color: 'var(--mint-ink)' }}>keep going.</span></>
                ) : firstLesson ? (
                  <>Keep your <span style={{ fontStyle: 'italic', color: 'var(--mint-ink)' }}>progress.</span></>
                ) : (
                  <>Sync your practice across <span style={{ fontStyle: 'italic', color: 'var(--mint-ink)' }}>devices.</span></>
                )}
              </h2>
              <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.5, margin: '0 0 18px' }}>
                {linkUsed
                  ? 'Each link works once, and some email apps open it before you do. If you opened it in another tab or browser, you\'re signed in there. To sign in here, we\'ll email you a code.'
                  : wall
                  ? 'You\'ve finished your first lessons. A free account keeps everything you\'ve done and opens the rest of the free course, on any device. It takes 10 seconds with Google.'
                  : firstLesson
                  ? 'Save this lesson and pick up where you left off on any device. We\'ll send an occasional nudge to keep your streak going; unsubscribe anytime.'
                  : 'Sign in once and your sessions, streaks, and progress will follow you to any device.'}
              </p>
              <Bean
                tone="coral"
                size="lg"
                disabled={googleStarting}
                onClick={async () => {
                  if (googleStarting) return;
                  setGoogleStarting(true);
                  setErrorMsg(null);
                  phCapture('auth_provider_clicked', { provider: 'google' });
                  try { await signInWithGoogle(); }
                  catch (err) {
                    reportError('auth', err, { provider: 'google' });
                    phCapture('auth_failed', { provider: 'google', reason: err instanceof Error ? err.message : 'unknown' });
                    setErrorMsg(err instanceof Error ? err.message : 'Could not start Google sign-in.');
                    setStatus('error');
                    setGoogleStarting(false);
                  }
                }}
                style={{ justifyContent: 'center', width: '100%' }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                    <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.61z"/>
                    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.32A9 9 0 0 0 9 18z"/>
                    <path fill="#FBBC05" d="M3.97 10.71A5.41 5.41 0 0 1 3.68 9c0-.6.1-1.17.29-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.04l3.01-2.33z"/>
                    <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/>
                  </svg>
                  {googleStarting ? 'opening Google…' : 'continue with Google'}
                </span>
              </Bean>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', textAlign: 'center', marginTop: 8 }}>
                one tap · no password · ~3 seconds
              </div>

              {!emailOpen ? (
                <Bean
                  tone="ghost"
                  size="sm"
                  onClick={() => { setEmailOpen(true); setErrorMsg(null); }}
                  style={{ alignSelf: 'center', marginTop: 14 }}
                >
                  or sign in with email
                </Bean>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0 10px' }}>
                    <div style={{ flex: 1, height: 1, background: 'var(--ink-5)' }} />
                    <span style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: 1, textTransform: 'uppercase' }}>sign in by email</span>
                    <div style={{ flex: 1, height: 1, background: 'var(--ink-5)' }} />
                  </div>
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
                    <Bean
                      tone="soft"
                      size="lg"
                      type="submit"
                      disabled={status === 'sending'}
                      style={{ justifyContent: 'center' }}
                    >
                      {status === 'sending' ? 'sending…' : 'email me a sign-in code'}
                    </Bean>
                  </form>
                </>
              )}

              {errorMsg && (
                <div style={{ fontSize: 13, color: 'var(--coral-ink)', textAlign: 'center', marginTop: 10 }}>{errorMsg}</div>
              )}

              <Bean
                tone="ghost"
                size="sm"
                onClick={() => {
                  phCapture('auth_sheet_dismissed', { reason });
                  onClose();
                }}
                style={{ alignSelf: 'center', marginTop: 10 }}
              >
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
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <Check size={12} strokeWidth={3} /> email sent
                </span>
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
              <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.5, margin: '0 0 14px' }}>
                Type the code from the email to sign in here, or tap the link in it.
              </p>
              <form onSubmit={submitCode} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  aria-label="Code from the email"
                  placeholder="123456"
                  maxLength={12}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, ''))}
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 22,
                    letterSpacing: 6,
                    textAlign: 'center',
                    padding: '12px 16px',
                    borderRadius: 14,
                    border: '1.5px solid var(--ink-5)',
                    background: 'var(--card)',
                    color: 'var(--ink-1)',
                    outline: 'none',
                  }}
                />
                <Bean
                  tone="coral"
                  size="lg"
                  type="submit"
                  disabled={verifying || code.replace(/\D/g, '').length < 6}
                  style={{ justifyContent: 'center' }}
                >
                  {verifying ? 'signing in…' : 'sign in'}
                </Bean>
              </form>
              {errorMsg && (
                <div style={{ fontSize: 13, color: 'var(--coral-ink)', textAlign: 'center', marginTop: 10 }}>{errorMsg}</div>
              )}
              {resent && !errorMsg && (
                <div role="status" style={{ fontSize: 13, color: 'var(--mint-ink)', textAlign: 'center', marginTop: 10 }}>
                  New email sent. Use the code in the newest one.
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 10 }}>
                <Bean tone="ghost" size="sm" onClick={() => { void resend(); }}>
                  send a new email
                </Bean>
                <Bean tone="ghost" size="sm" onClick={onClose}>
                  close
                </Bean>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
