import { useState } from 'react';
import { useBreakpoint } from '../lib/useBreakpoint';
import { Bean, Brand, ColorPill } from '../components/primitives';
import DesktopSidebar, { SidebarTab } from '../components/DesktopSidebar';
import { SYNTH_CATALOG, SynthType } from '../audioEngine';
import { ThemePreference } from '../lib/theme';
import type { SyncState } from '../lib/syncEngine';
import { DegreeNotation, DEFAULT_DEGREE_NOTATION, DEGREE_NOTATION_LABELS } from '../lib/degreeNotation';
import { isAnalyticsOptedOut, setAnalyticsOptOut } from '../lib/posthog';

export type Preset = 'beginner' | 'balanced' | 'studio';

export type VoiceRange = 'higher' | 'mixed' | 'lower';
export type SingDifficulty = 'strict' | 'standard' | 'forgiving';

export interface SettingsState {
  synth: SynthType;
  playbackSpeed: number;
  drone: boolean;
  autoPlay: boolean;
  voiceRange?: VoiceRange; // Optional: only used by sing-mode lessons. Undefined = 'mixed'.
  singDifficulty?: SingDifficulty; // User-level tolerance adjustment. Undefined = 'standard'.
  degreeNotation?: DegreeNotation; // How scale-degree answers are labeled. Undefined = 'roman'.
}

export const DEFAULT_VOICE_RANGE: VoiceRange = 'mixed';
export const DEFAULT_SING_DIFFICULTY: SingDifficulty = 'standard';

// Cents added/removed from a lesson's baseline singToleranceCents.
const TOLERANCE_ADJUST: Record<SingDifficulty, number> = {
  strict: -20,
  standard: 0,
  forgiving: 25,
};

// Final tolerance a sing prompt should use, given lesson baseline + user preference.
export function effectiveSingTolerance(
  lessonCents: number | undefined,
  difficulty: SingDifficulty | undefined,
): number {
  const base = lessonCents ?? 50;
  const adj = TOLERANCE_ADJUST[difficulty ?? DEFAULT_SING_DIFFICULTY];
  return Math.max(15, base + adj);
}

// Comfortable spoken/sung pitch pools for each voice range.
// Used by sing-back lessons so we don't ask a bass to sing C5.
export const VOICE_RANGE_NOTES: Record<VoiceRange, string[]> = {
  higher: ['D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'],
  mixed: ['A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4'],
  lower: ['F3', 'G3', 'A3', 'B3', 'C4', 'D4', 'E4'],
};

// Comfortable starting octave for a melodic sequence (CDCBC etc.).
// Lower voices get the phrase one octave down so they can sing at pitch without octave-jumping.
export const VOICE_RANGE_BASE_OCTAVE: Record<VoiceRange, number> = {
  higher: 4,
  mixed: 4,
  lower: 3,
};

export const VOICE_RANGE_LABELS: Record<VoiceRange, string> = {
  higher: 'higher',
  mixed: 'mixed',
  lower: 'lower',
};

const PRESETS: Record<
  Preset,
  { label: string; desc: string; color: string; ink: string; blob: string; state: SettingsState }
> = {
  beginner: {
    label: 'Beginner',
    desc: 'Slow piano, drone on, generous replays.',
    color: 'var(--mint)',
    ink: 'var(--mint-ink)',
    blob: 'var(--mint)',
    state: { synth: 'piano', playbackSpeed: 0.75, drone: true, autoPlay: true },
  },
  balanced: {
    label: 'Balanced',
    desc: 'Piano at tempo, drone off, autoplay on.',
    color: 'var(--lav)',
    ink: 'var(--lav-ink)',
    blob: 'var(--lav)',
    state: { synth: 'piano', playbackSpeed: 1, drone: false, autoPlay: true },
  },
  studio: {
    label: 'Studio',
    desc: 'Sine at tempo, no drone, no autoplay.',
    color: 'var(--coral)',
    ink: 'var(--coral-ink)',
    blob: 'var(--coral)',
    state: { synth: 'sine', playbackSpeed: 1.25, drone: false, autoPlay: false },
  },
};

