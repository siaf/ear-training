// Melodic dictation answer: one slot per note, filled by tapping scale degrees in order.
// Number keys type degrees, Backspace removes the last one, Enter checks a full answer.

import { useEffect, useState } from 'react';
import { Delete, Play as PlayIcon } from 'lucide-react';
import { Bean } from './primitives';
import { encodeMelody } from '../lib/melody';

interface Props {
  length: number;
  degrees: string[];
  mobile: boolean;
  onReplay: () => void;
  onSubmit: (answer: string) => void;
}

export default function MelodyInput({ length, degrees, mobile, onReplay, onSubmit }: Props) {
  const [entered, setEntered] = useState<string[]>([]);
  const full = entered.length === length;

  const add = (d: string) => setEntered((e) => (e.length < length ? [...e, d] : e));
  const undo = () => setEntered((e) => e.slice(0, -1));
  const check = () => { if (full) onSubmit(encodeMelody(entered)); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (degrees.includes(e.key)) { e.preventDefault(); add(e.key); }
      else if (e.key === 'Backspace') { e.preventDefault(); undo(); }
      else if (e.key === 'Enter' && full) { e.preventDefault(); check(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const slot = mobile ? 46 : 58;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: mobile ? 14 : 20 }}>
      <div role="list" aria-label="Your melody" style={{ display: 'flex', gap: mobile ? 8 : 12 }}>
        {Array.from({ length }, (_, i) => (
          <div
            key={i}
            role="listitem"
            aria-label={entered[i] ? `Note ${i + 1}: ${entered[i]}` : `Note ${i + 1}: empty`}
            style={{
              width: slot,
              height: slot,
              borderRadius: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `2px ${entered[i] ? 'solid var(--ink-1)' : 'dashed var(--ink-4)'}`,
              background: entered[i] ? (entered[i] === '1' ? 'var(--ink-1)' : 'var(--card)') : 'transparent',
              color: entered[i] === '1' ? 'var(--page)' : 'var(--ink-1)',
              font: `700 ${mobile ? 22 : 28}px/1 var(--disp)`,
            }}
          >
            {entered[i] ?? ''}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${degrees.length}, 1fr)`, gap: mobile ? 6 : 10, width: '100%' }}>
        {degrees.map((d) => (
          <button
            key={d}
            type="button"
            aria-label={`Degree ${d}`}
            disabled={full}
            onClick={() => add(d)}
            style={{
              height: mobile ? 52 : 64,
              borderRadius: 16,
              border: '2px solid var(--ink-1)',
              background: d === '1' ? 'var(--ink-1)' : 'var(--page-2)',
              color: d === '1' ? 'var(--page)' : 'var(--ink-1)',
              font: `700 ${mobile ? 20 : 24}px/1 var(--disp)`,
              cursor: full ? 'default' : 'pointer',
              opacity: full ? 0.45 : 1,
            }}
          >
            {d}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, width: '100%' }}>
        <Bean tone="soft" size={mobile ? 'md' : 'lg'} onClick={onReplay}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><PlayIcon size={16} /> again</span>
        </Bean>
        <Bean tone="soft" size={mobile ? 'md' : 'lg'} onClick={undo} disabled={entered.length === 0} title="Remove the last note">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Delete size={16} /> undo</span>
        </Bean>
        <Bean tone="ink" size={mobile ? 'md' : 'lg'} onClick={check} disabled={!full} style={{ flex: 1, justifyContent: 'center' }}>
          check
        </Bean>
      </div>
    </div>
  );
}
