import { Brand } from './primitives';

export type SidebarTab = 'path' | 'stats' | 'settings';

interface Props {
  active: SidebarTab;
  onNavigate: (tab: SidebarTab) => void;
}

const NAV: Array<{ key: SidebarTab; label: string }> = [
  { key: 'path', label: 'Path' },
  { key: 'stats', label: 'Stats' },
  { key: 'settings', label: 'Settings' },
];

export default function DesktopSidebar({ active, onNavigate }: Props) {
  return (
    <aside
      style={{
        width: 220,
        padding: '24px 20px',
        borderRight: '1px solid var(--hairline)',
        background: 'var(--card)',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        height: '100vh',
      }}
    >
      <Brand />
      <div style={{ marginTop: 26, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {NAV.map((n) => {
          const isActive = n.key === active;
          return (
            <button
              key={n.key}
              onClick={() => !isActive && onNavigate(n.key)}
              style={{
                textAlign: 'left',
                padding: '10px 14px',
                borderRadius: 12,
                background: isActive ? 'var(--page-2)' : 'transparent',
                fontSize: 14,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--ink-1)' : 'var(--ink-2)',
                border: 'none',
                cursor: isActive ? 'default' : 'pointer',
              }}
            >
              {n.label}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
