import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Play as PlayIcon } from 'lucide-react';
import { useBreakpoint } from '../lib/useBreakpoint';
import { Bean, Brand, useTicker } from '../components/primitives';
import {
  CalibrationRating,
  CalibrationPrompt,
  buildPrompts,
  calibrationToStartLevel,
} from '../lib/calibration';
import { audioEngine } from '../audioEngine';
import type { Mascot } from '../types';
import type { VoiceRange } from './Settings';

export type OnboardingExperience = 'none' | 'some' | 'lots';
export type OnboardingGoal = 'improvise' | 'sight_sing' | 'transcribe' | 'curious';

export interface OnboardingResult {
  startLevelId: string;
  voiceRange: VoiceRange;
  experience: OnboardingExperience;
  goal: OnboardingGoal;
}

interface PersistedOnboarding extends OnboardingResult {
  ratings: CalibrationRating[];
  completedAt: number;
}

const ONBOARDING_KEY = 'fifths.onboarding.v1';
function persistOnboarding(p: PersistedOnboarding) {
  try { localStorage.setItem(ONBOARDING_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

interface Props {
  onDone: (result: OnboardingResult) => void;
  onSkip: () => void;
}

const MASCOT_TONE: Record<Mascot, { bg: string; ink: string; accent: string }> = {
  fable: { bg: 'var(--coral-soft)',  ink: 'var(--coral-ink)',  accent: 'var(--coral)' },
  noir:  { bg: 'var(--mint-soft)',   ink: 'var(--mint-ink)',   accent: 'var(--mint)' },
  major: { bg: 'var(--butter-soft)', ink: 'var(--butter-ink)', accent: 'var(--butter)' },
  pulse: { bg: 'var(--sky-soft)',    ink: 'var(--sky-ink)',    accent: 'var(--sky)' },
};

type Step =
  | { kind: 'intro'; mascot: Mascot; lines: string[] }
  | { kind: 'experience'; mascot: Mascot }
  | { kind: 'voice'; mascot: Mascot }
  | { kind: 'goal'; mascot: Mascot }
  | { kind: 'rate'; mascot: Mascot; idx: number }
  | { kind: 'finish'; mascot: Mascot };

const STEPS: Step[] = [
  { kind: 'intro', mascot: 'fable', lines: [
    "Hey — I'm Fable.",
    "Welcome to Fifths. We're going to tune up your ear together.",
  ]},
  { kind: 'intro', mascot: 'fable', lines: [
    "First, three quick questions. Then I'll play a few sounds and you tell me what you hear.",
    "Two minutes, tops.",
  ]},
  { kind: 'experience', mascot: 'fable' },
  { kind: 'voice', mascot: 'fable' },
  { kind: 'goal', mascot: 'fable' },
  { kind: 'rate', mascot: 'fable', idx: 0 },
  { kind: 'rate', mascot: 'fable', idx: 1 },
  { kind: 'rate', mascot: 'fable', idx: 2 },
  { kind: 'rate', mascot: 'fable', idx: 3 },
  { kind: 'finish', mascot: 'fable' },
];

const EXPERIENCE_OPTS: Array<{ value: OnboardingExperience; label: string; desc: string }> = [
  { value: 'none', label: 'never really',  desc: 'totally new to ear training' },
  { value: 'some', label: 'a little',      desc: 'I know a few intervals or chords' },
  { value: 'lots', label: 'a lot',         desc: 'I read music or play seriously' },
];

const VOICE_OPTS: Array<{ value: VoiceRange; label: string; desc: string }> = [
  { value: 'higher', label: 'higher',         desc: 'soprano / alto / tenor' },
  { value: 'mixed',  label: 'in the middle',  desc: "not sure — start me here" },
  { value: 'lower',  label: 'lower',          desc: 'baritone / bass' },
];

const GOAL_OPTS: Array<{ value: OnboardingGoal; label: string; desc: string }> = [
  { value: 'improvise',  label: 'improvise',    desc: 'jam, solo, play by ear' },
  { value: 'sight_sing', label: 'sight-sing',   desc: 'sing what I see on a page' },
  { value: 'transcribe', label: 'transcribe',   desc: 'figure out songs by ear' },
  { value: 'curious',    label: 'just curious', desc: 'no particular goal yet' },
];

const RATING_OPTS: Array<{ n: CalibrationRating; label: string; desc: string; color: string }> = [
  { n: 1, label: "didn't hear two", desc: 'just noise',  color: 'var(--sky)' },
  { n: 2, label: 'maybe two',       desc: 'fuzzy',       color: 'var(--lav)' },
  { n: 3, label: 'distinct',        desc: 'but unsure',  color: 'var(--coral)' },
  { n: 4, label: 'clearly',         desc: 'close',       color: 'var(--butter)' },
  { n: 5, label: 'everything',      desc: 'wide apart',  color: 'var(--mint)' },
];

export default function Onboarding({ onDone, onSkip }: Props) {
  const mobile = useBreakpoint() !== 'desktop';
  const prompts = useMemo<CalibrationPrompt[]>(() => buildPrompts(), []);
  const t = useTicker(true);
  const pulse = 0.5 + 0.5 * Math.sin(t * 2.6);

  const [stepIdx, setStepIdx] = useState(0);
  const [experience, setExperience] = useState<OnboardingExperience | null>(null);
  const [voiceRange, setVoiceRange] = useState<VoiceRange | null>(null);
  const [goal, setGoal] = useState<OnboardingGoal | null>(null);
  const [ratings, setRatings] = useState<CalibrationRating[]>([]);
  const [playing, setPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);

  const step = STEPS[stepIdx];
  const tone = MASCOT_TONE[step.mascot];
  const mascotSrc = `${import.meta.env.BASE_URL}brand/mascots/${step.mascot}/portrait.png`;
  const mascotSize = mobile ? 120 : 160;

  const advance = () => setStepIdx((i) => Math.min(i + 1, STEPS.length - 1));
  const goBack = () => {
    if (stepIdx === 0) return;
    setHasPlayed(false);
    setStepIdx((i) => i - 1);
  };

  const finish = (finalRatings: CalibrationRating[]) => {
    const startLevelId = calibrationToStartLevel(finalRatings);
    const result: OnboardingResult = {
      startLevelId,
      voiceRange: voiceRange ?? 'mixed',
      experience: experience ?? 'some',
      goal: goal ?? 'curious',
    };
    persistOnboarding({ ...result, ratings: finalRatings, completedAt: Date.now() });
    onDone(result);
  };

  const playPrompt = async (idx: number) => {
    setPlaying(true);
    await audioEngine.initialize();
    try { await prompts[idx].play(); } catch { /* swallow */ }
    setPlaying(false);
    setHasPlayed(true);
  };

  const handleRate = (r: CalibrationRating) => {
    const next = [...ratings, r];
    setRatings(next);
    setHasPlayed(false);
    if (step.kind !== 'rate') return;
    if (step.idx + 1 >= prompts.length) {
      // After last rate step, advance to finish.
      setStepIdx((i) => i + 1);
    } else {
      setStepIdx((i) => i + 1);
    }
  };

  // Reset hasPlayed when entering a new rate step (back-nav case).
  useEffect(() => {
    if (step.kind === 'rate') setHasPlayed(false);
  }, [stepIdx, step.kind]);

  const total = STEPS.length;
  const progress = (stepIdx + (step.kind === 'finish' ? 1 : 0)) / total;

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
      {/* Top bar */}
      <div
        style={{
          padding: mobile ? '12px 18px' : '20px 36px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexShrink: 0,
        }}
      >
        <Brand />
        <div
          style={{
            flex: 1,
            height: 6,
            borderRadius: 3,
            background: 'var(--ink-5)',
            overflow: 'hidden',
            margin: '0 14px',
            maxWidth: 320,
          }}
        >
          <div
            style={{
              width: `${Math.round(progress * 100)}%`,
              height: '100%',
              background: tone.accent,
              transition: 'width 280ms cubic-bezier(0.2, 0.8, 0.2, 1)',
            }}
          />
        </div>
        <Bean tone="ghost" size="sm" onClick={onSkip}>skip</Bean>
      </div>

      {/* Mascot + bubble — re-keyed per step so animations replay */}
      <div
        key={stepIdx}
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
            background: tone.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <img
            src={mascotSrc}
            alt={step.mascot}
            style={{ width: '92%', height: '92%', objectFit: 'contain' }}
          />
        </div>

        <StepBody
          step={step}
          mobile={mobile}
          tone={tone}
          prompts={prompts}
          playing={playing}
          hasPlayed={hasPlayed}
          pulse={pulse}
          ratingsCount={ratings.length}
          onPlay={() => step.kind === 'rate' && playPrompt(step.idx)}
          onChooseExperience={(v) => { setExperience(v); advance(); }}
          onChooseVoice={(v) => { setVoiceRange(v); advance(); }}
          onChooseGoal={(v) => { setGoal(v); advance(); }}
          onRate={handleRate}
          onContinue={advance}
          onBegin={() => finish(ratings)}
        />
      </div>

      {/* Back button — only shown on intro/choice steps where it makes sense */}
      {stepIdx > 0 && step.kind !== 'finish' && step.kind !== 'rate' && (
        <div
          style={{
            padding: mobile ? '0 18px 16px' : '0 36px 24px',
            display: 'flex',
            justifyContent: 'flex-start',
            flexShrink: 0,
          }}
        >
          <Bean tone="ghost" size="sm" onClick={goBack}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <ArrowLeft size={14} strokeWidth={2.5} /> back
            </span>
          </Bean>
        </div>
      )}
    </div>
  );
}

interface StepBodyProps {
  step: Step;
  mobile: boolean;
  tone: { bg: string; ink: string; accent: string };
  prompts: CalibrationPrompt[];
  playing: boolean;
  hasPlayed: boolean;
  pulse: number;
  ratingsCount: number;
  onPlay: () => void;
  onChooseExperience: (v: OnboardingExperience) => void;
  onChooseVoice: (v: VoiceRange) => void;
  onChooseGoal: (v: OnboardingGoal) => void;
  onRate: (r: CalibrationRating) => void;
  onContinue: () => void;
  onBegin: () => void;
}

function StepBody({
  step, mobile, tone, prompts, playing, hasPlayed, pulse,
  onPlay, onChooseExperience, onChooseVoice, onChooseGoal, onRate, onContinue, onBegin,
}: StepBodyProps) {
  if (step.kind === 'intro') {
    return (
      <Bubble mobile={mobile}>
        {step.lines.map((line, i) => (
          <div
            key={i}
            style={{
              fontFamily: i === 0 ? 'var(--disp)' : 'var(--ui)',
              fontSize: i === 0 ? (mobile ? 22 : 28) : (mobile ? 14 : 16),
              fontWeight: i === 0 ? 600 : 500,
              color: i === 0 ? 'var(--ink-1)' : 'var(--ink-2)',
              lineHeight: 1.35,
            }}
          >
            {line}
          </div>
        ))}
        <div style={{ marginTop: mobile ? 6 : 10, alignSelf: 'flex-end' }}>
          <Bean tone="ink" size={mobile ? 'md' : 'lg'} onClick={onContinue}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              next <ArrowRight size={mobile ? 16 : 18} strokeWidth={2.5} />
            </span>
          </Bean>
        </div>
      </Bubble>
    );
  }

  if (step.kind === 'experience') {
    return (
      <ChoiceBubble
        mobile={mobile} tone={tone}
        question="How much ear training have you done?"
        hint="No wrong answer — just helps me start you in the right place."
        options={EXPERIENCE_OPTS}
        onPick={onChooseExperience}
      />
    );
  }
  if (step.kind === 'voice') {
    return (
      <ChoiceBubble
        mobile={mobile} tone={tone}
        question="When you sing along to music, what feels comfortable?"
        hint="Some lessons ask you to sing — we'll pick notes in your range."
        options={VOICE_OPTS}
        onPick={onChooseVoice}
      />
    );
  }
  if (step.kind === 'goal') {
    return (
      <ChoiceBubble
        mobile={mobile} tone={tone}
        question="What's pulling you here?"
        hint="Pick the closest one. You can change paths later."
        options={GOAL_OPTS}
        onPick={onChooseGoal}
      />
    );
  }

  if (step.kind === 'rate') {
    const prompt = prompts[step.idx];
    return (
      <Bubble mobile={mobile} fullWidth>
        <div
          style={{
            fontFamily: 'var(--ui)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: tone.ink,
          }}
        >
          listen · {step.idx + 1} / {prompts.length}
        </div>
        <div
          style={{
            fontFamily: 'var(--disp)',
            fontSize: mobile ? 19 : 24,
            fontWeight: 600,
            lineHeight: 1.25,
            color: 'var(--ink-1)',
          }}
        >
          {prompt.title}
        </div>
        <div style={{ fontSize: mobile ? 13 : 14, color: 'var(--ink-2)' }}>
          {prompt.hint}
        </div>

        <div
          style={{
            background: 'var(--page-2)',
            borderRadius: 18,
            padding: mobile ? '20px' : '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {(() => {
            const playSz = mobile ? 92 : 120;
            return (
              <div style={{ position: 'relative', width: playSz, height: playSz }}>
                {/* Outer expanding ring — fades as it grows so the eye tracks it */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    border: `2px solid ${tone.accent}`,
                    transform: `scale(${1 + pulse * 0.45})`,
                    opacity: hasPlayed ? 0.25 * (1 - pulse) : 1 - pulse,
                    pointerEvents: 'none',
                    transition: 'opacity 200ms',
                  }}
                />
                {/* Second ring offset in phase for a softer rhythm */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    border: `2px solid ${tone.accent}`,
                    transform: `scale(${1 + (1 - pulse) * 0.32})`,
                    opacity: hasPlayed ? 0.15 * pulse : 0.55 * pulse,
                    pointerEvents: 'none',
                    transition: 'opacity 200ms',
                  }}
                />
                <button
                  onClick={onPlay}
                  disabled={playing}
                  aria-label={hasPlayed ? 'Replay' : 'Play prompt'}
                  style={{
                    position: 'relative',
                    width: playSz,
                    height: playSz,
                    borderRadius: '50%',
                    background: 'var(--ink-1)',
                    color: 'var(--page)',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: playing ? 'wait' : 'pointer',
                    boxShadow: '0 14px 36px rgba(42,29,58,0.3)',
                    transform: `scale(${1 + pulse * 0.03})`,
                    transition: 'transform 120ms linear',
                  }}
                >
                  <PlayIcon
                    size={mobile ? 38 : 52}
                    strokeWidth={2}
                    fill="currentColor"
                    style={{ marginLeft: mobile ? 4 : 6 }}
                  />
                </button>
              </div>
            );
          })()}
        </div>

        <div
          style={{
            display: mobile ? 'flex' : 'grid',
            flexDirection: 'column',
            gap: 8,
            gridTemplateColumns: mobile ? undefined : 'repeat(5, 1fr)',
          }}
        >
          {RATING_OPTS.map((o) => (
            <button
              key={o.n}
              onClick={() => onRate(o.n)}
              disabled={!hasPlayed}
              style={{
                padding: mobile ? '10px 12px' : '14px 10px',
                borderRadius: mobile ? 14 : 16,
                background: hasPlayed ? o.color : 'var(--page-2)',
                border: `2px solid ${hasPlayed ? 'transparent' : 'var(--hairline)'}`,
                cursor: hasPlayed ? 'pointer' : 'not-allowed',
                opacity: hasPlayed ? 1 : 0.55,
                textAlign: mobile ? 'left' : 'center',
                display: mobile ? 'flex' : 'block',
                alignItems: 'center',
                gap: 12,
                fontFamily: 'var(--ui)',
                transition: 'all 160ms',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--disp)',
                  fontSize: mobile ? 18 : 26,
                  fontWeight: 600,
                  color: 'var(--ink-1)',
                  minWidth: mobile ? 22 : undefined,
                }}
              >
                {o.n}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-1)' }}>{o.label}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-2)' }}>{o.desc}</div>
              </div>
            </button>
          ))}
        </div>

        {!hasPlayed && (
          <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>▶ play first, then rate</div>
        )}
      </Bubble>
    );
  }

  // finish
  return (
    <Bubble mobile={mobile}>
      <div
        style={{
          fontFamily: 'var(--ui)',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          color: tone.ink,
        }}
      >
        all set
      </div>
      <div
        style={{
          fontFamily: 'var(--disp)',
          fontSize: mobile ? 22 : 30,
          fontWeight: 600,
          lineHeight: 1.2,
          color: 'var(--ink-1)',
        }}
      >
        Starting you at <span style={{ fontStyle: 'italic', color: tone.ink }}>the right spot</span>.
      </div>
      <div style={{ fontSize: mobile ? 13 : 14, color: 'var(--ink-2)' }}>
        You can always jump levels from the path.
      </div>
      <div style={{ marginTop: mobile ? 4 : 8, alignSelf: 'flex-end' }}>
        <Bean tone="coral" size={mobile ? 'md' : 'lg'} onClick={onBegin}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            begin <ArrowRight size={mobile ? 16 : 18} strokeWidth={2.5} />
          </span>
        </Bean>
      </div>
    </Bubble>
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
