// Custom practice (Pro): the learner's saved drills, and an editor to make them.
// The list looks like the path (chunky coloured cards, a play button like a lesson node);
// the editor picks items on tiles shaped like the lesson's own answer tiles, each with a
// button to hear it, so building a drill feels like part of the lesson, not a form.

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  Check,
  Compass,
  Hash,
  Layers,
  Music3,
  Pencil,
  Piano,
  Play,
  Plus,
  Ruler,
  Trash2,
  Volume2,
  type LucideIcon,
} from 'lucide-react';
import { useBreakpoint } from '../lib/useBreakpoint';
import Mascot from '../components/Mascot';
import { Bean, Blob, Brand, ColorPill } from '../components/primitives';
import { audioEngine, MODES, SEVENTH_CHORDS, TRIADS, INTERVALS } from '../audioEngine';
import {
  CUSTOM_GROUPS,
  CUSTOM_LENGTHS,
  STARTER_DRILLS,
  autoName,
  canStart,
  customGroup,
  drillItems,
  drillName,
  emptySelection,
  itemLabel,
  loadDrills,
  newDrillId,
  saveDrills,
  shortLabel,
  suggestDrills,
  variantSummary,
  type CustomDrill,
  type CustomGroup,
  type CustomSelection,
  type DrillPalette,
} from '../lib/customPractice';
import { getAllSessions } from '../lib/sessionStore';
import { phCapture } from '../lib/posthog';

interface Props {
  isPro: boolean;
  onStart: (sel: CustomSelection, meta: { drillId?: string; name: string }) => void;
  onOpenPaywall: () => void;
  onExit: () => void;
}

const GROUP_ICONS: Record<string, LucideIcon> = {
  intervals: Ruler,
  scale_degrees: Hash,
  chords: Piano,
  modes: Compass,
  progressions: Music3,
};

const VARIANT_ICONS: Record<string, LucideIcon> = { harmonic: Layers, up: ArrowUpRight, down: ArrowDownRight };

const ink = (p: DrillPalette) => `var(--${p}-ink)`;
const fill = (p: DrillPalette) => `var(--${p})`;
const soft = (p: DrillPalette) => `var(--${p}-soft)`;

const CHUNKY: CSSProperties = {
  border: '2px solid var(--ink-1)',
  boxShadow: '0 4px 0 var(--ink-1), 0 8px 20px rgba(42,29,58,0.08)',
};

/** Play one item the way the drill would, in C, so the learner can hear what they're picking. */
async function hear(sel: CustomSelection, item: string) {
  try {
    const variant = sel.variantIds[0];
    switch (sel.groupId) {
      case 'intervals':
        await audioEngine.playInterval(
          'C',
          item as keyof typeof INTERVALS,
          variant === 'down' ? 'descending' : 'ascending',
          variant === 'harmonic' ? 'harmonic' : 'melodic',
        );
        break;
      case 'scale_degrees':
        await audioEngine.playScaleDegree('C', parseInt(item, 10) - 1, variant === 'minor' ? 'natural_minor' : 'major');
        break;
      case 'chords':
        if (item in TRIADS) await audioEngine.playTriad('C', item as keyof typeof TRIADS);
        else await audioEngine.playSeventhChord('C', item as keyof typeof SEVENTH_CHORDS);
        break;
      case 'modes':
        await audioEngine.playMode('C', item as keyof typeof MODES);
        break;
      case 'progressions':
        if (['authentic', 'plagal', 'half', 'deceptive'].includes(item)) {
          await audioEngine.playCadence('C', item as 'authentic' | 'plagal' | 'half' | 'deceptive', 'major');
        } else {
          await audioEngine.playProgression('C', item);
        }
        break;
    }
  } catch (err) {
    console.warn('custom practice: preview failed', err);
  }
}

function ago(ts: number, now = Date.now()): string {
  const days = Math.floor((now - ts) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? 'last week' : `${weeks} weeks ago`;
}

/* ---------- Small pieces ---------- */

function IconDot({ Icon, palette, size = 38 }: { Icon: LucideIcon; palette: DrillPalette; size?: number }) {
  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: fill(palette),
        color: ink(palette),
        border: '1.5px solid var(--ink-1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Icon size={size * 0.46} strokeWidth={2.4} />
    </div>
  );
}

