// The question area for Read Music and Guitar lessons: the instruction, the staff and/or
// fretboard, tap-to-answer controls, and after answering, what the right answer was and
// how to read it. Answer buttons (for select questions) stay in Practice.tsx.

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Volume2 } from 'lucide-react';
import type { Question } from '../../types';
import { getDisplayName } from '../../curriculum';
import Staff, { type OverlayNote } from './Staff';
import Fretboard, { type Dot } from './Fretboard';
import RhythmStaff, { type NoteMark } from '../rhythm/RhythmStaff';
import RhythmReadPad, { type TapOutcome } from '../rhythm/RhythmReadPad';
import { sounds as soundsAt } from '../../rhythm/model';
import { fretMidi, midiToTone, noteAscii, noteAtPosition, parsePos, posKey, type ClefId } from '../../notation/theory';

const ACC_NUM = { sharp: 1, flat: -1, natural: 0, dsharp: 2, dflat: -2 } as const;

interface Props {
  question: Question;
  showFeedback: boolean;
  feedbackPending: boolean;
  mobile: boolean;
  onAnswer: (answer: string) => void;
  onReplay: () => void;
}

export default function VisualPrompt({ question, showFeedback, feedbackPending, mobile, onAnswer, onReplay }: Props) {
  const v = question.visual!;
  const answered = showFeedback || feedbackPending;
  const [placed, setPlaced] = useState<number | null>(null);
  const [tapped, setTapped] = useState<string | null>(null);
  const [tapResult, setTapResult] = useState<TapOutcome | null>(null);

  // Listening questions play as soon as they're up.
  useEffect(() => {
    if (v.listen) void onReplay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id]);

  const staffTap = v.tap?.target === 'staff' ? v.tap : null;
  const fretTap = v.tap?.target === 'fret' ? v.tap : null;

  const check = () => {
    if (!staffTap || placed === null || answered) return;
    // A wrong placement is recorded as the note it would be, so results can say "you said D4".
    const clef = (v.staves?.[staffTap.staff]?.clef ?? 'treble') as ClefId;
    const placedNote = noteAscii(noteAtPosition(placed, clef, staffTap.acc ? ACC_NUM[staffTap.acc] : 0));
    onAnswer(staffTap.accept.includes(placed) ? question.correctAnswer : placedNote);
  };
  const nudge = (d: number) => {
    if (!staffTap || answered) return;
    const start = placed ?? Math.round((staffTap.range[0] + staffTap.range[1]) / 2);
    setPlaced(Math.max(staffTap.range[0], Math.min(staffTap.range[1], placed === null ? start : start + d)));
  };

  // Arrow keys move the note, Enter checks it.
  useEffect(() => {
    if (!staffTap || answered) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        nudge(e.key === 'ArrowUp' ? 1 : -1);
      } else if ((e.key === 'Enter' || e.key === ' ') && placed !== null) {
        e.preventDefault();
        check();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // --- Staff overlays: what to add once answered.
  const overlay: OverlayNote[] = [];
  if (answered && staffTap && placed !== null) {
    const right = staffTap.accept.includes(placed);
    overlay.push({ staff: staffTap.staff, p: placed, acc: staffTap.acc, col: 0, tone: right ? 'ok' : 'bad' });
    if (!right) for (const n of v.reveal?.staffNotes ?? []) overlay.push({ ...n, col: 1, tone: 'ok' });
  } else if (answered && !staffTap) {
    for (const n of v.reveal?.staffNotes ?? []) overlay.push({ ...n, tone: 'ok' });
  }

  // --- Fretboard dots.
  const dots: Dot[] = [];
  if (v.fretboard) {
    for (const m of v.fretboard.marks) {
      // Once a named note is answered, its dot turns green and shows its name
      // (one spelling: 'G♯', not 'G♯/A♭', so it fits).
      const named = answered && question.responseMode === 'select' && m.kind === 'target';
      const state = m.kind === 'root' ? 'root' : named ? 'reveal' : m.kind === 'ghost' ? 'ghost' : 'target';
      const label = answered && m.after ? m.after : named ? getDisplayName(question.correctAnswer).split('/')[0] : m.label;
      dots.push({ s: m.s, f: m.f, state, label });
    }
    if (answered && fretTap) {
      const right = tapped !== null && fretTap.accept.includes(tapped);
      for (const m of v.reveal?.fretMarks ?? []) {
        if (posKey(m) !== tapped) dots.push({ s: m.s, f: m.f, state: 'reveal', label: m.label });
      }
      if (tapped) dots.push({ ...parsePos(tapped), state: right ? 'ok' : 'bad', label: right ? v.reveal?.fretMarks?.[0]?.label : '✕' });
    }
  }

  const pictureLabel = v.prompt;
  const hasStaff = !!v.staves?.length;
  const hasNeck = !!v.fretboard;

  return (
    // margin auto centres it vertically when there's room, and lets it scroll from the top when there isn't.
    <div style={{ width: '100%', maxWidth: hasNeck ? 860 : 520, margin: 'auto 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: mobile ? 8 : 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        <h2
          style={{
            margin: 0,
            fontSize: mobile ? 19 : 28,
            color: 'var(--ink-1)',
            fontFamily: 'var(--disp)',
            fontWeight: 600,
            lineHeight: 1.15,
            textAlign: 'center',
          }}
        >
          {v.prompt}
        </h2>
        {!(v.tapRhythm && !answered) && (v.sound.length > 0 || v.rhythmPlay || v.passage || v.chords) && <button
          onClick={onReplay}
          aria-label="Hear it"
          title="Hear it"
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            border: '1px solid var(--hairline)',
            background: 'var(--page-2)',
            color: 'var(--ink-2)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <Volume2 size={17} strokeWidth={2.2} />
        </button>}
      </div>

      {v.card && (
        <div
          data-card
          style={{ width: '100%', maxWidth: 520, background: 'var(--card)', borderRadius: 18, border: '1px solid var(--hairline)', padding: mobile ? '18px 16px' : '26px 22px', boxSizing: 'border-box', textAlign: 'center' }}
        >
          <div style={{ fontFamily: 'var(--disp)', fontWeight: 700, fontSize: mobile ? 24 : 30, color: 'var(--ink-1)', lineHeight: 1.2 }}>{v.card.text}</div>
          {answered && v.card.after && <div style={{ marginTop: 8, fontSize: 14, color: 'var(--ink-2)', fontFamily: 'var(--ui)' }}>{v.card.after}</div>}
        </div>
      )}

      {v.rhythm && (
        <div style={{ width: '100%', background: 'var(--card)', borderRadius: 18, border: '1px solid var(--hairline)', padding: mobile ? '6px 8px' : '10px 18px', boxSizing: 'border-box' }}>
          <RhythmStaff
            notes={v.rhythm.notes}
            time={v.rhythm.time}
            free={v.rhythm.free}
            ariaLabel={pictureLabel}
            marks={v.rhythm.notes.map((_, i): NoteMark | undefined => {
              if (tapResult) {
                const k = v.rhythm!.notes.slice(0, i + 1).filter((__, j) => soundsAt(v.rhythm!.notes, j)).length - 1;
                return soundsAt(v.rhythm!.notes, i) ? (tapResult.hits[k] ? 'ok' : 'bad') : undefined;
              }
              if (i === v.rhythm!.mark) return answered ? 'reveal' : 'ask';
              return undefined;
            })}
            counts={answered ? v.rhythm.counts : undefined}
          />
        </div>
      )}

      {v.choices?.some((c) => c.rhythm) && (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: mobile ? 6 : 10 }}>
          {v.choices.map((c) => {
            const right = answered && c.key === question.correctAnswer;
            return (
              <div
                key={c.key}
                data-choice={c.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'var(--card)',
                  borderRadius: 14,
                  border: `2px solid ${right ? 'var(--mint-ink)' : 'var(--hairline)'}`,
                  padding: mobile ? '2px 8px' : '4px 14px',
                }}
              >
                <span style={{ fontFamily: 'var(--disp)', fontWeight: 700, fontSize: 18, color: right ? 'var(--mint-ink)' : 'var(--ink-2)', width: 18 }}>
                  {getDisplayName(c.key)}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <RhythmStaff notes={c.rhythm!.notes} time={c.rhythm!.time} compact ariaLabel={`Rhythm ${getDisplayName(c.key)}`} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {v.tapRhythm && !answered && (
        <RhythmReadPad
          key={question.id}
          spec={v.tapRhythm}
          mobile={mobile}
          onDone={(r) => {
            setTapResult(r);
            onAnswer(r.passed ? question.correctAnswer : 'tap_miss');
          }}
        />
      )}
      {v.tapRhythm && answered && tapResult && (
        <div style={{ fontSize: 14, color: 'var(--ink-2)', fontFamily: 'var(--ui)', textAlign: 'center' }} data-tap-summary>
          {tapResult.hits.filter(Boolean).length} of {tapResult.hits.length} notes on time
          {tapResult.extra > 0 ? `, ${tapResult.extra} extra tap${tapResult.extra > 1 ? 's' : ''}` : ''}.
          {Math.abs(tapResult.shiftMs) >= 40 ? ` Your taps ran a steady ${Math.abs(tapResult.shiftMs)} ms ${tapResult.shiftMs > 0 ? 'late' : 'early'}; that's allowed for.` : ''}
        </div>
      )}

      {hasStaff && (
        <div
          style={{
            width: '100%',
            background: 'var(--card)',
            borderRadius: 18,
            border: '1px solid var(--hairline)',
            padding: mobile ? '8px 10px' : hasNeck ? '8px 18px' : '14px 18px',
            boxSizing: 'border-box',
          }}
        >
          <Staff
            staves={v.staves!}
            grand={v.grand}
            score={v.score}
            overlay={overlay}
            showRoot={answered}
            labelLine={answered ? v.reveal?.labelLine : undefined}
            tap={staffTap ? { staff: staffTap.staff, range: staffTap.range, value: answered ? null : placed, acc: staffTap.acc, onChange: setPlaced, disabled: answered } : undefined}
            ariaLabel={pictureLabel}
            maxHeight={v.score ? (mobile ? '38vh' : '52vh') : hasNeck ? (mobile ? '16vh' : '18vh') : mobile ? '28vh' : '38vh'}
          />
        </div>
      )}

      {hasNeck && (
        <div style={{ width: '100%', maxWidth: hasStaff ? 720 : undefined }}>
          <Fretboard
            dots={dots}
            strings={v.fretboard!.strings}
            focusFret={v.fretboard!.focusFret}
            ariaLabel={pictureLabel}
            showStringNames={answered}
            neck={v.fretboard!.neck}
            onTap={
              fretTap && !answered
                ? (tap) => {
                    const pos = v.fretboard!.neck === 'bass' ? { ...tap, n: 'bass' as const } : tap;
                    const k = posKey(pos);
                    setTapped(k);
                    onAnswer(fretTap.accept.includes(k) ? question.correctAnswer : midiToTone(fretMidi(pos)));
                  }
                : undefined
            }
          />
        </div>
      )}

      {staffTap && !answered && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <RoundButton label="Move the note down" onClick={() => nudge(-1)}>
            <ChevronDown size={20} strokeWidth={2.5} />
          </RoundButton>
          <RoundButton label="Move the note up" onClick={() => nudge(1)}>
            <ChevronUp size={20} strokeWidth={2.5} />
          </RoundButton>
          <button
            onClick={check}
            disabled={placed === null}
            style={{
              padding: '10px 22px',
              borderRadius: 999,
              border: 'none',
              background: placed === null ? 'var(--ink-5)' : 'var(--ink-1)',
              color: placed === null ? 'var(--ink-3)' : 'var(--page)',
              fontFamily: 'var(--ui)',
              fontWeight: 700,
              fontSize: 15,
              cursor: placed === null ? 'not-allowed' : 'pointer',
            }}
          >
            {placed === null ? 'tap the staff' : 'check'}
          </button>
        </div>
      )}

    </div>
  );
}

function RoundButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      style={{
        width: 42,
        height: 42,
        borderRadius: '50%',
        border: '1px solid var(--hairline)',
        background: 'var(--page-2)',
        color: 'var(--ink-1)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}
