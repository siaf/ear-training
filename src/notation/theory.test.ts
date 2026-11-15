import { describe, expect, it } from 'vitest';
import {
  CLEFS,
  buildTriad,
  clefRefP,
  intervalBetween,
  invert,
  keyAccidental,
  midiOf,
  noteAscii,
  noteAtPosition,
  parseNote,
  positionsOfMidi,
  signaturePositions,
  soundingPitch,
  staffPosition,
  transpose,
  triadQuality,
  writtenPitch,
  type ClefId,
} from './theory';

const n = parseNote;
const name = (clef: ClefId, p: number) => noteAscii(noteAtPosition(p, clef));

describe('clefs', () => {
  it('names the lines of the common clefs', () => {
    expect([0, 2, 4, 6, 8].map((p) => name('treble', p))).toEqual(['E4', 'G4', 'B4', 'D5', 'F5']);
    expect([0, 2, 4, 6, 8].map((p) => name('bass', p))).toEqual(['G2', 'B2', 'D3', 'F3', 'A3']);
    expect([0, 2, 4, 6, 8].map((p) => name('alto', p))).toEqual(['F3', 'A3', 'C4', 'E4', 'G4']);
    expect([0, 2, 4, 6, 8].map((p) => name('tenor', p))).toEqual(['D3', 'F3', 'A3', 'C4', 'E4']);
  });

  it('puts each clef sign on the note it is named after', () => {
    for (const c of Object.values(CLEFS)) {
      expect(noteAtPosition(clefRefP(c.id), c.id).letter).toBe('CDEFGAB'.indexOf(c.sign));
    }
  });

  it('puts middle C one ledger line below treble, above bass, and wherever a C clef points', () => {
    expect(staffPosition(n('C4'), 'treble')).toBe(-2);
    expect(staffPosition(n('C4'), 'bass')).toBe(10);
    for (const id of ['soprano', 'mezzo', 'alto', 'tenor', 'baritone'] as const) {
      expect(staffPosition(n('C4'), id)).toBe(clefRefP(id));
    }
  });

  it('reads the octave-down treble clef an octave lower', () => {
    expect(name('treble8vb', 0)).toBe('E3');
    expect(staffPosition(n('E2'), 'treble8vb')).toBe(-7);
  });
});

describe('intervals', () => {
  it('spells intervals by letter and counts half steps', () => {
    expect(noteAscii(transpose(n('C4'), 3, 4))).toBe('E4');
    expect(noteAscii(transpose(n('D4'), 3, 4))).toBe('F#4');
    expect(noteAscii(transpose(n('F4'), 4, 6))).toBe('B4');
    expect(noteAscii(transpose(n('Bb3'), 5, 7))).toBe('F4');
    expect(noteAscii(transpose(n('E4'), 2, 2, -1))).toBe('D4');
  });

  it('names intervals between spelled notes', () => {
    expect(intervalBetween(n('C4'), n('E4'))).toBe('major_3rd');
    expect(intervalBetween(n('E4'), n('G4'))).toBe('minor_3rd');
    expect(intervalBetween(n('B3'), n('F4'))).toBe('tritone');
    expect(intervalBetween(n('F4'), n('B4'))).toBe('tritone');
    expect(intervalBetween(n('C4'), n('C5'))).toBe('octave');
    expect(intervalBetween(n('C4'), n('Fb4'))).toBeNull(); // a diminished 4th: not one we teach
  });
});

describe('triads', () => {
  it('builds spelled triads of each quality', () => {
    expect(buildTriad(n('D4'), 'major').map((x) => noteAscii(x))).toEqual(['D4', 'F#4', 'A4']);
    expect(buildTriad(n('B3'), 'diminished').map((x) => noteAscii(x))).toEqual(['B3', 'D4', 'F4']);
    expect(buildTriad(n('C4'), 'augmented').map((x) => noteAscii(x))).toEqual(['C4', 'E4', 'G#4']);
    expect(triadQuality(buildTriad(n('Eb4'), 'minor'))).toBe('minor');
  });

  it('inverts by moving the lowest notes up an octave', () => {
    expect(invert(buildTriad(n('C4'), 'major'), 1).map((x) => noteAscii(x))).toEqual(['E4', 'G4', 'C5']);
    expect(invert(buildTriad(n('C4'), 'major'), 2).map((x) => noteAscii(x))).toEqual(['G4', 'C5', 'E5']);
  });
});

describe('key signatures', () => {
  it('applies sharps and flats in order', () => {
    expect(keyAccidental(3, 1)).toBe(1); // F♯ in G
    expect(keyAccidental(0, 1)).toBe(0);
    expect(keyAccidental(0, 2)).toBe(1); // C♯ in D
    expect(keyAccidental(6, -1)).toBe(-1); // B♭ in F
    expect(keyAccidental(2, -1)).toBe(0);
    expect(keyAccidental(2, -2)).toBe(-1); // E♭ in B♭
  });

  it('puts the signature where engravers do', () => {
    // Treble: F♯ on the top line, C♯ in the third space; bass two steps lower.
    expect(signaturePositions(2, 'treble')).toEqual([8, 5]);
    expect(signaturePositions(2, 'bass')).toEqual([6, 3]);
    expect(signaturePositions(-1, 'treble')).toEqual([4]); // B♭ on the middle line
    for (const clef of ['treble', 'bass', 'alto'] as const) {
      for (const [sig, letters] of [[7, [3, 0, 4, 1, 5, 2, 6]], [-7, [6, 2, 5, 1, 4, 0, 3]]] as const) {
        expect(signaturePositions(sig, clef).map((p) => noteAtPosition(p, clef).letter)).toEqual(letters);
      }
    }
  });
});

describe('transposing instruments', () => {
  it('sounds lower than written by the instrument interval', () => {
    expect(noteAscii(soundingPitch(n('C5'), 'bb_clarinet'))).toBe('Bb4');
    expect(noteAscii(soundingPitch(n('C5'), 'f_horn'))).toBe('F4');
    expect(noteAscii(soundingPitch(n('C5'), 'eb_alto_sax'))).toBe('Eb4');
    expect(noteAscii(writtenPitch(n('Bb4'), 'bb_trumpet'))).toBe('C5');
  });
});

describe('fretboard', () => {
  it('finds every spot with a pitch', () => {
    // E4 would be fret 14 on the D string, past fret 12, so it isn't listed.
    expect(positionsOfMidi(midiOf(n('E4')))).toEqual([{ s: 3, f: 9 }, { s: 4, f: 5 }, { s: 5, f: 0 }]);
  });
});
