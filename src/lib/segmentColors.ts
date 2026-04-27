/* Maps curriculum segment colors (Tailwind palette names) to the playful palette.
   Keeps curriculum.ts untouched — new view layer only. */

export type SegmentPalette = {
  bg: string;
  ink: string;
  soft: string;
};

const PLAYFUL: Record<string, SegmentPalette> = {
  coral:  { bg: 'var(--coral)',  ink: 'var(--coral-ink)',  soft: 'var(--coral-soft)' },
  lav:    { bg: 'var(--lav)',    ink: 'var(--lav-ink)',    soft: 'var(--lav-soft)' },
  mint:   { bg: 'var(--mint)',   ink: 'var(--mint-ink)',   soft: 'var(--mint-soft)' },
  butter: { bg: 'var(--butter)', ink: 'var(--butter-ink)', soft: 'var(--butter-soft)' },
  sky:    { bg: 'var(--sky)',    ink: 'var(--sky-ink)',    soft: 'var(--sky-soft)' },
};

// Rotation for any unmapped legacy Tailwind color → cycle through palette deterministically.
const ROTATION = ['coral', 'lav', 'mint', 'butter', 'sky'] as const;

const TAILWIND_TO_PALETTE: Record<string, keyof typeof PLAYFUL> = {
  purple: 'coral',
  violet: 'lav',
  green:  'mint',
  yellow: 'butter',
  amber:  'butter',
  orange: 'coral',
  red:    'coral',
  rose:   'coral',
  pink:   'coral',
  blue:   'sky',
  sky:    'sky',
  cyan:   'sky',
  indigo: 'lav',
  teal:   'mint',
  emerald:'mint',
  lime:   'butter',
  fuchsia:'lav',
  slate:  'lav',
  zinc:   'lav',
  stone:  'butter',
};

export function segmentColor(tailwindColor: string, fallbackIndex = 0): SegmentPalette {
  const mapped = TAILWIND_TO_PALETTE[tailwindColor];
  if (mapped) return PLAYFUL[mapped];
  const fallback = ROTATION[fallbackIndex % ROTATION.length];
  return PLAYFUL[fallback];
}

export function playfulToken(name: keyof typeof PLAYFUL): SegmentPalette {
  return PLAYFUL[name];
}

// Per brand kit: each mascot owns one signature color.
// Fable/coral, Noir/mint, Major/butter, Pulse/sky. Lav has no dedicated mascot,
// so we fall back to Fable (the onboarding/primary character).
export type MascotName = 'fable' | 'noir' | 'major' | 'pulse';
const MASCOT_BY_PALETTE: Record<keyof typeof PLAYFUL, MascotName> = {
  coral:  'fable',
  mint:   'noir',
  butter: 'major',
  sky:    'pulse',
  lav:    'fable',
};
export function mascotForColor(tailwindColor: string): MascotName {
  const key = TAILWIND_TO_PALETTE[tailwindColor] ?? 'coral';
  return MASCOT_BY_PALETTE[key];
}
