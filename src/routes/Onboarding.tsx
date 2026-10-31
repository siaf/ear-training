import { useBreakpoint } from '../lib/useBreakpoint';
import { Bean, Brand } from '../components/primitives';
import { phCapture } from '../lib/posthog';
import type { Mascot } from '../types';

// One screen, then straight into a lesson. The old flow (2 intros, 3 questions,
// 4 calibration listens, finish) lost most new visitors before they heard a
// single question; the calibration only ever picked among the first 7 lessons.

export type OnboardingChoice = 'basics' | 'sing' | 'intervals';

export interface OnboardingResult {
  startLevelId: string;
  choice: OnboardingChoice;
}

const ONBOARDING_KEY = 'fifths.onboarding.v1';
function persistOnboarding(p: OnboardingResult & { completedAt: number }) {
  try { localStorage.setItem(ONBOARDING_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

interface Props {
  onDone: (result: OnboardingResult) => void;
  onSkip: () => void;
}

const MASCOT: Mascot = 'fable';
const TONE = { bg: 'var(--coral-soft)', ink: 'var(--coral-ink)', accent: 'var(--coral)' };

const CHOICES: Array<{ value: OnboardingChoice; label: string; desc: string; levelId: string }> = [
  { value: 'basics',    label: 'start from the beginning', desc: 'higher or lower, same or different — no experience needed', levelId: 'found_higher_lower' },
  { value: 'sing',      label: 'sing in tune',             desc: 'match a note with your voice (uses your microphone)',      levelId: 'voice_match_pitch' },
  { value: 'intervals', label: 'I know some theory',       desc: 'jump to intervals, starting with fourths and fifths',     levelId: 'int_harmonic_4ths_5ths' },
];

export default function Onboarding({ onDone, onSkip }: Props) {
  const mobile = useBreakpoint() !== 'desktop';
  const mascotSize = mobile ? 120 : 160;

  const pick = (choice: OnboardingChoice) => {
    const startLevelId = CHOICES.find((c) => c.value === choice)!.levelId;
    phCapture('onboarding_choice', { choice, level_id: startLevelId });
    persistOnboarding({ startLevelId, choice, completedAt: Date.now() });
    onDone({ startLevelId, choice });
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--page)',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div
        style={{
          padding: mobile ? '12px 18px' : '20px 36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <Brand />
        <Bean tone="ghost" size="sm" onClick={onSkip}>browse lessons</Bean>
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: mobile ? '8px 18px' : '24px 40px',
          gap: mobile ? 14 : 22,
          minHeight: 0,
        }}
      >
        <div
          className="fx-mascot-enter"
          style={{
            width: mascotSize,
            height: mascotSize,
            borderRadius: '50%',
            background: TONE.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <img
            src={`${import.meta.env.BASE_URL}brand/mascots/${MASCOT}/portrait.png`}
            alt={MASCOT}
            style={{ width: '92%', height: '92%', objectFit: 'contain' }}
          />
        </div>

        <ChoiceBubble
          mobile={mobile}
          tone={TONE}
          question="Hey, I'm Fable. Where should we start?"
          hint="Free, no signup. Turn your sound on — your first question is one tap away."
          options={CHOICES}
          onPick={pick}
        />
      </div>
    </div>
  );
}

function Bubble({
  children, mobile, fullWidth,
}: {
  children: React.ReactNode;
  mobile: boolean;
  fullWidth?: boolean;
}) {
  return (
    <div
      className="fx-fade-up"
      style={{
        width: '100%',
        maxWidth: fullWidth ? 620 : 520,
        background: 'var(--card)',
        border: '1.5px solid var(--hairline)',
        borderRadius: 20,
        padding: mobile ? '16px 16px 18px' : '22px 26px 24px',
        boxShadow: 'var(--sh-sm)',
        display: 'flex',
        flexDirection: 'column',
        gap: mobile ? 10 : 12,
      }}
    >
      {children}
    </div>
  );
}

function ChoiceBubble<T extends string>({
  mobile, tone, question, hint, options, onPick,
}: {
  mobile: boolean;
  tone: { bg: string; ink: string; accent: string };
  question: string;
  hint?: string;
  options: Array<{ value: T; label: string; desc: string }>;
  onPick: (v: T) => void;
}) {
  return (
    <Bubble mobile={mobile}>
      <div
        style={{
          fontFamily: 'var(--disp)',
          fontSize: mobile ? 19 : 24,
          fontWeight: 600,
          lineHeight: 1.25,
          color: 'var(--ink-1)',
        }}
      >
        {question}
      </div>
      {hint && (
        <div style={{ fontSize: mobile ? 13 : 14, color: 'var(--ink-2)', marginBottom: 4 }}>
          {hint}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onPick(o.value)}
            style={{
              padding: mobile ? '12px 14px' : '14px 16px',
              borderRadius: 14,
              background: 'var(--page-2)',
              border: '1.5px solid var(--hairline)',
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: 'var(--ui)',
              transition: 'all 160ms',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = tone.bg;
              e.currentTarget.style.borderColor = tone.accent;
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--page-2)';
              e.currentTarget.style.borderColor = 'var(--hairline)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{ fontSize: mobile ? 15 : 16, fontWeight: 600, color: 'var(--ink-1)' }}>
              {o.label}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>{o.desc}</div>
          </button>
        ))}
      </div>
    </Bubble>
  );
}
