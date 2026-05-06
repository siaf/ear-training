// Curated mid-section / end-of-section checkpoint mixes.
//
// A checkpoint becomes available when every lesson in `levelIds` is completed.
// The Path screen renders one tile per available checkpoint — tapping launches
// an interleave session limited to that checkpoint's lessons. Multiple checkpoints
// can be available at once; supersession (`supersedes`) hides the smaller ones once
// a larger encompassing checkpoint comes online, so the user sees a clean ladder
// rather than 6 redundant tiles.
//
// Why curate (vs. auto-grouping by segment): segment-completion is too coarse —
// Intervals has 18 lessons, and the user clearly benefits from a "fourths/fifths/
// thirds mix" before they've cleared every harmonic and melodic 7th. The cluster
// boundaries are pedagogical (consonant vs dissonant intervals, triads vs sevenths,
// diatonic-degree chord tones) and live in this list so they can evolve without
// touching engine code.

import { CURRICULUM } from '../curriculum';
import type { CurriculumLevel } from '../types';

export interface Checkpoint {
  id: string;
  /** User-facing title shown on the tile and in the session intro. */
  name: string;
  /** One-line description for the tile body. */
  description: string;
  /** Segment this checkpoint belongs to — used for tile coloring and grouping. */
  segmentId: string;
  /** Source lessons sampled across in the mix. All must be completed for the tile to show. */
  levelIds: string[];
  /** Earlier checkpoints whose tiles should be hidden once this one is available. */
  supersedes?: string[];
}

