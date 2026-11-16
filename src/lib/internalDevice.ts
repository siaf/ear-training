// Our own devices, kept out of analytics. A device is internal once the owner signs in on
// it (App.tsx), and local and preview builds always are. A cookie on .fifths.io carries the
// mark, so the website (site/posthog.js) leaves out the owner's visits too. PostHog then
// marks the person as $internal_or_test_user, which the project's "Filter out internal and
// test users" setting excludes (cohort "Internal / Test users"), earlier anonymous visits
// included. Deliberately no switch in the address: a copied link would carry it to others.

export const INTERNAL_COOKIE = 'fifths_internal';

/** Local and preview builds count as internal wherever they run. */
export const INTERNAL_HOSTS = /^(localhost|127\.0\.0\.1)$|\.pages\.dev$/;

const TWO_YEARS = 60 * 60 * 24 * 365 * 2;

type Doc = Pick<Document, 'cookie'>;
type Loc = Pick<Location, 'hostname' | 'protocol'>;

export function markInternalDevice(doc: Doc = document, loc: Loc = location): void {
  const domain = /(^|\.)fifths\.io$/.test(loc.hostname) ? '; domain=.fifths.io' : '';
  const secure = loc.protocol === 'https:' ? '; Secure' : '';
  doc.cookie = `${INTERNAL_COOKIE}=1; path=/; max-age=${TWO_YEARS}; SameSite=Lax${domain}${secure}`;
}

export function isInternalDevice(doc: Doc = document, loc: Loc = location): boolean {
  return doc.cookie.split(/;\s*/).includes(`${INTERNAL_COOKIE}=1`) || INTERNAL_HOSTS.test(loc.hostname);
}
