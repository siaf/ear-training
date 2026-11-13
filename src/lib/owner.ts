/**
 * Dev tools (like "unlock all lessons") work in local dev, and online only for the owner's
 * signed-in account. The account is matched by a hash, so the address isn't in the bundle.
 */
const OWNER_EMAIL_SHA256 = '2b9d850b20ad97455b7407b8d1d5fb2e340a3e641d5363aabe03a06a34728cf6';

export async function sha256Hex(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function isOwnerEmail(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  try {
    return (await sha256Hex(email.trim().toLowerCase())) === OWNER_EMAIL_SHA256;
  } catch {
    return false; // no crypto.subtle outside secure contexts
  }
}
