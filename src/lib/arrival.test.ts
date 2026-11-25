import { describe, expect, it } from 'vitest';
import { toolArrival } from './arrival';

describe('toolArrival', () => {
  it('names the tool a visitor came from', () => {
    const note = toolArrival('?start=int_melodic_4ths_5ths_asc&utm_source=fifths.io&utm_medium=tool&utm_campaign=interval-ear-trainer&utm_content=round-end');
    expect(note?.title).toBe('Picking up from the Interval Ear Trainer.');
    expect(note?.body).toMatch(/remembers every interval you miss/);
  });

  it('has a general note for a tool it does not know', () => {
    expect(toolArrival('?utm_source=fifths.io&utm_medium=tool&utm_campaign=new-tool')?.title).toBe('Picking up from our free tool.');
  });

  it('says nothing for other arrivals', () => {
    expect(toolArrival('')).toBeNull();
    expect(toolArrival('?start=found_higher_lower&utm_source=fifths.io&utm_medium=blog&utm_campaign=x')).toBeNull();
    expect(toolArrival('?utm_source=share&utm_medium=tool')).toBeNull();
  });
});
