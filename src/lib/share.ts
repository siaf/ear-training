// Sharing a medal, a week's progress or the ear test: the links each place opens, and what
// we record about it. Nothing personal goes in a shared link: no name, no email, no id.

import { phCapture } from './posthog';

export type ShareKind = 'medal' | 'week' | 'streak';
export type ShareTarget = 'native' | 'x' | 'reddit' | 'copy' | 'image';

export interface SharePayload {
  kind: ShareKind;
  /** A first-person post title, for Reddit. */
  title: string;
  /** The post text, without the link. */
  text: string;
  /** Where the share leads: the app, tagged per target (appShareUrl). */
  url: (target: ShareTarget) => string;
}

export const APP_URL = 'https://app.fifths.io/';

/**
 * Where a share leads: the app itself, straight into the lesson that was shared (free
 * lessons only; the app opens Pro ones on the path), tagged so the app can say "shared with
 * you, try it yourself" and PostHog can count it.
 */
export function appShareUrl(levelId: string | null, utm: { medium: string; campaign: string }): string {
  const tags = `utm_source=share&utm_medium=${encodeURIComponent(utm.medium)}&utm_campaign=${encodeURIComponent(utm.campaign)}`;
  return levelId ? `${APP_URL}?start=${encodeURIComponent(levelId)}&${tags}` : `${APP_URL}?${tags}`;
}

/** How this visit arrived, when it came from someone's share: "medal", "week" or "streak". */
export function sharedArrival(search: string): string | null {
  const q = new URLSearchParams(search);
  return q.get('utm_source') === 'share' ? q.get('utm_campaign') ?? 'medal' : null;
}

export function xShareUrl(p: SharePayload): string {
  return `https://x.com/intent/post?text=${encodeURIComponent(p.text)}&url=${encodeURIComponent(p.url('x'))}`;
}

/**
 * Reddit's new-post page as a text post with the title and body filled in. People pick the
 * community themselves, and the picture is saved first so they can add it: Reddit flags
 * domains that many accounts drop bare links to, and moderators remove posts that read
 * like ads, so this is a progress post that mentions Fifths once.
 */
export function redditShareUrl(p: SharePayload): string {
  const body = `${p.text}\n\n${p.url('reddit')}`;
  return `https://www.reddit.com/submit?type=TEXT&selftext=true&title=${encodeURIComponent(p.title)}&text=${encodeURIComponent(body)}`;
}

export function trackShare(event: 'share_opened' | 'share_clicked' | 'share_completed', kind: ShareKind, target?: ShareTarget) {
  phCapture(event, target ? { kind, target } : { kind });
}

const CAN_VERBS = ['hear', 'identify', 'recognize', 'distinguish', 'detect', 'sing', 'place', 'listen', 'write', 'tell', 'name'];

/**
 * The learner's claim, in the first person: "I can hear two notes and tell which is higher."
 * Built from the lesson's description when it starts with a doing word; otherwise
 * "I mastered Voicings (…)." What follows a dash is a teaching note, so it's left off.
 */
export function firstPersonClaim(description: string, name: string): string {
  const d = description.split(' — ')[0].replace(/[.\s]+$/, '');
  const first = d.split(/[\s,]/)[0].toLowerCase();
  if (!d.includes('?') && CAN_VERBS.includes(first)) return `I can ${d.charAt(0).toLowerCase()}${d.slice(1)}.`;
  return `I mastered ${name}.`;
}
