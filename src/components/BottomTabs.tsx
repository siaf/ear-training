import { CSSProperties, ComponentType } from 'react';
import { BarChart3, Map, Settings as SettingsIcon, type LucideProps } from 'lucide-react';

export type BottomTabRoute = 'path' | 'stats' | 'settings';

interface Props {
  active: BottomTabRoute;
  onChange: (r: BottomTabRoute) => void;
  style?: CSSProperties;
}

interface TabDef {
  key: BottomTabRoute;
  label: string;
  Icon: ComponentType<LucideProps>;
  tone: string;
  ink: string;
}

const TABS: TabDef[] = [
  { key: 'path',     label: 'path',     Icon: Map,          tone: 'var(--coral)', ink: 'var(--coral-ink)' },
  { key: 'stats',    label: 'stats',    Icon: BarChart3,    tone: 'var(--lav)',   ink: 'var(--lav-ink)' },
  { key: 'settings', label: 'settings', Icon: SettingsIcon, tone: 'var(--mint)',  ink: 'var(--mint-ink)' },
];

export default function BottomTabs({ active, onChange, style }: Props) {
  return (
    <nav
      aria-label="Primary"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        background: 'rgba(255,248,239,0.92)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderTop: '1px solid var(--hairline)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        ...style,
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${TABS.length}, 1fr)`,
          padding: '6px 8px',
          gap: 4,
        }}
      >
        {TABS.map((t) => {
          const isActive = t.key === active;
          return (
            <button
              key={t.key}
              onClick={() => onChange(t.key)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={t.label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                padding: '6px 4px 4px',
                border: 'none',
                borderRadius: 14,
                background: isActive ? t.tone : 'transparent',
                color: isActive ? t.ink : 'var(--ink-3)',
                cursor: 'pointer',
                transition: 'background 160ms, color 160ms',
                minHeight: 52,
              }}
            >
              <t.Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span
                style={{
                  fontFamily: 'var(--ui)',
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: 0.3,
                  textTransform: 'uppercase',
                }}
              >
                {t.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export const BOTTOM_TABS_HEIGHT = 68; // approx, excluding safe-area inset