// Voice is omitted: sing-mode lessons don't render answer chips and the category
// gate has nothing to gate. Mixing them would just play sing prompts in shuffled order,
// which is fine pedagogically but doesn't fit the contextual-interference UX we built.
//
// Modal & Modern / Melodic Dictation / Sight Singing are also omitted — those segments
// are still empty stubs and there's nothing to mix yet.
export const CHECKPOINTS: Checkpoint[] = [
  // ---------- Foundations ----------
  {
    id: 'foundations_all',
    name: 'Foundations Mix',
    description: 'Higher / lower, same / different, beating, smooth / rough — all four ear primitives.',
    segmentId: 'foundations',
    levelIds: ['found_higher_lower', 'found_same_diff', 'found_beating', 'found_consonance'],
  },

  // ---------- Tonality ----------
  {
    id: 'tonality_basics_mix',
    name: 'Tonality Mix',
    description: 'Stable/unstable, tonic, major/minor, cadences — all key-feel skills.',
    segmentId: 'tonality',
    levelIds: ['ton_stable_unstable', 'ton_is_tonic', 'ton_major_minor_key', 'ton_cadence_basic'],
  },

  // ---------- Pitch / Scale Degrees ----------
  {
    id: 'pitch_major_mix',
    name: 'Major Scale Degrees Mix',
    description: 'All three major-degree levels mixed — 1-3-5, 1-5, full diatonic.',
    segmentId: 'pitch',
    levelIds: ['scale_degree_major_1', 'scale_degree_major_2', 'scale_degree_major_full'],
  },

  // ---------- Intervals ----------
  // Per-class clusters (3 lessons each: harm + mel-asc + mel-desc). Get superseded by
  // the consonant-mix once enough are done.
  {
    id: 'int_4ths_5ths_mix',
    name: 'Fourths & Fifths Mix',
    description: 'Harmonic plus both melodic directions — perfect 4ths and 5ths.',
    segmentId: 'intervals',
    levelIds: [
      'int_harmonic_4ths_5ths',
      'int_melodic_4ths_5ths_asc',
      'int_melodic_4ths_5ths_desc',
    ],
  },
  {
    id: 'int_3rds_mix',
    name: 'Thirds Mix',
    description: 'Harmonic plus both melodic directions — major and minor 3rds.',
    segmentId: 'intervals',
    levelIds: ['int_harmonic_3rds', 'int_melodic_3rds_asc', 'int_melodic_3rds_desc'],
  },
  {
    id: 'int_6ths_mix',
    name: 'Sixths Mix',
    description: 'Harmonic plus both melodic directions — major and minor 6ths.',
    segmentId: 'intervals',
    levelIds: ['int_harmonic_6ths', 'int_melodic_6ths_asc', 'int_melodic_6ths_desc'],
  },
  // Cumulative — hides the per-class consonant clusters above.
  {
    id: 'int_consonant_mix',
    name: 'Consonant Intervals Mix',
    description: '4ths, 5ths, 3rds, 6ths — every consonant interval class together.',
    segmentId: 'intervals',
    levelIds: [
      'int_harmonic_4ths_5ths', 'int_melodic_4ths_5ths_asc', 'int_melodic_4ths_5ths_desc',
      'int_harmonic_3rds', 'int_melodic_3rds_asc', 'int_melodic_3rds_desc',
      'int_harmonic_6ths', 'int_melodic_6ths_asc', 'int_melodic_6ths_desc',
    ],
    supersedes: ['int_4ths_5ths_mix', 'int_3rds_mix', 'int_6ths_mix'],
  },
  // Dissonant clusters — these are individually small enough to skip the per-class tier;
  // we go straight to the dissonant-mix milestone when all 9 lessons are done.
  {
    id: 'int_dissonant_mix',
    name: 'Dissonant Intervals Mix',
    description: '2nds, 7ths, tritones, major 7ths — the spiky end of the interval set.',
    segmentId: 'intervals',
    levelIds: [
      'int_harmonic_2nds', 'int_melodic_2nds_asc', 'int_melodic_2nds_desc',
      'int_harmonic_7ths', 'int_melodic_7ths_asc', 'int_melodic_7ths_desc',
      'int_harmonic_tritone_maj7', 'int_melodic_tritone_maj7_asc', 'int_melodic_tritone_maj7_desc',
    ],
  },
  // End-of-segment capstone — uses the three "All Intervals" levels (drawn from the full
  // chromatic set), supersedes the consonant + dissonant mixes.
  {
    id: 'int_all_mix',
    name: 'All Intervals Capstone',
    description: 'The three full-chromatic mixes — harmonic and both melodic directions.',
    segmentId: 'intervals',
    levelIds: ['int_all_harmonic', 'int_all_melodic_asc', 'int_all_melodic_desc'],
    supersedes: ['int_consonant_mix', 'int_dissonant_mix'],
  },

  // ---------- Chords ----------
  {
    id: 'chord_thirds_mix',
    name: 'Thirds-in-Scale Mix',
    description: 'Tonic, dominant, and all-thirds drills together.',
    segmentId: 'chords',
    levelIds: ['level_1', 'level_2', 'level_3'],
  },
  {
    id: 'chord_triads_mix',
    name: 'Triad Quality Mix',
    description: 'Tonic triads, dominant, all four diatonic qualities — chord-quality decision drills.',
    segmentId: 'chords',
    levelIds: ['level_4', 'level_5', 'level_6'],
  },
  {
    id: 'chord_inversions_mix',
    name: 'Inversions Mix',
    description: 'Triad and 7th-chord inversions — bass-note hearing.',
    segmentId: 'chords',
    levelIds: ['inv_triad_basic', 'inv_triad_full', 'inv_seventh'],
  },
  {
    id: 'chord_diatonic_mix',
    name: 'Diatonic Chord Tones Mix',
    description: 'Triads and 7ths on each scale degree, both modes — harmonic-degree mastery.',
    segmentId: 'chords',
    levelIds: [
      'scale_degree_major_triads',
      'scale_degree_minor_triads',
      'scale_degree_major_7ths',
      'scale_degree_minor_7ths',
    ],
  },

  // ---------- Cadences & Progressions ----------
  {
    id: 'progressions_mix',
    name: 'Progressions Mix',
    description: 'Cadences, pop progressions, ii-V-I, secondary dominants, modulations.',
    segmentId: 'progressions',
    levelIds: [
      'cad_full',
      'prog_pop_diatonic',
      'prog_jazz_cadence',
      'prog_secondary_dominants',
      'prog_modulation_pivot',
    ],
  },

  // ---------- Jazz Harmony ----------
  {
    id: 'jazz_mix',
    name: 'Jazz Harmony Mix',
    description: 'Extensions, alterations, modal interchange, voicings.',
    segmentId: 'jazz_harmony',
    levelIds: [
      'jazz_dom_extensions',
      'jazz_altered_dominants',
      'jazz_modal_interchange',
      'jazz_voicings',
    ],
  },

  // ---------- Rhythm ----------
  {
    id: 'rhythm_mix',
    name: 'Rhythm Mix',
    description: 'Same/different, tap-back, subdivisions, meter, dictation.',
    segmentId: 'rhythm',
    levelIds: ['rhy_same_diff', 'rhy_tap_back', 'rhy_subdivisions', 'rhy_meter', 'rhy_dictation'],
  },
];

/**
 * Filter to checkpoints the user can take right now: every constituent lesson is
 * completed, AND no later checkpoint with the same supersedes coverage is available
 * (so we don't show "Thirds Mix" + "Consonant Mix" as separate tiles when both qualify).
 *
 * Lessons that have been removed from the curriculum (renamed in a refactor, etc.) are
 * silently treated as missing, so a stale checkpoint id never crashes Path render.
 */
export function getAvailableCheckpoints(completedLevels: string[]): Checkpoint[] {
  const completedSet = new Set(completedLevels);
  const curriculumIds = new Set(CURRICULUM.map((l) => l.id));
  const isAvailable = (cp: Checkpoint) =>
    cp.levelIds.every((id) => completedSet.has(id) && curriculumIds.has(id));
  const all = CHECKPOINTS.filter(isAvailable);
  // Apply supersession — if any available checkpoint supersedes this one, hide it.
  const supersededIds = new Set<string>();
  for (const cp of all) {
    cp.supersedes?.forEach((id) => supersededIds.add(id));
  }
  return all.filter((cp) => !supersededIds.has(cp.id));
}

/** Source level objects for a checkpoint — used to compute display details (e.g. category set). */
export function checkpointSources(cp: Checkpoint): CurriculumLevel[] {
  return cp.levelIds
    .map((id) => CURRICULUM.find((l) => l.id === id))
    .filter((l): l is CurriculumLevel => !!l);
}