/** The drill's items as little key-cap tokens: "P5", "m6", "maj7". */
function Tokens({ items, palette, size = 'md' }: { items: string[]; palette: DrillPalette; size?: 'sm' | 'md' }) {
  const sm = size === 'sm';
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: sm ? 5 : 6 }}>
      {items.map((item) => (
        <span
          key={item}
          style={{
            fontFamily: 'var(--disp)',
            fontWeight: 600,
            fontSize: sm ? 13 : 15,
            lineHeight: 1,
            padding: sm ? '5px 8px' : '7px 10px',
            borderRadius: 10,
            background: 'var(--card)',
            color: ink(palette),
            border: '1.5px solid var(--ink-1)',
            whiteSpace: 'nowrap',
          }}
        >
          {shortLabel(item)}
        </span>
      ))}
    </div>
  );
}

function SectionTitle({ step, children, aside, mobile }: { step: number; children: ReactNode; aside?: ReactNode; mobile?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '30px 0 12px' }}>
      <span
        aria-hidden
        style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: 'var(--ink-1)',
          color: 'var(--page)',
          fontSize: 12,
          fontWeight: 700,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {step}
      </span>
      <h2 style={{ fontFamily: 'var(--disp)', fontStyle: 'italic', fontWeight: 600, fontSize: mobile ? 18 : 20, margin: 0, color: 'var(--ink-1)', flex: 1 }}>
        {children}
      </h2>
      {aside}
    </div>
  );
}

function Decor() {
  return (
    <>
      <Blob size={260} color="var(--butter-soft)" style={{ position: 'absolute', top: 60, left: -110, pointerEvents: 'none' }} />
      <Blob size={300} color="var(--lav-soft)" style={{ position: 'absolute', top: 420, right: -150, pointerEvents: 'none', transform: 'rotate(140deg)' }} />
    </>
  );
}

/* ---------- The list of drills ---------- */

