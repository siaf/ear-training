import { describe, expect, it } from 'vitest';
import { isOwnerEmail } from './owner';

describe('isOwnerEmail', () => {
  it('matches only the owner account, ignoring case and spaces', async () => {
    expect(await isOwnerEmail(' Siavash.Fathi@gmail.com ')).toBe(true);
    expect(await isOwnerEmail('someone@example.com')).toBe(false);
    expect(await isOwnerEmail(null)).toBe(false);
    expect(await isOwnerEmail('')).toBe(false);
  });
});
