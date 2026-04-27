import { useEffect, useState } from 'react';
import { useBreakpoint } from '../lib/useBreakpoint';
import { Bean, Blob, Brand, ColorPill, KeyChip, Squiggle } from '../components/primitives';

interface Props {
  onStart: () => void;
  onDemo: () => void;
}

export default function Landing({ onStart, onDemo }: Props) {
  const mobile = useBreakpoint() !== 'desktop';
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--page)', overflow: 'auto' }}>
      {/* Nav */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          padding: mobile ? '12px 22px' : '20px 48px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: scrolled ? 'var(--card)' : 'transparent',
          boxShadow: scrolled ? 'var(--sh-sm)' : 'none',
          transition: 'all 160ms',
        }}
      >
        <Brand />
        {!mobile && (
          <div style={{ display: 'flex', gap: 24, fontSize: 14, color: 'var(--ink-2)' }}>
            <span>Curriculum</span>
            <span>Pricing</span>
            <span>Sign in</span>
          </div>
        )}
        <Bean tone="ink" size="sm" onClick={onStart}>
          start free →
        </Bean>
      </div>

      {/* Hero */}
      <div
        style={{
          display: mobile ? 'block' : 'grid',
          gridTemplateColumns: '1.1fr 1fr',
          gap: 40,
          padding: mobile ? '20px 22px 20px' : '60px 48px',
          alignItems: 'center',
          maxWidth: 1200,
          margin: '0 auto',
        }}
      >
        <div>
          <ColorPill tone="coral" style={{ marginBottom: mobile ? 14 : 24 }}>
            ✦ ear training
          </ColorPill>
          <h1
            style={{
              fontFamily: 'var(--disp)',
              fontSize: mobile ? 44 : 82,
              fontWeight: 600,
              lineHeight: 0.95,
              letterSpacing: -0.03,
              margin: '0 0 18px',
              color: 'var(--ink-1)',
            }}
          >
            Hear the <span style={{ fontStyle: 'italic', color: 'var(--coral-ink)' }}>song</span>
            <br />
            <span style={{ fontStyle: 'italic', color: 'var(--lav-ink)' }}>inside</span> the song.
          </h1>
          <p
            style={{
              fontSize: mobile ? 14 : 18,
              lineHeight: 1.5,
              color: 'var(--ink-2)',
              maxWidth: 460,
              margin: '0 0 24px',
            }}
          >
            Fifteen minutes a day. Real scale context, no rote drilling. Your ear, on the way up.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Bean tone="coral" size="lg" onClick={onStart}>
              start free · 7 days
            </Bean>
            <Bean tone="soft" size="lg" onClick={onDemo}>
              ▶ listen to a demo
            </Bean>
          </div>
          {!mobile && (
            <div style={{ marginTop: 36, display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ display: 'flex' }}>
                {['var(--coral)', 'var(--mint)', 'var(--lav)', 'var(--butter)', 'var(--sky)'].map((c, i) => (
                  <div
                    key={i}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: c,
                      border: '2px solid var(--page)',
                      marginLeft: i ? -8 : 0,
                    }}
                  />
                ))}
              </div>
              <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                4,200+ ears in training · <b>★ 4.9</b>
              </span>
            </div>
          )}
        </div>
        <div
          style={{
            position: 'relative',
            aspectRatio: '1/1',
            background: 'linear-gradient(140deg, var(--butter), var(--coral) 60%, var(--lav))',
            borderRadius: 32,
            padding: mobile ? 22 : 32,
            overflow: 'hidden',
            marginTop: mobile ? 24 : 0,
            maxWidth: mobile ? '100%' : undefined,
          }}
        >
          <Blob size={140} color="var(--mint)" style={{ position: 'absolute', top: -20, right: -20, opacity: 0.7 }} />
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 24,
            }}
          >
            <div
              style={{
                fontFamily: 'var(--disp)',
                fontStyle: 'italic',
                fontSize: mobile ? 30 : 44,
                lineHeight: 1,
                color: '#fff',
                fontWeight: 600,
              }}
            >
              what's that
              <br />
              interval?
            </div>
            <div
              style={{
                background: 'var(--card)',
                borderRadius: 20,
                padding: mobile ? '14px 16px' : '18px 22px',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <button
                onClick={onDemo}
                aria-label="play demo"
                style={{
                  width: mobile ? 40 : 52,
                  height: mobile ? 40 : 52,
                  borderRadius: '50%',
                  background: 'var(--ink-1)',
                  color: 'var(--page)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: mobile ? 14 : 18,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                ▶
              </button>
              <Squiggle width={mobile ? 160 : 200} height={32} color="var(--coral)" />
            </div>
            {!mobile && (
              <div style={{ display: 'flex', gap: 8 }}>
                {(['C', 'E', 'G'] as const).map((n, i) => (
                  <KeyChip key={n} note={n} tone={(['mint', 'lav', 'butter'] as const)[i]} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3 features */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: mobile ? '1fr' : 'repeat(3, 1fr)',
          gap: mobile ? 10 : 20,
          padding: mobile ? '0 22px 40px' : '0 52px 72px',
          maxWidth: 1200,
          margin: '0 auto',
        }}
      >
        {[
          { t: 'Scale-degree awareness', d: 'Every question lands inside a real key.', c: 'var(--mint)', e: '𝄞' },
          { t: 'Intervals to modes', d: 'Ten unlockable levels. Real curriculum.', c: 'var(--lav)', e: '♪' },
          { t: 'No streak guilt', d: 'We notice trouble, bring it back gently.', c: 'var(--butter)', e: '♡' },
        ].map((f, i) => (
          <div
            key={i}
            style={{
              background: f.c,
              borderRadius: 28,
              padding: mobile ? '18px 20px' : '28px 26px',
              boxShadow: 'var(--sh-sm)',
              display: 'flex',
              flexDirection: mobile ? 'row' : 'column',
              alignItems: mobile ? 'center' : 'flex-start',
              gap: mobile ? 14 : 0,
            }}
          >
            <div
              style={{
                fontFamily: 'var(--disp)',
                fontSize: mobile ? 28 : 40,
                marginBottom: mobile ? 0 : 16,
                color: 'var(--ink-1)',
                lineHeight: 1,
              }}
            >
              {f.e}
            </div>
            <div>
              <div
                style={{
                  fontFamily: 'var(--disp)',
                  fontSize: mobile ? 17 : 22,
                  fontWeight: 600,
                  color: 'var(--ink-1)',
                  marginBottom: mobile ? 2 : 8,
                  letterSpacing: -0.01,
                }}
              >
                {f.t}
              </div>
              {!mobile && (
                <div style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.55 }}>{f.d}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          textAlign: 'center',
          padding: '20px',
          fontSize: 12,
          color: 'var(--ink-3)',
          fontFamily: 'var(--mono)',
        }}
      >
        fifths · an ear-training app
      </div>
    </div>
  );
}
