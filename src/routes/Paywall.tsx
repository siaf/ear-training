import { useEffect } from 'react';
import { Check } from 'lucide-react';
import { useBreakpoint } from '../lib/useBreakpoint';
import { Bean, Brand, ColorPill } from '../components/primitives';
import { isNative } from '../lib/native';
import { phCapture } from '../lib/posthog';

export type PaywallTrigger = 'session-ceiling' | 'advanced-segment' | 'manual';
export type PlanId = 'free' | 'pro' | 'studio' | 'lifetime';

interface Props {
  trigger: PaywallTrigger;
  currentPlan: PlanId;
  onSelect: (plan: PlanId) => void;
  onDismiss: () => void;
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
  cta: string;
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    priceNote: 'forever',
    color: 'var(--page-2)',
    ink: 'var(--ink-1)',
    features: [
      'Foundations, tonality, scale degrees',
      'Basic intervals (3rds, 4ths, 5ths)',
      'Last 7 days of analytics',
      'Progress saved to your account',
    ],
    cta: 'free forever',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$4.99',
    priceNote: 'per month',
    color: 'var(--coral)',
    ink: 'var(--coral-ink)',
    features: [
      'Pro lessons (triads, 7ths, 6ths)',
      'Full analytics history',
      'Weak-item auto-drills',
    ],
    highlight: true,
    cta: 'subscribe',
  },
  {
    id: 'studio',
    name: 'Pro Annual',
    price: '$39.99',
    priceNote: 'per year · save 33%',
    color: 'var(--lav)',
    ink: 'var(--lav-ink)',
    features: [
      'Everything in Pro',
      'Two months free',
      'Locked-in price for the year',
      'Best value if you stick with it',
    ],
    cta: 'subscribe',
  },
  {
    // The offer has to be real: at 100 sales, raise fifths_lifetime to $19.99 in
    // RevenueCat and update this card, PRODUCT_VALUE_USD and the site copy.
    id: 'lifetime',
    name: 'Lifetime',
    price: '$9.99',
    priceNote: 'one-time',
    color: 'var(--mint-soft)',
    ink: 'var(--mint-ink)',
    features: [
      'Everything in Pro, forever',
      'One payment, no subscription',
      'First 100 buyers, then $19.99',
    ],
    badge: 'launch offer',
    cta: 'buy once',
  },
];

function triggerCopy(trigger: PaywallTrigger): { title: string; sub: string } {
  switch (trigger) {
    case 'session-ceiling':
      return {
        title: 'Hit your weekly free sessions.',
        sub: 'You\'ve been putting in work. Go unlimited — your ear is just getting going.',
      };
    case 'advanced-segment':
      return {
        title: 'This segment is in the Pro tier.',
        sub: 'Triads and beyond unlock with Pro. Everything you\'ve done carries over.',
      };
    default:
      return {
        title: 'Pick the plan that fits.',
        sub: 'Free forever or go unlimited from $4.99/mo.',
      };
  }
}

export default function Paywall({ trigger, currentPlan, onSelect, onDismiss }: Props) {
  const mobile = useBreakpoint() !== 'desktop';

  const copy = triggerCopy(trigger);
  // Lifetime is sold on the web only, and not to anyone who already has Pro.
  const plans = PLANS.filter((p) => p.id !== 'lifetime' || (currentPlan === 'free' && !isNative()));

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
          billing powered by stripe · cancel any time · no hidden fees
        </p>
      </div>
    </div>
  );
}
