import { describe, expect, it } from 'vitest';
import { INTERNAL_HOSTS, isInternalDevice, markInternalDevice } from './internalDevice';

/** A cookie jar that behaves enough like document.cookie. */
function jar() {
  const cookies = new Map<string, string>();
  const writes: string[] = [];
  return {
    writes,
    get cookie() { return [...cookies].map(([k, v]) => `${k}=${v}`).join('; '); },
    set cookie(line: string) {
      writes.push(line);
      const [k, v] = line.split(';')[0].split('=');
      cookies.set(k, v);
    },
  };
}
const at = (url: string) => {
  const u = new URL(url);
  return { hostname: u.hostname, protocol: u.protocol };
};

describe('internal devices', () => {
  it('a normal visit is not internal, and nothing in the address can make it so', () => {
    expect(isInternalDevice(jar(), at('https://app.fifths.io/path'))).toBe(false);
    expect(isInternalDevice(jar(), at('https://fifths.io/?internal=1'))).toBe(false);
  });

  it('the owner signing in marks the device for both the app and fifths.io', () => {
    const doc = jar();
    markInternalDevice(doc, at('https://app.fifths.io/'));
    expect(doc.writes[0]).toBe('fifths_internal=1; path=/; max-age=63072000; SameSite=Lax; domain=.fifths.io; Secure');
    expect(isInternalDevice(doc, at('https://fifths.io/blog/'))).toBe(true);
  });

  it('local and preview builds are always internal', () => {
    expect(INTERNAL_HOSTS.test('localhost')).toBe(true);
    expect(INTERNAL_HOSTS.test('127.0.0.1')).toBe(true);
    expect(INTERNAL_HOSTS.test('share.fifths-app.pages.dev')).toBe(true);
    expect(INTERNAL_HOSTS.test('app.fifths.io')).toBe(false);
    expect(INTERNAL_HOSTS.test('fifths.io')).toBe(false);
  });
});
