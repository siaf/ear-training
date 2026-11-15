// The images the share pictures draw (see shareCards.ts), from the app's own files, so the
// canvas stays exportable.
import type { CardArt } from './shareCards';
import type { MascotName } from './segmentColors';

export function cardArt(mascot: MascotName, expression: 'excited' | 'happy' | 'laugh' = 'excited'): CardArt {
  const base = import.meta.env.BASE_URL;
  return {
    mascot: `${base}brand/mascots/${mascot}/${expression}.png`,
    logo: `${base}brand/logos/logo-horizontal-light.png`,
  };
}
