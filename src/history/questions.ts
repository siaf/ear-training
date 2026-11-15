// Questions for the History path. A lesson's items say what's practised:
//   hx_era    'cmp_bach'          a composer: which era?
//   hx_quiz   'fact_opera_birth'  a fact: pick the right answer of four
//   hx_hear   'style_baroque'     a style: hear a short passage, name the style
// Content is in src/history/content.ts; the passages are made in src/history/styles.ts.

import type { CurriculumLevel } from '../types';
import type { BuiltQuestion, Rng } from '../notation/questions';
import { COMPOSERS, ERAS, ERA_INFO, FACTS, type Era } from './content';
import { STYLES, STYLE_INFO, makePassage, type Style } from './styles';

export function historyLabel(key: string): string | null {
  let m: RegExpExecArray | null;
  if ((m = /^era_(.+)$/.exec(key)) && m[1] in ERA_INFO) return ERA_INFO[m[1] as Era].name;
  if ((m = /^cmp_(.+)$/.exec(key)) && COMPOSERS[m[1]]) return COMPOSERS[m[1]].name;
  if ((m = /^fact_(.+)_(\d)$/.exec(key)) && FACTS[m[1]]) return FACTS[m[1]].options[+m[2]];
  if ((m = /^fact_(.+)$/.exec(key)) && FACTS[m[1]]) return FACTS[m[1]].title;
  if ((m = /^style_(.+)$/.exec(key)) && (STYLES as readonly string[]).includes(m[1])) return STYLE_INFO[m[1] as Style].name;
  return null;
}

/** Answer chip for a composer: their era. */
export const eraAnswer = (item: string) => `era_${COMPOSERS[item.replace('cmp_', '')].era}`;
/** Eras in time order, for sorting answer chips. */
export const eraOrder = (key: string) => ERAS.indexOf(key.replace('era_', '') as Era);

const blank = { staves: undefined, sound: [] as string[] };

function buildEra(item: string): BuiltQuestion {
  const c = COMPOSERS[item.replace('cmp_', '')];
  const era = ERA_INFO[c.era];
  return {
    correctAnswer: `era_${c.era}`,
    rootNote: 'C',
    responseMode: 'select',
    visual: {
      ...blank,
      prompt: 'Which era is this composer from?',
      card: { text: c.name, after: `${c.dates} · ${c.known}` },
      explain: `${c.name} (${c.dates}): the ${era.name} era, ${era.dates}, known for ${era.hallmark}. ${c.short === c.name ? 'Known' : `${c.short} is known`} for ${c.known}.`,
    },
  };
}

function buildQuiz(item: string, rng: Rng): BuiltQuestion {
  const id = item.replace('fact_', '');
  const f = FACTS[id];
  const order = [0, 1, 2, 3];
  for (let k = 3; k > 0; k--) {
    const j = Math.floor(rng() * (k + 1));
    [order[k], order[j]] = [order[j], order[k]];
  }
  return {
    correctAnswer: `fact_${id}_0`,
    rootNote: 'C',
    responseMode: 'select',
    visual: { ...blank, prompt: f.prompt, choices: order.map((i) => ({ key: `fact_${id}_${i}` })), explain: f.explain },
  };
}

function buildHear(item: string, rng: Rng): BuiltQuestion {
  const style = item.replace('style_', '') as Style;
  const info = STYLE_INFO[style];
  return {
    correctAnswer: item,
    rootNote: 'C',
    responseMode: 'select',
    visual: {
      ...blank,
      prompt: 'Which style is this?',
      card: { text: '🎧 Listen', after: info.era },
      explain: `${info.name}: ${info.hallmark}`,
      passage: makePassage(style, rng),
      listen: true,
    },
  };
}

export function buildHistoryQuestion(level: CurriculumLevel, item: string, rng: Rng): BuiltQuestion {
  switch (level.visualKind) {
    case 'hx_era': return buildEra(item);
    case 'hx_quiz': return buildQuiz(item, rng);
    case 'hx_hear': return buildHear(item, rng);
    default: throw new Error(`${level.id} is not a history lesson`);
  }
}
