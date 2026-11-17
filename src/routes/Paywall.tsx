import { useEffect, useRef } from 'react';
import { Check } from 'lucide-react';
import { useBreakpoint } from '../lib/useBreakpoint';
import { Bean, Brand, ColorPill } from '../components/primitives';
import { phCapture } from '../lib/posthog';

export type PaywallTrigger = 'advanced-segment' | 'manual';
export type PlanId = 'free' | 'pro';

/** A message shown under a plan's button, in place of a browser pop-up. */
export interface PaywallNotice {
  plan: PlanId;
  tone: 'info' | 'error';
  title: string;
  body: string;
}

interface Props {
  trigger: PaywallTrigger;
  currentPlan: PlanId;
  onSelect: (plan: PlanId) => void;
  onDismiss: () => void;
  notice?: PaywallNotice | null;
  /** The iOS app, where people can buy without an account, must offer this. */
  onRestore?: () => void;
  /** Who bills: Stripe on the web, Apple in the iOS app. */
  billingNote?: string;
}

interface Plan {
  id: PlanId;
  name: string;
  price: string;
  priceNote: string;
  color: string;
  ink: string;
  features: string[];
  highlight?: boolean;
  badge?: string;
  /** The full price, shown crossed out beside a discounted `price`. */
  listPrice?: string;
  cta: string;
}

// What each plan includes. Keep this, the Settings and Stats upsells, UpsellCard, and the
// fifths.io pricing copy (site/index.html, blog posts) in step whenever a lesson or
// feature moves between free and Pro. See "Free and Pro copy" in AGENTS.md.
const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    priceNote: 'forever',
    color: 'var(--page-2)',
    ink: 'var(--ink-1)',
    features: [
      'Foundations, singing, tonality and scale degrees',
      'Every interval, harmonic and melodic',
      'Major and minor chords',
      'Rhythm basics',
      'Reviews of the items you miss',
      'Last 7 days of stats',
      'Progress saved to your account',
    ],
    cta: 'free forever',
  },
  {
    // One plan: monthly, cancel any time. The list price is $9.99, shown crossed out
    // beside the $4.99 launch price (the user's call, 2026-11-10). It's real: the product
    // is $9.99 in RevenueCat and checkout applies LAUNCH_DISCOUNT_CODE (billing.ts), $5.00
    // off forever. Ending the launch price changes both. See "Free and Pro copy" in AGENTS.md.
    id: 'pro',
    name: 'Pro',
    price: '$4.99',
    priceNote: 'per month · cancel any time',
    color: 'var(--coral)',
    ink: 'var(--coral-ink)',
    features: [
      'Everything in Free',
      'More chords: diminished, inversions and sevenths',
      'Cadences, progressions and jazz harmony',
      'All seven modes, bright to dark',
      'Melodic dictation',
      'Custom drills: save your own, or drill what you just missed',
      'Advanced rhythm: subdivisions, meter, dictation',
      'Your full stats history',
    ],
    listPrice: '$9.99',
    highlight: true,
    badge: 'launch discount',
    cta: 'subscribe',
  },
];

function triggerCopy(trigger: PaywallTrigger): { title: string; sub: string } {
  switch (trigger) {
    case 'advanced-segment':
      return {
        title: 'This lesson is in Pro.',
        sub: 'Seventh chords, progressions, modes and dictation unlock with Pro. Everything you\'ve done carries over.',
      };
    default:
      return {
        title: 'Free, or Pro.',
        sub: 'Free trains your ear for notes, intervals, keys and major and minor chords. Pro adds seventh chords, progressions, modes, dictation and custom practice, now half price at launch.',
      };
  }
}

