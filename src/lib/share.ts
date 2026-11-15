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
  /** Where the share leads: the lesson's page on fifths.io, tagged per target. */
  url: (target: ShareTarget) => string;
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
