import { useEffect, useState, type ReactNode } from 'react';
import { useBreakpoint } from '../lib/useBreakpoint';
import { Bean, Brand, ColorPill } from '../components/primitives';
import { getDisplayName } from '../curriculum';
import { CUSTOM_GROUPS, CUSTOM_LENGTHS, canStart, customGroup, type CustomSelection } from '../lib/customPractice';
import { phCapture } from '../lib/posthog';

const STORAGE_KEY = 'fifths.custom_practice.v1';

interface Props {
  isPro: boolean;
  onStart: (sel: CustomSelection) => void;
  onOpenPaywall: () => void;
  onExit: () => void;
}

function defaultSelection(groupId = CUSTOM_GROUPS[0].id): CustomSelection {
  const group = customGroup(groupId) ?? CUSTOM_GROUPS[0];
  return { groupId: group.id, variantIds: [group.variants[0].id], items: group.items.slice(0, 3), length: 10 };
}

function loadSelection(): CustomSelection {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as CustomSelection | null;
    if (saved && customGroup(saved.groupId)) return saved;
  } catch { /* fall through to the default */ }
  return defaultSelection();
}

function Chip({ on, onClick, children, label }: { on: boolean; onClick: () => void; children: ReactNode; label?: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      onClick={onClick}
      style={{
        minHeight: 40,
        padding: '8px 14px',
        borderRadius: 999,
        border: `2px solid ${on ? 'var(--ink-1)' : 'var(--hairline)'}`,
        background: on ? 'var(--ink-1)' : 'var(--card)',
        color: on ? 'var(--page)' : 'var(--ink-1)',
        font: '600 14px/1.2 var(--ui)',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginTop: 24 }}>
      <h2 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2, color: 'var(--ink-3)', margin: '0 0 10px' }}>
        {title}
      </h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{children}</div>
    </section>
  );
}

export default function CustomPractice({ isPro, onStart, onOpenPaywall, onExit }: Props) {
  const mobile = useBreakpoint() !== 'desktop';
  const [sel, setSel] = useState<CustomSelection>(loadSelection);
  const group = customGroup(sel.groupId) ?? CUSTOM_GROUPS[0];
  const ready = canStart(sel);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sel)); } catch { /* not saved; fine */ }
  }, [sel]);

  useEffect(() => { phCapture('custom_practice_opened', { is_pro: isPro }); }, [isPro]);

  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const start = () => {
    phCapture('custom_practice_started', {
      is_pro: isPro,
      group: sel.groupId,
      variants: sel.variantIds,
      item_count: sel.items.length,
      length: sel.length,
    });
    if (!isPro) { onOpenPaywall(); return; }
    onStart(sel);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--page)' }}>
      <div style={{ padding: mobile ? '12px 22px' : '22px 44px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Brand />
        <button
          onClick={onExit}
          aria-label="Close"
          style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--page-2)', border: 'none', fontSize: 16, color: 'var(--ink-2)', cursor: 'pointer' }}
        >
          ✕
        </button>
      </div>

      <div style={{ padding: mobile ? '0 22px 40px' : '0 44px 60px', maxWidth: 760, margin: '0 auto' }}>
        <ColorPill tone="lav" style={{ marginBottom: 14 }}>{isPro ? 'pro' : 'pro feature'}</ColorPill>
        <h1 style={{ fontFamily: 'var(--disp)', fontSize: mobile ? 30 : 44, fontWeight: 600, lineHeight: 1.05, margin: '0 0 8px' }}>
          Custom <span style={{ fontStyle: 'italic', color: 'var(--lav-ink)' }}>practice</span>
        </h1>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', margin: 0, lineHeight: 1.5 }}>
          Pick exactly what to drill: the two intervals you mix up, one kind of chord, the modes you can’t place.
        </p>

        <Section title="What to practise">
          {CUSTOM_GROUPS.map((g) => (
            <Chip key={g.id} on={g.id === sel.groupId} onClick={() => g.id !== sel.groupId && setSel({ ...defaultSelection(g.id), length: sel.length })}>
              {g.name}
            </Chip>
          ))}
        </Section>

        {group.variants.length > 1 && (
          <Section title={group.variantLabel ?? 'Played as'}>
            {group.variants.map((v) => (
              <Chip key={v.id} on={sel.variantIds.includes(v.id)} onClick={() => setSel({ ...sel, variantIds: toggle(sel.variantIds, v.id) })}>
                {v.label}
              </Chip>
            ))}
          </Section>
        )}

        <Section title={`Pick at least two · ${sel.items.filter((i) => group.items.includes(i)).length} chosen`}>
          {group.items.map((item) => (
            <Chip key={item} on={sel.items.includes(item)} onClick={() => setSel({ ...sel, items: toggle(sel.items, item) })}>
              {group.id === 'scale_degrees' ? `Degree ${item}` : getDisplayName(item)}
            </Chip>
          ))}
        </Section>

        <Section title="Questions">
          {CUSTOM_LENGTHS.map((n) => (
            <Chip key={n} on={sel.length === n} onClick={() => setSel({ ...sel, length: n })}>{n}</Chip>
          ))}
        </Section>

        <div style={{ marginTop: 32 }}>
          <Bean tone={isPro ? 'ink' : 'coral'} size="lg" disabled={!ready} onClick={start} style={{ width: '100%', justifyContent: 'center' }}>
            {isPro ? 'start practice' : 'unlock with pro'}
          </Bean>
          {!ready && (
            <p style={{ fontSize: 13, color: 'var(--ink-3)', textAlign: 'center', marginTop: 10 }}>
              Choose at least two {group.variants.length > 1 ? 'items and one way to play them' : 'items'}.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
