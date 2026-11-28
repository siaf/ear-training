import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GREETING, MASCOTS, TAP_MOVES, resolveAct, resultsReaction } from '.';
import type { Mascot } from '../types';

const sharedCss = readFileSync(resolve(__dirname, 'mascot.css'), 'utf8');
const SHARED_FACES = ['neutral', 'happy', 'excited', 'laugh', 'curious', 'listening', 'content', 'sad', 'surprised', 'sing', 'keeping-time'];
const RIG = ['figure', 'body', 'head', 'eyes', 'mouth'];

describe.each(Object.keys(MASCOTS) as Mascot[])('%s', (key) => {
  const def = MASCOTS[key];

  it('has every shared face, each drawn by the SVG', () => {
    for (const face of SHARED_FACES) {
      const f = def.faces[face];
      expect(f, face).toBeTruthy();
      // A face whose eyes or mouth the SVG doesn't draw would show a blank face.
      expect(def.svg, `${face} eyes`).toContain(`[data-eyes="${f.eyes}"]`);
      expect(def.svg, `${face} mouth`).toContain(`[data-mouth="${f.mouth}"]`);
      if (f.fx && f.fx !== 'none') expect(def.svg, `${face} fx`).toContain(`fx-${f.fx}`);
    }
  });

  it('names the parts the shared animations move', () => {
    for (const id of RIG) expect(def.svg).toContain(`id="${id}"`);
  });

  it('only plays actions that exist, with faces it has', () => {
    for (const [name, a] of Object.entries(def.acts)) {
      expect(def.faces[a.face], `${name} face`).toBeTruthy();
      const css = sharedCss + def.svg;
      expect(css, `${name} anim`).toContain(`.anim-${a.anim}`);
      expect(a.ms).toBeGreaterThan(0);
    }
  });

  it('can keep time, greet, and play every tap move', () => {
    expect(resolveAct(key, 'beat')).toBeTruthy();
    expect(resolveAct(key, GREETING[key]), GREETING[key]).toBeTruthy();
    for (const m of TAP_MOVES[key]) expect(resolveAct(key, m), m).toBeTruthy();
  });

  it('frames both views', () => {
    for (const v of ['full', 'bust'] as const) expect(def.viewBox[v].split(' ')).toHaveLength(4);
  });
});

it("Major has every results reaction, and none of them is sad", () => {
  for (const acc of [100, 80, 60, 20]) {
    const r = resultsReaction(acc);
    expect(resolveAct('major', r.act), r.act).toBeTruthy();
    expect(MASCOTS.major.faces[r.face]).toBeTruthy();
    expect(r.face).not.toBe('sad');
    expect(resolveAct('major', r.act)!.face).not.toBe('sad');
  }
});
