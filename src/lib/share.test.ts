import { describe, expect, it, vi } from 'vitest';

vi.mock('./posthog', () => ({ phCapture: vi.fn() }));
import { redditShareUrl, xShareUrl, type SharePayload } from './share';
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
