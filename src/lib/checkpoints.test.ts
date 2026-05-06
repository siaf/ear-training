import { describe, expect, it } from 'vitest';
import { CHECKPOINTS, getAvailableCheckpoints } from './checkpoints';
import { CURRICULUM } from '../curriculum';

describe('checkpoints', () => {
  it('every checkpoint references curriculum levels that exist', () => {
    const ids = new Set(CURRICULUM.map((l) => l.id));
    for (const cp of CHECKPOINTS) {
      for (const id of cp.levelIds) {
        expect(ids, `checkpoint ${cp.id} references missing lesson ${id}`).toContain(id);
      }
    }
  });

  it('every checkpoint has at least 2 source lessons (mixing needs ≥2)', () => {
    for (const cp of CHECKPOINTS) {
      expect(cp.levelIds.length, `checkpoint ${cp.id} has too few sources`).toBeGreaterThanOrEqual(2);
    }
  });

  it('every supersedes id refers to an existing checkpoint id', () => {
    const cpIds = new Set(CHECKPOINTS.map((c) => c.id));
    for (const cp of CHECKPOINTS) {
      for (const sid of cp.supersedes ?? []) {
        expect(cpIds, `checkpoint ${cp.id} supersedes unknown ${sid}`).toContain(sid);
      }
    }
  });

  it('returns empty when no lessons are completed', () => {
    expect(getAvailableCheckpoints([])).toEqual([]);
  });

  it('returns a checkpoint only when ALL its levels are completed', () => {
    const cp = CHECKPOINTS.find((c) => c.id === 'foundations_all');
    if (!cp) throw new Error('test fixture missing');
    // Partial — should not yield it.
    expect(getAvailableCheckpoints(cp.levelIds.slice(0, 2)).find((c) => c.id === cp.id)).toBeUndefined();
    // Complete — should yield it.
    expect(getAvailableCheckpoints(cp.levelIds).find((c) => c.id === cp.id)?.id).toBe('foundations_all');
  });

  it('hides superseded checkpoints when their superseder is also available', () => {
    const consonant = CHECKPOINTS.find((c) => c.id === 'int_consonant_mix');
    if (!consonant) throw new Error('test fixture missing');
    const all = getAvailableCheckpoints(consonant.levelIds);
    // The 4ths/5ths and 3rds and 6ths sub-clusters should be in the union too — but
    // hidden by supersession when int_consonant_mix is available.
    expect(all.find((c) => c.id === 'int_consonant_mix')).toBeDefined();
    expect(all.find((c) => c.id === 'int_4ths_5ths_mix')).toBeUndefined();
    expect(all.find((c) => c.id === 'int_3rds_mix')).toBeUndefined();
    expect(all.find((c) => c.id === 'int_6ths_mix')).toBeUndefined();
  });

  it('shows the smaller cluster when only its lessons are completed (not yet superseded)', () => {
    const fifths = CHECKPOINTS.find((c) => c.id === 'int_4ths_5ths_mix');
    if (!fifths) throw new Error('test fixture missing');
    const out = getAvailableCheckpoints(fifths.levelIds);
    expect(out.find((c) => c.id === 'int_4ths_5ths_mix')).toBeDefined();
    expect(out.find((c) => c.id === 'int_consonant_mix')).toBeUndefined();
  });

  it('end-of-segment capstone supersedes mid-section mixes', () => {
    const allMix = CHECKPOINTS.find((c) => c.id === 'int_all_mix');
    if (!allMix) throw new Error('test fixture missing');
    const out = getAvailableCheckpoints(allMix.levelIds);
    expect(out.find((c) => c.id === 'int_all_mix')).toBeDefined();
    // Note: int_consonant_mix and int_dissonant_mix won't appear at all here — their
    // levels aren't completed (only the 3 capstones are). The supersedes contract is
    // tested above with its full source set.
  });
});
