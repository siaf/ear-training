// "Save your progress" / "Go Pro" upsell — same chunky brand-style card on desktop and
// mobile. Mode-driven: if the user isn't signed in, we lead with create-account (mint /
// Fable encouragement); if they're signed in but not Pro, we lead with the Pro pitch
// (lavender). Either way it sits below the Today panel.
//
// Pulled out of Path.tsx so the same card can render in the desktop right rail AND
// above-the-path on mobile without a duplicate JSX block.

export type UpsellMode = 'none' | 'create_account' | 'go_pro';

export interface UpsellCardProps {
  mode: UpsellMode;
  mobile: boolean;
  onClick: () => void;
}

export default function UpsellCard({ mode, mobile, onClick }: UpsellCardProps) {
  if (mode === 'none') return null;
  const isCreate = mode === 'create_account';
  const tint = isCreate ? 'mint' : 'lav';
  return (
    <button
      onClick={onClick}
      style={{
        position: 'relative',
        textAlign: 'left',
        background: `var(--${tint})`,
        borderRadius: 'var(--r-lg)',
        padding: mobile ? '14px 16px' : '18px 20px',
        border: '2px solid var(--ink-1)',
        boxShadow: `0 4px 0 var(--${tint}-ink), 0 8px 20px rgba(42,29,58,0.1)`,
        cursor: 'pointer',
        font: 'inherit',
        color: 'var(--ink-1)',
        overflow: 'hidden',
        width: '100%',
      }}
    >
      <img
        src={`${import.meta.env.BASE_URL}brand/mascots/fable/excited.png`}
        alt=""
        aria-hidden
        style={{
          position: 'absolute',
          right: -6,
          bottom: -6,
          width: mobile ? 64 : 80,
          height: 'auto',
          pointerEvents: 'none',
          filter: 'drop-shadow(0 4px 8px rgba(42,29,58,0.15))',
        }}
      />
      {isCreate ? (
        <>
          <div style={{ fontSize: 11, color: `var(--${tint}-ink)`, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.4 }}>
            save your progress
          </div>
          <div
            style={{
              fontFamily: 'var(--disp)',
              fontStyle: 'italic',
              fontSize: mobile ? 16 : 18,
              fontWeight: 400,
              margin: '4px 0 6px',
              lineHeight: 1.15,
              maxWidth: '70%',
            }}
          >
            Take it with you.
          </div>
          <div style={{ fontSize: mobile ? 12 : 12.5, color: 'var(--ink-2)', lineHeight: 1.5, maxWidth: '68%' }}>
            Sign in with email — practice follows you to any device.
          </div>
          <div style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: `var(--${tint}-ink)`, letterSpacing: 0.2 }}>
            create account →
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 11, color: `var(--${tint}-ink)`, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.4 }}>
            Fifths pro
          </div>
          <div
            style={{
              fontFamily: 'var(--disp)',
              fontStyle: 'italic',
              fontSize: mobile ? 16 : 18,
              fontWeight: 400,
              margin: '4px 0 6px',
              lineHeight: 1.15,
              maxWidth: '70%',
            }}
          >
            Unlimited history.
          </div>
          <div style={{ fontSize: mobile ? 12 : 12.5, color: 'var(--ink-2)', lineHeight: 1.5, maxWidth: '68%' }}>
            Cloud sync, full analytics, weak-item auto-drills, Pro lessons.
          </div>
          <div style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: `var(--${tint}-ink)`, letterSpacing: 0.2 }}>
            see plans →
          </div>
        </>
      )}
    </button>
  );
}