function DrillCard({ drill, mobile, onPlay, onEdit }: { drill: CustomDrill; mobile: boolean; onPlay: () => void; onEdit: () => void }) {
  const group = customGroup(drill.groupId)!;
  const name = drillName(drill);
  const how = variantSummary(drill);
  const items = drillItems(drill);
  const ready = canStart(drill);
  const Icon = GROUP_ICONS[group.id] ?? Ruler;
  const lastLine = drill.lastScore && drill.lastPlayedAt
    ? `last ${drill.lastScore.correct}/${drill.lastScore.total} · ${ago(drill.lastPlayedAt)}`
    : 'not played yet';

  return (
    <article
      style={{
        ...CHUNKY,
        position: 'relative',
        background: fill(group.palette),
        borderRadius: 'var(--r-lg)',
        padding: mobile ? '16px 16px 14px' : '18px 20px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        minHeight: mobile ? 0 : 196,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <Icon size={18} strokeWidth={2.4} color={ink(group.palette)} style={{ marginTop: 1, flexShrink: 0 }} aria-hidden />
        <div style={{ flex: 1, minWidth: 0, fontSize: 11, fontWeight: 700, letterSpacing: 1.3, textTransform: 'uppercase', color: ink(group.palette) }}>
          {group.name}{how ? ` · ${how}` : ''}
        </div>
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edit ${name}`}
          style={{
            width: 32,
            height: 32,
            marginTop: -6,
            marginRight: -6,
            borderRadius: '50%',
            border: 'none',
            background: 'transparent',
            color: ink(group.palette),
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Pencil size={16} strokeWidth={2.4} />
        </button>
      </div>

      <h3
        style={{
          fontFamily: 'var(--disp)',
          fontStyle: 'italic',
          fontWeight: 600,
          fontSize: mobile ? 24 : 27,
          lineHeight: 1.1,
          margin: 0,
          color: 'var(--ink-1)',
          overflowWrap: 'anywhere',
        }}
      >
        {name}
      </h3>

      <div style={{ fontSize: 13, color: 'var(--ink-1)', lineHeight: 1.45, opacity: 0.8 }}>
        {items.map((i) => itemLabel(group.id, i)).join(' · ')}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginTop: 'auto' }}>
        <div style={{ flex: 1, fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.4 }}>
          {drill.length} questions
          <br />
          {lastLine}
        </div>
        <button
          type="button"
          onClick={onPlay}
          disabled={!ready}
          aria-label={`Start ${name}`}
          style={{
            width: mobile ? 52 : 58,
            height: mobile ? 52 : 58,
            borderRadius: '50%',
            background: 'var(--ink-1)',
            color: 'var(--page)',
            border: '2px solid var(--ink-1)',
            boxShadow: `0 4px 0 ${ink(group.palette)}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: ready ? 'pointer' : 'not-allowed',
            opacity: ready ? 1 : 0.5,
            flexShrink: 0,
            transition: 'transform 140ms ease',
          }}
          onMouseEnter={(e) => { if (ready) e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <Play size={mobile ? 20 : 22} strokeWidth={2.6} fill="currentColor" style={{ marginLeft: 3 }} />
        </button>
      </div>
    </article>
  );
}

function NewDrillCard({ mobile, onClick, first }: { mobile: boolean; onClick: () => void; first: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        borderRadius: 'var(--r-lg)',
        border: '2px dashed var(--ink-3)',
        background: 'transparent',
        padding: mobile ? '18px 16px' : '20px',
        minHeight: mobile ? 0 : 196,
        display: 'flex',
        flexDirection: mobile ? 'row' : 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        cursor: 'pointer',
        color: 'var(--ink-1)',
        font: 'inherit',
        textAlign: mobile ? 'left' : 'center',
      }}
    >
      <span
        aria-hidden
        style={{
          width: 46,
          height: 46,
          borderRadius: '50%',
          background: 'var(--ink-1)',
          color: 'var(--page)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Plus size={22} strokeWidth={2.6} />
      </span>
      <span>
        <span style={{ display: 'block', fontFamily: 'var(--disp)', fontStyle: 'italic', fontWeight: 600, fontSize: 20 }}>
          {first ? 'Make your first drill' : 'New drill'}
        </span>
        <span style={{ display: 'block', fontSize: 13, color: 'var(--ink-2)', marginTop: 3 }}>
          Pick two or more things to tell apart
        </span>
      </span>
    </button>
  );
}

/** "You keep mixing these up": drills made from recent mistakes, or starters before there are any. */
function SuggestionPanel({
  suggestions,
  fromMistakes,
  mobile,
  onAdd,
}: {
  suggestions: { selection: CustomSelection; count?: number }[];
  fromMistakes: boolean;
  mobile: boolean;
  onAdd: (sel: CustomSelection) => void;
}) {
  return (
    <section
      style={{
        ...CHUNKY,
        position: 'relative',
        background: 'var(--sky)',
        borderRadius: 'var(--r-lg)',
        padding: mobile ? '14px 14px 10px' : '18px 20px 12px',
        overflow: 'hidden',
        marginTop: 26,
      }}
    >
      <Mascot
        name="pulse"
        face="curious"
        view="bust"
        size={mobile ? 58 : 76}
        style={{ position: 'absolute', right: -6, top: -4, pointerEvents: 'none', filter: 'drop-shadow(0 4px 8px rgba(42,29,58,0.15))' }}
      />
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase', color: 'var(--sky-ink)' }}>
        {fromMistakes ? 'you keep mixing these up' : 'start with one of these'}
      </div>
      <div style={{ fontFamily: 'var(--disp)', fontSize: mobile ? 19 : 22, color: 'var(--ink-1)', margin: '3px 0 10px', paddingRight: 70 }}>
        {fromMistakes ? 'Drill them apart.' : 'Classic mix-ups, ready to go.'}
      </div>
      <div style={{ height: 1, background: 'rgba(42,29,58,0.12)', margin: '0 -4px 4px' }} />
      {suggestions.map(({ selection, count }) => {
        const group = customGroup(selection.groupId)!;
        const how = variantSummary(selection);
        const name = autoName(selection);
        return (
          <button
            key={`${selection.groupId}:${selection.items.join(',')}`}
            type="button"
            onClick={() => onAdd(selection)}
            aria-label={`Add drill ${name}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              width: '100%',
              padding: '9px 6px',
              borderRadius: 12,
              border: 'none',
              background: 'transparent',
              color: 'var(--ink-1)',
              font: 'inherit',
              textAlign: 'left',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(42,29,58,0.05)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <IconDot Icon={GROUP_ICONS[group.id] ?? Ruler} palette={group.palette} size={mobile ? 34 : 38} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontFamily: 'var(--disp)', fontStyle: 'italic', fontWeight: 600, fontSize: mobile ? 15 : 16 }}>
                {selection.items.map((i) => itemLabel(group.id, i)).join(' vs ')}
              </span>
              <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-2)', marginTop: 2 }}>
                {count ? `mixed up ${count}× lately` : group.name}
                {how ? ` · ${how.toLowerCase()}` : ''}
              </span>
            </span>
            <span
              aria-hidden
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '6px 12px',
                borderRadius: 999,
                background: 'var(--card)',
                border: '1.5px solid var(--ink-1)',
                fontSize: 12.5,
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              <Plus size={14} strokeWidth={2.6} /> add
            </span>
          </button>
        );
      })}
    </section>
  );
}

/* ---------- The editor ---------- */

function TopicTile({ group, on, onClick, compact }: { group: CustomGroup; on: boolean; onClick: () => void; compact: boolean }) {
  const Icon = GROUP_ICONS[group.id] ?? Ruler;
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: compact ? 'row' : 'column',
        alignItems: compact ? 'center' : 'flex-start',
        gap: compact ? 10 : 8,
        padding: compact ? '10px 12px' : '14px 14px 13px',
        borderRadius: compact ? 16 : 18,
        background: on ? fill(group.palette) : soft(group.palette),
        border: `2px solid ${on ? 'var(--ink-1)' : 'transparent'}`,
        boxShadow: on ? '0 4px 0 var(--ink-1)' : 'none',
        transform: on ? 'translateY(-2px)' : 'none',
        color: 'var(--ink-1)',
        font: 'inherit',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'transform 140ms ease, box-shadow 140ms ease',
      }}
    >
      <IconDot Icon={Icon} palette={group.palette} size={compact ? 30 : 34} />
      <span style={{ fontFamily: 'var(--disp)', fontStyle: 'italic', fontWeight: 600, fontSize: compact ? 15.5 : 17, lineHeight: 1.1 }}>{group.name}</span>
      {!compact && <span style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.35 }}>{group.blurb}</span>}
    </button>
  );
}

function ItemTile({
  groupId,
  item,
  palette,
  on,
  onToggle,
  onHear,
}: {
  groupId: string;
  item: string;
  palette: DrillPalette;
  on: boolean;
  onToggle: () => void;
  onHear: () => void;
}) {
  const label = itemLabel(groupId, item);
  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        aria-pressed={on}
        aria-label={label}
        onClick={onToggle}
        style={{
          width: '100%',
          minHeight: 84,
          padding: '12px 12px 12px 14px',
          borderRadius: 16,
          background: on ? fill(palette) : 'var(--card)',
          border: on ? '2px solid var(--ink-1)' : '1.5px solid var(--hairline)',
          boxShadow: on ? '0 3px 0 var(--ink-1)' : 'var(--sh-sm)',
          transform: on ? 'translateY(-1px)' : 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          gap: 4,
          color: on ? ink(palette) : 'var(--ink-1)',
          font: 'inherit',
          textAlign: 'left',
          cursor: 'pointer',
          transition: 'transform 120ms ease, box-shadow 120ms ease, background 120ms ease',
        }}
      >
        <span style={{ fontFamily: 'var(--disp)', fontWeight: 600, fontSize: 22, lineHeight: 1 }}>{shortLabel(item)}</span>
        <span style={{ fontSize: 12, lineHeight: 1.3, color: on ? ink(palette) : 'var(--ink-2)', paddingRight: 26 }}>{label}</span>
      </button>
      {on && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: 'var(--ink-1)',
            color: 'var(--page)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <Check size={12} strokeWidth={3.2} />
        </span>
      )}
      <button
        type="button"
        onClick={onHear}
        aria-label={`Hear ${label}`}
        title="Hear it"
        style={{
          position: 'absolute',
          right: 6,
          bottom: 6,
          width: 30,
          height: 30,
          borderRadius: '50%',
          border: 'none',
          background: on ? 'rgba(255,255,255,0.55)' : 'var(--page-2)',
          color: on ? ink(palette) : 'var(--ink-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <Volume2 size={15} strokeWidth={2.4} />
      </button>
    </div>
  );
}

function Toggle({ on, onClick, children, label }: { on: boolean; onClick: () => void; children: ReactNode; label: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        height: 46,
        padding: '0 18px 0 14px',
        borderRadius: 999,
        background: on ? 'var(--ink-1)' : 'var(--card)',
        color: on ? 'var(--page)' : 'var(--ink-1)',
        border: `2px solid ${on ? 'var(--ink-1)' : 'var(--hairline)'}`,
        font: '600 14.5px/1 var(--ui)',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

function Editor({
  initial,
  isNew,
  isPro,
  mobile,
  onCancel,
  onSave,
  onDelete,
}: {
  initial: CustomDrill;
  isNew: boolean;
  isPro: boolean;
  mobile: boolean;
  onCancel: () => void;
  onSave: (drill: CustomDrill, andStart: boolean) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState<CustomDrill>(initial);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const group = customGroup(draft.groupId) ?? CUSTOM_GROUPS[0];
  const picked = drillItems(draft);
  const ready = canStart(draft);
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const missing = picked.length < 2
    ? `Pick ${picked.length === 0 ? 'two or more' : 'one more'} to tell apart`
    : draft.variantIds.length === 0
    ? `Choose at least one: ${group.variantLabel?.toLowerCase() ?? 'how it’s played'}`
    : '';

  return (
    <div style={{ padding: mobile ? '0 18px 140px' : '0 44px 150px', maxWidth: 820, margin: '0 auto', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '4px 0 14px' }}>
        <Bean tone="ghost" size="sm" onClick={onCancel} style={{ paddingLeft: 4 }}>
          <ArrowLeft size={16} strokeWidth={2.4} /> your drills
        </Bean>
        {!isNew && (
          <Bean
            tone={deleteArmed ? 'coral' : 'ghost'}
            size="sm"
            onClick={() => (deleteArmed ? onDelete() : setDeleteArmed(true))}
          >
            <Trash2 size={15} strokeWidth={2.4} /> {deleteArmed ? 'tap again to delete' : 'delete'}
          </Bean>
        )}
      </div>

      <ColorPill tone={group.palette === 'coral' ? 'coral' : group.palette} style={{ marginBottom: 10 }}>
        {isNew ? 'new drill' : 'edit drill'}
      </ColorPill>
      <label style={{ display: 'block' }}>
        <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Drill name</span>
        <input
          value={draft.name}
          placeholder={autoName(draft)}
          maxLength={40}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          style={{
            width: '100%',
            fontFamily: 'var(--disp)',
            fontStyle: 'italic',
            fontWeight: 600,
            fontSize: mobile ? 32 : 44,
            lineHeight: 1.1,
            color: 'var(--ink-1)',
            background: 'transparent',
            border: 'none',
            borderBottom: '2px dashed var(--hairline)',
            padding: '2px 0 6px',
            outline: 'none',
          }}
        />
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--ink-3)', marginTop: 6 }}>
        <Pencil size={12} strokeWidth={2.4} aria-hidden /> name it, or keep the one made from your picks
      </div>

      <SectionTitle mobile={mobile} step={1}>What are you drilling?</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(auto-fill, minmax(145px, 1fr))', gap: mobile ? 8 : 10 }}>
        {CUSTOM_GROUPS.map((g) => (
          <TopicTile
            key={g.id}
            compact={mobile}
            group={g}
            on={g.id === group.id}
            onClick={() => { if (g.id !== group.id) setDraft({ ...draft, ...emptySelection(g.id, draft.length) }); }}
          />
        ))}
      </div>

      <SectionTitle
        mobile={mobile}
        step={2}
        aside={
          <ColorPill tone={picked.length >= 2 ? 'mint' : 'coral'} style={{ textTransform: 'none', letterSpacing: 0 }}>
            {picked.length} picked
          </ColorPill>
        }
      >
        What to tell apart
      </SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${mobile ? 128 : 140}px, 1fr))`, gap: 10 }}>
        {group.items.map((item) => (
          <ItemTile
            key={item}
            groupId={group.id}
            item={item}
            palette={group.palette}
            on={picked.includes(item)}
            onToggle={() => setDraft({ ...draft, items: toggle(draft.items, item) })}
            onHear={() => { void hear(draft, item); }}
          />
        ))}
      </div>

      {group.variants.length > 1 && (
        <>
          <SectionTitle mobile={mobile} step={3}>{group.variantLabel ?? 'How it’s played'}</SectionTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {group.variants.map((v) => {
              const Icon = VARIANT_ICONS[v.id];
              return (
                <Toggle
                  key={v.id}
                  label={v.label}
                  on={draft.variantIds.includes(v.id)}
                  onClick={() => setDraft({ ...draft, variantIds: toggle(draft.variantIds, v.id) })}
                >
                  {Icon && <Icon size={17} strokeWidth={2.4} aria-hidden />}
                  {v.label}
                </Toggle>
              );
            })}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 8 }}>Pick more than one and each question uses one of them.</div>
        </>
      )}

      <SectionTitle mobile={mobile} step={group.variants.length > 1 ? 4 : 3}>How many questions?</SectionTitle>
      <div
        role="radiogroup"
        aria-label="Questions"
        style={{ display: 'inline-flex', padding: 4, gap: 4, borderRadius: 999, background: 'var(--page-2)', border: '1.5px solid var(--hairline)' }}
      >
        {CUSTOM_LENGTHS.map((n) => {
          const on = draft.length === n;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={`${n} questions`}
              onClick={() => setDraft({ ...draft, length: n })}
              style={{
                minWidth: 64,
                height: 40,
                borderRadius: 999,
                border: 'none',
                background: on ? 'var(--ink-1)' : 'transparent',
                color: on ? 'var(--page)' : 'var(--ink-1)',
                font: '600 15px/1 var(--ui)',
                cursor: 'pointer',
              }}
            >
              {n}
            </button>
          );
        })}
      </div>

      {/* Save bar */}
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 5,
          background: 'color-mix(in srgb, var(--page) 92%, transparent)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderTop: '1px solid var(--hairline)',
          padding: mobile ? '12px 18px calc(12px + env(safe-area-inset-bottom))' : '14px 44px',
        }}
      >
        <div style={{ maxWidth: 820, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: missing ? 'var(--coral-ink)' : 'var(--ink-2)' }}>
            {missing || (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {!mobile && <Tokens items={picked} palette={group.palette} size="sm" />}
                <span>{draft.length} questions{isPro ? '' : ' · starting needs Pro'}</span>
              </span>
            )}
          </div>
          <Bean tone={isPro ? 'soft' : 'ink'} size={mobile ? 'sm' : 'md'} disabled={!ready} onClick={() => onSave(draft, false)}>
            save
          </Bean>
          <Bean tone={isPro ? 'ink' : 'coral'} size={mobile ? 'sm' : 'md'} disabled={!ready} onClick={() => onSave(draft, true)}>
            <Play size={15} strokeWidth={2.6} fill="currentColor" /> {isPro ? 'save & start' : 'start · pro'}
          </Bean>
        </div>
      </div>
    </div>
  );
}

