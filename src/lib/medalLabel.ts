// The lesson name on the mastery medal, which has room for about 24 characters per line
// inside its dotted ring. Interval names use the shorthand musicians read at a glance
// (P4, P5, P8, TT, M7) and arrows for direction; anything still too long goes on two lines.

const MAX_LINE = 24;

const SHORTHAND: [RegExp, string][] = [
  [/fourths, fifths and octaves/, 'P4, P5 & P8'],
  [/tritones and major sevenths/, 'TT & M7'],
  [/ \(ascending\)$/, ' ↑'],
  [/ \(descending\)$/, ' ↓'],
  [/^(melodic|harmonic): /, '$1 '],
];

// A chord's Roman numeral says major (I) or minor (i), so its case has to stay.
const ROMAN = /^[IViv]+(-[IViv]+)*$/;

/** Lower case, apart from Roman numerals. */
function lowerCase(name: string): string {
  return name
    .split(' ')
    .map((word) => (ROMAN.test(word.replace(/[(),:?]/g, '')) ? word : word.toLowerCase()))
    .join(' ');
}

/** One or two lines, lower case apart from Roman numerals and the interval shorthand. */
export function medalLabel(name: string): string[] {
  let label = lowerCase(name);
  for (const [pattern, short] of SHORTHAND) label = label.replace(pattern, short);
  if (label.length <= MAX_LINE) return [label];
  // Two lines, split at the space that makes them most even.
  const words = label.split(' ');
  let best: string[] = [label];
  let bestLongest = Infinity;
  for (let i = 1; i < words.length; i++) {
    const lines = [words.slice(0, i).join(' '), words.slice(i).join(' ')];
    const longest = Math.max(...lines.map((l) => l.length));
    if (longest < bestLongest) { best = lines; bestLongest = longest; }
  }
  return best;
}