interface Props {
  settings: SettingsState;
  onChange: (s: SettingsState) => void;
  onResetProgress: () => void;
  onBack: () => void;
  onNavigate?: (tab: SidebarTab) => void;
  onOpenPaywall?: () => void;
  bottomPadding?: number;
  theme?: ThemePreference;
  onThemeChange?: (t: ThemePreference) => void;
  debugMode?: boolean;
  onToggleDebug?: () => void;
  syncState?: SyncState;
  userEmail?: string | null;
  onOpenAuth?: () => void;
  onSignOut?: () => void;
  onSyncNow?: () => void;
  isPro?: boolean;
}

function matchesPreset(s: SettingsState): Preset | null {
  for (const [key, p] of Object.entries(PRESETS)) {
    const ps = p.state;
    if (
      ps.synth === s.synth &&
      ps.playbackSpeed === s.playbackSpeed &&
      ps.drone === s.drone &&
      ps.autoPlay === s.autoPlay
    ) {
      return key as Preset;
    }
  }
  return null;
}

export default function Settings({
  settings,
  onChange,
  onResetProgress,
  onBack,
  onNavigate,
  onOpenPaywall,
  bottomPadding = 0,
  theme = 'system',
  onThemeChange,
  debugMode,
  onToggleDebug,
  syncState = 'disabled',
  userEmail = null,
  onOpenAuth,
  onSignOut,
  onSyncNow,
  isPro = false,
}: Props) {
  const showDevSection = true;
  const mobile = useBreakpoint() !== 'desktop';
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [resetArmed, setResetArmed] = useState(false);
  const [analyticsOff, setAnalyticsOff] = useState(isAnalyticsOptedOut());

  const activePreset = matchesPreset(settings);

  return (
    <div
      style={{
        height: mobile ? undefined : '100vh',
        minHeight: mobile ? '100vh' : undefined,
        display: 'flex',
        flexDirection: mobile ? 'column' : 'row',
        background: 'var(--page)',
      }}
    >
      {!mobile && onNavigate && <DesktopSidebar active="settings" onNavigate={onNavigate} />}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: mobile ? 'visible' : 'auto',
          minWidth: 0,
        }}
      >
        {mobile && (
          <div
            style={{
              padding: '12px 22px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Brand />
            <Bean tone="ghost" size="sm" onClick={onBack}>
              ← back
            </Bean>
          </div>
        )}
      <div
        style={{
          padding: mobile ? `0 22px ${40 + bottomPadding}px` : '32px 44px 40px',
          maxWidth: 1100,
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <ColorPill tone="lav" style={{ marginBottom: 14 }}>
          settings
        </ColorPill>
        <h1
          style={{
            fontFamily: 'var(--disp)',
            fontSize: mobile ? 30 : 44,
            fontWeight: 600,
            letterSpacing: -0.02,
            margin: '0 0 24px',
          }}
        >
          Pick a <span style={{ fontStyle: 'italic', color: 'var(--coral-ink)' }}>preset</span>.
        </h1>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: mobile ? '1fr' : 'repeat(3, 1fr)',
            gap: 14,
            marginBottom: 24,
          }}
        >
          {(Object.keys(PRESETS) as Preset[]).map((key) => {
            const p = PRESETS[key];
            const active = activePreset === key;
            return (
              <button
                key={key}
                onClick={() => onChange(p.state)}
                style={{
                  textAlign: 'left',
                  background: active ? p.color : 'var(--card)',
                  border: `2px solid ${active ? 'var(--ink-1)' : 'var(--hairline)'}`,
                  borderRadius: 24,
                  padding: 22,
                  cursor: 'pointer',
                  boxShadow: active ? '0 6px 0 var(--ink-1), 0 10px 24px rgba(42,29,58,0.12)' : 'var(--sh-sm)',
                  transition: 'all 160ms',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--disp)',
                    fontSize: 24,
                    fontWeight: 600,
                    fontStyle: 'italic',
                    color: active ? 'var(--ink-1)' : p.ink,
                  }}
                >
                  {p.label}
                </div>
                <div style={{ fontSize: 13, color: active ? 'var(--ink-1)' : 'var(--ink-2)', marginTop: 6, lineHeight: 1.5 }}>
                  {p.desc}
                </div>
              </button>
            );
          })}
        </div>

        {/* Cloud sync */}
        {syncState !== 'disabled' && (
          <div
            style={{
              background: 'var(--card)',
              borderRadius: 22,
              border: '1px solid var(--hairline)',
              padding: '18px 22px',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ minWidth: 0, flex: '1 1 220px' }}>
              <div
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 11,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  color: 'var(--ink-3)',
                  marginBottom: 4,
                }}
              >
                cloud sync
              </div>
              <div
                style={{
                  fontFamily: 'var(--disp)',
                  fontStyle: 'italic',
                  fontSize: 18,
                  fontWeight: 600,
                  color: 'var(--ink-1)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {userEmail ?? 'sync your practice across devices'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 2 }}>
                {syncState === 'signed_out' && 'magic link sign-in · no password'}
                {syncState === 'syncing' && 'syncing…'}
                {syncState === 'idle' && 'up to date'}
                {syncState === 'error' && 'sync failed — will retry on next change'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {syncState === 'signed_out' && onOpenAuth && (
                <Bean tone="mint" size="sm" onClick={onOpenAuth}>
                  sign in
                </Bean>
              )}
              {syncState !== 'signed_out' && onSyncNow && (
                <Bean tone="ghost" size="sm" onClick={onSyncNow}>
                  sync now
                </Bean>
              )}
              {syncState !== 'signed_out' && onSignOut && (
                <Bean tone="ghost" size="sm" onClick={onSignOut}>
                  sign out
                </Bean>
              )}
            </div>
          </div>
        )}

        {/* Fine-tune */}
        <div
          style={{
            background: 'var(--card)',
            borderRadius: 22,
            border: '1px solid var(--hairline)',
            overflow: 'hidden',
          }}
        >
          <button
            onClick={() => setAdvancedOpen((v) => !v)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '18px 22px',
              border: 'none',
              background: 'transparent',
              fontFamily: 'var(--disp)',
              fontStyle: 'italic',
              fontWeight: 600,
              fontSize: 18,
              cursor: 'pointer',
              color: 'var(--ink-1)',
            }}
          >
            <span>fine tune</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)' }}>
              {advancedOpen ? '−' : '+'}
            </span>
          </button>
          {advancedOpen && (
            <div style={{ padding: '0 22px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Row label="instrument">
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: mobile ? 'repeat(3, 1fr)' : 'repeat(4, auto)',
                    gap: 6,
                    minWidth: 0,
                  }}
                >
                  {SYNTH_CATALOG.filter((s) => !s.hidden).map((s) => {
                    const active = settings.synth === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => onChange({ ...settings, synth: s.id as SynthType })}
                        style={{
                          padding: '7px 10px',
                          borderRadius: 10,
                          border: `1.5px solid ${active ? 'var(--ink-1)' : 'var(--hairline)'}`,
                          background: active ? 'var(--ink-1)' : 'var(--card)',
                          color: active ? 'var(--page)' : 'var(--ink-1)',
                          fontSize: 12,
                          fontWeight: 600,
                          fontFamily: 'var(--disp)',
                          fontStyle: 'italic',
                          cursor: 'pointer',
                          textAlign: 'center',
                          position: 'relative',
                          whiteSpace: 'nowrap',
                        }}
                        title={s.needsSamples ? `${s.label} — downloads samples on first use` : s.label}
                      >
                        {s.label}
                        {s.needsSamples && (
                          <span
                            aria-hidden
                            style={{
                              marginLeft: 5,
                              fontSize: 9,
                              opacity: 0.55,
                              fontStyle: 'normal',
                            }}
                          >
                            ↓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </Row>
              <Row label="speed">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Bean
                    tone="soft"
                    size="sm"
                    onClick={() => onChange({ ...settings, playbackSpeed: Math.max(0.5, settings.playbackSpeed - 0.25) })}
                  >
                    −
                  </Bean>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 13, minWidth: 50, textAlign: 'center' }}>
                    {settings.playbackSpeed.toFixed(2)}×
                  </span>
                  <Bean
                    tone="soft"
                    size="sm"
                    onClick={() => onChange({ ...settings, playbackSpeed: Math.min(2, settings.playbackSpeed + 0.25) })}
                  >
                    +
                  </Bean>
                </div>
              </Row>
              <Row label="drone">
                <Bean
                  tone={settings.drone ? 'mint' : 'soft'}
                  size="sm"
                  onClick={() => onChange({ ...settings, drone: !settings.drone })}
                >
                  {settings.drone ? 'on' : 'off'}
                </Bean>
              </Row>
              <Row label="autoplay question">
                <Bean
                  tone={settings.autoPlay ? 'mint' : 'soft'}
                  size="sm"
                  onClick={() => onChange({ ...settings, autoPlay: !settings.autoPlay })}
                >
                  {settings.autoPlay ? 'on' : 'off'}
                </Bean>
              </Row>
              <Row label="sing-back range">
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['lower', 'mixed', 'higher'] as VoiceRange[]).map((r) => (
                    <Bean
                      key={r}
                      tone={(settings.voiceRange ?? DEFAULT_VOICE_RANGE) === r ? 'ink' : 'soft'}
                      size="sm"
                      onClick={() => onChange({ ...settings, voiceRange: r })}
                    >
                      {r}
                    </Bean>
                  ))}
                </div>
              </Row>
              <Row label="sing-back difficulty">
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['forgiving', 'standard', 'strict'] as SingDifficulty[]).map((d) => (
                    <Bean
                      key={d}
                      tone={(settings.singDifficulty ?? DEFAULT_SING_DIFFICULTY) === d ? 'ink' : 'soft'}
                      size="sm"
                      onClick={() => onChange({ ...settings, singDifficulty: d })}
                    >
                      {d}
                    </Bean>
                  ))}
                </div>
              </Row>
              <Row label="scale-degree style">
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['roman', 'number', 'solfege'] as DegreeNotation[]).map((n) => (
                    <Bean
                      key={n}
                      tone={(settings.degreeNotation ?? DEFAULT_DEGREE_NOTATION) === n ? 'ink' : 'soft'}
                      size="sm"
                      onClick={() => onChange({ ...settings, degreeNotation: n })}
                    >
                      {DEGREE_NOTATION_LABELS[n]}
                    </Bean>
                  ))}
                </div>
              </Row>
            </div>
          )}
        </div>

        {/* Theme */}
        {onThemeChange && (
          <div
            style={{
              marginTop: 18,
              padding: '18px 22px',
              background: 'var(--card)',
              borderRadius: 22,
              border: '1px solid var(--hairline)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 14,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div style={{ fontFamily: 'var(--disp)', fontStyle: 'italic', fontSize: 18, fontWeight: 600, color: 'var(--ink-1)' }}>
                theme
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 2 }}>
                light, dark, or follow your device.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['light', 'dark'] as const).map((opt) => (
                <Bean
                  key={opt}
                  tone={theme === opt ? 'ink' : 'soft'}
                  size="sm"
                  onClick={() => onThemeChange(opt)}
                >
                  {opt}
                </Bean>
              ))}
            </div>
          </div>
        )}

        {isPro ? (
          <div
            style={{
              marginTop: 24,
              padding: '18px 22px',
              background: 'var(--mint-soft)',
              color: 'var(--mint-ink)',
              borderRadius: 22,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div style={{ fontFamily: 'var(--disp)', fontStyle: 'italic', fontSize: 18, fontWeight: 600 }}>
                Fifths Pro · active
              </div>
              <div style={{ fontSize: 13, opacity: 0.9, marginTop: 2 }}>
                thanks for supporting the build
              </div>
            </div>
            {onOpenPaywall && (
              <Bean tone="ghost" size="sm" onClick={onOpenPaywall}>
                manage plan
              </Bean>
            )}
          </div>
        ) : onOpenPaywall ? (
          <div
            style={{
              marginTop: 24,
              padding: '18px 22px',
              background: 'var(--coral)',
              color: '#fff',
              borderRadius: 22,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div style={{ fontFamily: 'var(--disp)', fontStyle: 'italic', fontSize: 18, fontWeight: 600 }}>
                on the free plan
              </div>
              <div style={{ fontSize: 13, opacity: 0.9, marginTop: 2 }}>
                go unlimited from $4.99/mo · cancel anytime
              </div>
            </div>
            <Bean tone="ink" size="sm" onClick={onOpenPaywall}>
              see plans →
            </Bean>
          </div>
        ) : null}

        {showDevSection && onToggleDebug && (
          <div style={{ marginTop: 24, padding: '18px 22px', background: 'var(--card)', border: '1px dashed var(--ink-3)', borderRadius: 22 }}>
            <div style={{ fontFamily: 'var(--disp)', fontStyle: 'italic', fontSize: 16, fontWeight: 600, color: 'var(--ink-1)' }}>
              dev
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', margin: '6px 0 12px' }}>
              unlocks every lesson ignoring prerequisites. toggle with cmd/ctrl+k.
            </div>
            <Row label="unlock all lessons">
              <Bean tone={debugMode ? 'ink' : 'soft'} size="sm" onClick={onToggleDebug}>
                {debugMode ? 'on' : 'off'}
              </Bean>
            </Row>
          </div>
        )}

        <div style={{ marginTop: 24, padding: '18px 22px', background: 'var(--card)', borderRadius: 22, border: '1px solid var(--hairline)' }}>
          <div style={{ fontFamily: 'var(--disp)', fontStyle: 'italic', fontSize: 18, fontWeight: 600, color: 'var(--ink-1)' }}>
            privacy
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-2)', margin: '6px 0 12px' }}>
            anonymous product analytics help us see which lessons trip people up. no IPs, no input recording, opt out anytime.
          </div>
          <Row label="anonymous analytics">
            <Bean
              tone={analyticsOff ? 'soft' : 'mint'}
              size="sm"
              onClick={() => {
                const next = !analyticsOff;
                setAnalyticsOptOut(next);
                setAnalyticsOff(next);
              }}
            >
              {analyticsOff ? 'off' : 'on'}
            </Bean>
          </Row>
        </div>

        <div style={{ marginTop: 32, padding: '18px 22px', background: 'var(--coral-soft)', borderRadius: 22 }}>
          <div style={{ fontFamily: 'var(--disp)', fontStyle: 'italic', fontSize: 16, fontWeight: 600, color: 'var(--coral-ink)' }}>
            danger zone
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-2)', margin: '6px 0 12px' }}>
            resets every completed level and starts the curriculum over.
          </div>
          {!resetArmed ? (
            <Bean tone="soft" size="md" onClick={() => setResetArmed(true)}>
              reset progress
            </Bean>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <Bean tone="coral" size="md" onClick={() => { onResetProgress(); setResetArmed(false); }}>
                yes — reset
              </Bean>
              <Bean tone="soft" size="md" onClick={() => setResetArmed(false)}>
                cancel
              </Bean>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
      <div style={{ color: 'var(--ink-1)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, fontSize: 12 }}>
        {label}
      </div>
      {children}
    </div>
  );
}