/* ---------- The screen ---------- */

type View = { kind: 'list' } | { kind: 'edit'; drill: CustomDrill; isNew: boolean };

export default function CustomPractice({ isPro, onStart, onOpenPaywall, onExit }: Props) {
  const mobile = useBreakpoint() !== 'desktop';
  const [drills, setDrills] = useState<CustomDrill[]>(() => loadDrills());
  const [view, setView] = useState<View>({ kind: 'list' });

  useEffect(() => { phCapture('custom_practice_opened', { is_pro: isPro, drills: drills.length }); }, [isPro]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { window.scrollTo(0, 0); }, [view.kind]);

  const mistakes = useMemo(() => suggestDrills(getAllSessions(), drills), [drills]);
  const starters = drills.length === 0 && mistakes.length === 0
    ? STARTER_DRILLS.map((selection) => ({ selection }))
    : [];

  const persist = (next: CustomDrill[]) => { setDrills(next); saveDrills(next); };

  const start = (drill: CustomDrill) => {
    phCapture('custom_practice_started', {
      is_pro: isPro,
      group: drill.groupId,
      variants: drill.variantIds,
      item_count: drillItems(drill).length,
      length: drill.length,
      named: drill.name.trim() !== '',
    });
    if (!isPro) { onOpenPaywall(); return; }
    onStart(drill, { drillId: drill.id, name: drillName(drill) });
  };

  const save = (drill: CustomDrill, andStart: boolean, from: 'editor' | 'suggestion' | 'starter' = 'editor') => {
    const exists = drills.some((d) => d.id === drill.id);
    const next = exists ? drills.map((d) => (d.id === drill.id ? drill : d)) : [drill, ...drills];
    persist(next);
    phCapture('custom_drill_saved', { group: drill.groupId, item_count: drillItems(drill).length, is_new: !exists, from });
    setView({ kind: 'list' });
    if (andStart) start(drill);
  };

  const newDrill = (sel: CustomSelection = emptySelection()): CustomDrill => ({ ...sel, id: newDrillId(), name: '', createdAt: Date.now() });

  const header = (
    <div style={{ padding: mobile ? '12px 18px' : '22px 44px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
      <Brand />
      <button
        onClick={onExit}
        aria-label="Close"
        style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--page-2)', border: 'none', fontSize: 16, color: 'var(--ink-2)', cursor: 'pointer' }}
      >
        ✕
      </button>
    </div>
  );

  if (view.kind === 'edit') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--page)', position: 'relative', overflowX: 'hidden' }}>
        {header}
        <Editor
          key={view.drill.id}
          initial={view.drill}
          isNew={view.isNew}
          isPro={isPro}
          mobile={mobile}
          onCancel={() => setView({ kind: 'list' })}
          onSave={(d, andStart) => save(d, andStart)}
          onDelete={() => {
            persist(drills.filter((d) => d.id !== view.drill.id));
            phCapture('custom_drill_deleted', { group: view.drill.groupId });
            setView({ kind: 'list' });
          }}
        />
      </div>
    );
  }

  const suggestions = mistakes.length > 0 ? mistakes : starters;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--page)', position: 'relative', overflowX: 'hidden' }}>
      <Decor />
      {header}
      <div style={{ padding: mobile ? '0 18px 48px' : '0 44px 64px', maxWidth: 920, margin: '0 auto', position: 'relative' }}>
        <ColorPill tone="lav" style={{ marginBottom: 12 }}>{isPro ? 'pro' : 'pro feature'}</ColorPill>
        <h1 style={{ fontFamily: 'var(--disp)', fontSize: mobile ? 34 : 48, fontWeight: 600, lineHeight: 1.02, margin: '0 0 8px', color: 'var(--ink-1)' }}>
          Your <span style={{ fontStyle: 'italic', color: 'var(--lav-ink)' }}>drills</span>
        </h1>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', margin: 0, lineHeight: 1.5, maxWidth: 520 }}>
          Drill exactly what trips you up: the two intervals you mix up, the chords you can’t tell apart. Save as many as you like.
        </p>

        {suggestions.length > 0 && (
          <SuggestionPanel
            suggestions={suggestions}
            fromMistakes={mistakes.length > 0}
            mobile={mobile}
            onAdd={(sel) => save(newDrill(sel), false, mistakes.length > 0 ? 'suggestion' : 'starter')}
          />
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: mobile ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: mobile ? 14 : 18,
            marginTop: 28,
          }}
        >
          {drills.map((d) => (
            <DrillCard
              key={d.id}
              drill={d}
              mobile={mobile}
              onPlay={() => start(d)}
              onEdit={() => setView({ kind: 'edit', drill: d, isNew: false })}
            />
          ))}
          <NewDrillCard mobile={mobile} first={drills.length === 0} onClick={() => setView({ kind: 'edit', drill: newDrill(), isNew: true })} />
        </div>
      </div>
    </div>
  );
}
