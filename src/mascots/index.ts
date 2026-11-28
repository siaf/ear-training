// The four mascots as animatable drawings. Each <key>.svg is the drawing, with every
// moving part in its own group, and <key>.json lists its faces, actions and framing.
// design/STYLE.md says how they're drawn; design/mascots.html auditions them.
import fableSvg from './fable.svg?raw';
import noirSvg from './noir.svg?raw';
import majorSvg from './major.svg?raw';
import pulseSvg from './pulse.svg?raw';
import fable from './fable.json';
import noir from './noir.json';
import major from './major.json';
import pulse from './pulse.json';
import type { Mascot, MascotExpression } from '../types';

/** The faces every mascot has (design/STYLE.md), each meaning the same thing on all four. */
export type MascotFace =
  | 'neutral' | 'happy' | 'excited' | 'laugh' | 'curious' | 'listening'
  | 'content' | 'sad' | 'surprised' | 'sing' | 'keeping-time';

export type MascotView = 'full' | 'bust';

export interface FaceDef { eyes: string; mouth: string; blush?: string; fx?: string; extra?: Record<string, string> }
export interface ActDef { label: string; face: string; anim: string; ms: number; fx?: string }
export interface MascotDef {
  svg: string;
  name: string;
  viewBox: Record<MascotView, string>;
  blinkEyes: string[];
  faces: Record<string, FaceDef>;
  acts: Record<string, ActDef>;
}

export const MASCOTS: Record<Mascot, MascotDef> = {
  fable: { ...fable, svg: fableSvg } as MascotDef,
  noir: { ...noir, svg: noirSvg } as MascotDef,
  major: { ...major, svg: majorSvg } as MascotDef,
  pulse: { ...pulse, svg: pulseSvg } as MascotDef,
};

// Not every mascot has every action: Major keeps time by drumming on the book, Noir
// keeps it calmly, and only Fable conducts. Asking for one a mascot lacks plays its
// nearest equivalent, or nothing.
const FALLBACK: Record<string, string[]> = {
  beat: ['beat', 'drum', 'metronome'],
  drum: ['drum', 'beat'],
  metronome: ['metronome', 'beat', 'drum'],
  conduct: ['conduct', 'beat', 'drum'],
  wave: ['wave', 'welcome', 'slowblink'],
  welcome: ['welcome', 'wave', 'slowblink'],
  celebrate: ['streak', 'correct'],
};

export function resolveAct(mascot: Mascot, act: string): ActDef | null {
  const acts = MASCOTS[mascot].acts;
  for (const k of FALLBACK[act] ?? [act]) if (acts[k]) return acts[k];
  return null;
}

/** The lesson-intro expressions predate the shared face list; "portrait" is the neutral face. */
export function faceForExpression(e: MascotExpression | undefined): MascotFace {
  return !e || e === 'portrait' ? 'neutral' : e;
}

/** How each mascot says hello as a screen opens, in character. */
export const GREETING: Record<Mascot, string> = {
  fable: 'wave', noir: 'slowblink', major: 'welcome', pulse: 'beat',
};

/** What a tap on a mascot plays, one move after another: mostly its music moves. */
export const TAP_MOVES: Record<Mascot, string[]> = {
  fable: ['conduct', 'sing', 'beat', 'correct'],
  noir: ['beat', 'ear', 'pitch-up', 'slowblink'],
  major: ['drum', 'sing', 'proud', 'correct'],
  pulse: ['beat', 'drum', 'metronome', 'streak'],
};

/** Major's reaction to a finished session: proud of a good score, never sad about a low one. */
export function resultsReaction(accuracy: number): { face: MascotFace; act: string } {
  if (accuracy >= 90) return { face: 'happy', act: 'correct' };
  if (accuracy >= 75) return { face: 'content', act: 'proud' };
  return { face: 'neutral', act: 'track' };
}