export default function Paywall({ trigger, currentPlan, onSelect, onDismiss, notice, onRestore, billingNote = 'billing powered by stripe · cancel any time · no hidden fees' }: Props) {
  const mobile = useBreakpoint() !== 'desktop';
  const noticeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (notice) noticeRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }, [notice]);

  const copy = triggerCopy(trigger);
  const plans = PLANS;

  useEffect(() => {
    phCapture('paywall_viewed', { trigger, current_plan: currentPlan });
  }, [trigger, currentPlan]);

  const handleSelect = (plan: PlanId) => {
    phCapture('paywall_plan_selected', { plan, trigger, current_plan: currentPlan });
    onSelect(plan);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--page)', overflow: 'auto' }}>
      <div
        style={{
          padding: mobile ? '12px 22px' : '22px 44px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Brand />
        <button
          onClick={onDismiss}
          aria-label="Close"
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: 'var(--page-2)',
            border: 'none',
            fontSize: 16,
            color: 'var(--ink-2)',
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ padding: mobile ? '0 22px 40px' : '0 44px 60px', maxWidth: 1100, margin: '0 auto' }}>
        <ColorPill tone="coral" style={{ marginBottom: 14 }}>
          pricing
        </ColorPill>
        <h1
          style={{
            fontFamily: 'var(--disp)',
            fontSize: mobile ? 30 : 48,
            fontWeight: 600,
            letterSpacing: -0.02,
            lineHeight: 1.05,
            margin: '0 0 10px',
          }}
        >
          {copy.title.split(' ').slice(0, -1).join(' ')}{' '}
          <span style={{ fontStyle: 'italic', color: 'var(--coral-ink)' }}>{copy.title.split(' ').slice(-1)}</span>
        </h1>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', margin: '0 0 30px', maxWidth: 560, lineHeight: 1.5 }}>
          {copy.sub}
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: mobile ? '1fr' : `repeat(${plans.length}, 1fr)`,
            gap: mobile ? 12 : 18,
          }}
        >
          {plans.map((p) => {
            const isCurrent = currentPlan === p.id;
            return (
              <div
                key={p.id}
                style={{
                  background: p.highlight ? p.color : 'var(--card)',
                  border: `2px solid ${p.highlight ? 'var(--ink-1)' : 'var(--hairline)'}`,
                  borderRadius: 28,
                  padding: mobile ? 22 : 28,
                  position: 'relative',
                  boxShadow: p.highlight
                    ? '0 6px 0 var(--ink-1), 0 16px 40px rgba(42,29,58,0.14)'
                    : 'var(--sh-sm)',
                }}
              >
                {(p.highlight || p.badge) && (
                  <div
                    style={{
                      position: 'absolute',
                      top: -14,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      padding: '4px 12px',
                      background: 'var(--ink-1)',
                      color: 'var(--page)',
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: 0.3,
                      textTransform: 'uppercase',
                      borderRadius: 999,
                      fontFamily: 'var(--ui)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {p.badge ?? 'most popular'}
                  </div>
                )}
                <div
                  style={{
                    fontFamily: 'var(--disp)',
                    fontSize: 28,
                    fontWeight: 600,
                    fontStyle: 'italic',
                    color: p.highlight ? 'var(--ink-1)' : p.ink,
                  }}
                >
                  {p.name}
                </div>
                <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 8 }}>
                  {p.listPrice && (
                    <s
                      aria-label={`was ${p.listPrice}`}
                      style={{ fontFamily: 'var(--disp)', fontSize: 26, fontWeight: 600, color: 'var(--ink-1)', opacity: 0.55 }}
                    >
                      {p.listPrice}
                    </s>
                  )}
                  <span
                    style={{
                      fontFamily: 'var(--disp)',
                      fontSize: 42,
                      fontWeight: 700,
                      color: 'var(--ink-1)',
                      letterSpacing: -0.02,
                    }}
                  >
                    {p.price}
                  </span>
                  <span style={{ fontSize: 12, whiteSpace: 'nowrap', color: p.highlight ? 'var(--ink-1)' : 'var(--ink-3)' }}>
                    {p.priceNote}
                  </span>
                </div>
                <ul
                  style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: '18px 0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  {p.features.map((f) => (
                    <li
                      key={f}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 8,
                        fontSize: 13,
                        color: 'var(--ink-1)',
                        lineHeight: 1.4,
                      }}
                    >
                      <Check size={14} strokeWidth={3} color="var(--mint-ink)" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Bean
                  tone={isCurrent ? 'soft' : p.highlight ? 'ink' : 'coral'}
                  size="md"
                  style={{ width: '100%', justifyContent: 'center' }}
                  disabled={isCurrent}
                  onClick={() => handleSelect(p.id)}
                >
                  {isCurrent ? 'current plan' : p.cta}
                </Bean>
                {notice?.plan === p.id && (
                  <div
                    ref={noticeRef}
                    role={notice.tone === 'error' ? 'alert' : 'status'}
                    style={{
                      marginTop: 14,
                      padding: '14px 16px',
                      background: 'var(--card)',
                      border: `2px solid ${notice.tone === 'error' ? 'var(--coral-ink)' : 'var(--ink-1)'}`,
                      borderRadius: 18,
                      color: 'var(--ink-1)',
                      fontSize: 13,
                      lineHeight: 1.45,
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{notice.title}</div>
                    <div style={{ color: 'var(--ink-2)', overflowWrap: 'anywhere' }}>{notice.body}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p
          style={{
            marginTop: 36,
            fontSize: 12,
            color: 'var(--ink-3)',
            fontFamily: 'var(--mono)',
            textAlign: 'center',
          }}
        >
          {billingNote}
        </p>
        {onRestore && (
          <div style={{ textAlign: 'center', marginTop: 10 }}>
            <button
              type="button"
              onClick={onRestore}
              style={{
                background: 'none',
                border: 'none',
                padding: 8,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--ink-2)',
                textDecoration: 'underline',
                textUnderlineOffset: 3,
              }}
            >
              restore purchases
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
