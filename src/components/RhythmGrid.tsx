import { useState } from 'react';

/**
 * 16-cell rhythm dictation grid (1 bar of 4/4, 4 beats × 4 sixteenths).
 * Cells are toggleable. Beat 1 of each beat group gets a darker label.
 *
 * After the user has heard the pattern (parent already played it via audioEngine),
 * the user fills in the cells they think were on, then submits. The parent grades
 * via gradeGrid against the original pattern.
 */
export interface RhythmGridProps {
  initialCells?: boolean[];
  mobile: boolean;
  onSubmit: (cells: boolean[]) => void;
  onReplay: () => void;
  onCancel: () => void;
}

export default function RhythmGrid({ initialCells, mobile, onSubmit, onReplay, onCancel }: RhythmGridProps) {
  const [cells, setCells] = useState<boolean[]>(initialCells ?? new Array(16).fill(false));

  function toggle(i: number) {
    setCells((curr) => {
      const next = curr.slice();
      next[i] = !next[i];
      return next;
    });
  }

  function clear() {
    setCells(new Array(16).fill(false));
  }

  const cellSize = mobile ? 36 : 48;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: mobile ? 14 : 22, width: '100%' }}>
      <div
        style={{
          fontSize: mobile ? 13 : 15,
          color: 'var(--ink-2)',
          fontFamily: 'var(--ui)',
          fontWeight: 600,
          letterSpacing: 0.4,
          textTransform: 'uppercase',
        }}
      >
        Tap the cells where the hit landed
      </div>

      {/* Beat grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(16, ${cellSize}px)`,
          gap: 4,
          background: 'var(--page-2)',
          padding: 8,
          borderRadius: 12,
          border: '1px solid var(--hairline)',
        }}
      >
        {cells.map((on, i) => {
          const isBeatOne = i % 4 === 0;
          return (
            <button
              key={i}
              onClick={() => toggle(i)}
              aria-label={`Cell ${i + 1}${on ? ' (on)' : ''}`}
              aria-pressed={on}
              style={{
                width: cellSize,
                height: cellSize,
                borderRadius: 8,
                background: on ? 'var(--coral)' : 'var(--card)',
                border: isBeatOne ? '2px solid var(--ink-1)' : '1px solid var(--hairline)',
                color: on ? 'var(--page)' : 'var(--ink-3)',
                fontFamily: 'var(--mono)',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                touchAction: 'manipulation',
                padding: 0,
              }}
            >
              {isBeatOne ? Math.floor(i / 4) + 1 : ''}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={onReplay}
          style={{
            padding: '10px 18px',
            borderRadius: 999,
            border: '1px solid var(--hairline)',
            background: 'var(--card)',
            color: 'var(--ink-1)',
            fontFamily: 'var(--ui)',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          replay
        </button>
        <button
          onClick={clear}
          style={{
            padding: '10px 18px',
            borderRadius: 999,
            border: '1px solid var(--hairline)',
            background: 'var(--card)',
            color: 'var(--ink-2)',
            fontFamily: 'var(--ui)',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          clear
        </button>
        <button
          onClick={() => onSubmit(cells)}
          style={{
            padding: '10px 22px',
            borderRadius: 999,
            border: 'none',
            background: 'var(--ink-1)',
            color: 'var(--page)',
            fontFamily: 'var(--ui)',
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          submit
        </button>
        <button
          onClick={onCancel}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--ink-3)',
            fontSize: 12,
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          skip
        </button>
      </div>
    </div>
  );
}
