import { describe, expect, it, vi } from 'vitest';

vi.mock('./posthog', () => ({ phCapture: vi.fn() }));
import { appShareUrl, firstPersonClaim, redditShareUrl, sharedArrival, xShareUrl, type SharePayload } from './share';
import { lessonPageUrl, lessonSlug } from './lessonPages';

const payload: SharePayload = {
  kind: 'medal',
  title: 'Just mastered sixths in my ear training',
  text: 'Just mastered Harmonic: Sixths on Fifths 🎧',
  url: (target) => lessonPageUrl({ name: 'Harmonic: Sixths' }, { source: 'share', medium: target, campaign: 'medal' }),
};

describe('share links', () => {
  it('gives each lesson a readable page address', () => {
    expect(lessonSlug('Melodic: Fourths, Fifths and Octaves (Ascending)')).toBe('melodic-fourths-fifths-and-octaves-ascending');
    expect(lessonSlug('Primary Chords: I, IV or V?')).toBe('primary-chords-i-iv-or-v');
    expect(lessonSlug('Seventh-Chord Inversions')).toBe('seventh-chord-inversions');
  });

  it('posts to X with the text and the lesson page', () => {
    const url = new URL(xShareUrl(payload));
    expect(url.origin + url.pathname).toBe('https://x.com/intent/post');
    expect(url.searchParams.get('text')).toBe(payload.text);
    expect(url.searchParams.get('url')).toBe('https://fifths.io/lessons/harmonic-sixths/?utm_source=share&utm_medium=x&utm_campaign=medal');
  });

  it('opens a Reddit text post, not a bare link, with the link once at the end', () => {
    const url = new URL(redditShareUrl(payload));
    expect(url.origin + url.pathname).toBe('https://www.reddit.com/submit');
    expect(url.searchParams.get('type')).toBe('TEXT');
    expect(url.searchParams.get('title')).toBe(payload.title);
    expect(url.searchParams.get('text')).toBe(`${payload.text}\n\nhttps://fifths.io/lessons/harmonic-sixths/?utm_source=share&utm_medium=reddit&utm_campaign=medal`);
    expect(url.searchParams.has('url')).toBe(false);
  });
});

describe('what a shared medal says', () => {
  it('turns the lesson into a first-person claim', () => {
    expect(firstPersonClaim('Hear two notes and tell which is higher', 'Higher or Lower')).toBe('I can hear two notes and tell which is higher.');
    expect(firstPersonClaim('Identify ascending perfect 4ths, 5ths and octaves', 'x')).toBe('I can identify ascending perfect 4ths, 5ths and octaves.');
    expect(firstPersonClaim('Sing do-re-do — the smallest melodic motion', 'x')).toBe('I can sing do-re-do.');
    expect(firstPersonClaim('Listen, then sing the note back', 'x')).toBe('I can listen, then sing the note back.');
  });

  it('says "I mastered" when the description isn’t something you do', () => {
    expect(firstPersonClaim('Same chord, different vertical layouts — tell them apart', 'Voicings')).toBe('I mastered Voicings.');
    expect(firstPersonClaim('8ths, 16ths, triplets, or dotted-eighth + sixteenth?', 'Subdivisions')).toBe('I mastered Subdivisions.');
    expect(firstPersonClaim('Hear a four-chord progression — V→I or IV→I?', 'Cadences')).toBe('I can hear a four-chord progression.');
  });
});

describe('where a share leads', () => {
  it('opens the app on the shared lesson, or its start for Pro lessons', () => {
    expect(appShareUrl('found_higher_lower', { medium: 'x', campaign: 'medal' }))
      .toBe('https://app.fifths.io/?start=found_higher_lower&utm_source=share&utm_medium=x&utm_campaign=medal');
    expect(appShareUrl(null, { medium: 'reddit', campaign: 'week' }))
      .toBe('https://app.fifths.io/?utm_source=share&utm_medium=reddit&utm_campaign=week');
  });

  it('knows when a visit came from a share', () => {
    expect(sharedArrival('?start=level_1&utm_source=share&utm_medium=x&utm_campaign=week')).toBe('week');
    expect(sharedArrival('?start=level_1&utm_source=fifths.io')).toBeNull();
  });
});
