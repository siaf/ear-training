/**
 * One-time localStorage migration from the old `overtone.*` brand namespace
 * to the new `fifths.*` namespace. Safe to call on every boot — it no-ops
 * once the migration flag is set.
 */

const MIGRATION_FLAG = 'fifths.migrated_from_overtone';

const KEY_MAP: Record<string, string> = {
  'overtone.v1': 'fifths.v1',
  'overtone.sessions.v1': 'fifths.sessions.v1',
  'overtone.theme': 'fifths.theme',
  'overtone.notifications.permission': 'fifths.notifications.permission',
};

export function migrateBrandStorage(): void {
  try {
    if (localStorage.getItem(MIGRATION_FLAG)) return;

    for (const [oldKey, newKey] of Object.entries(KEY_MAP)) {
      const value = localStorage.getItem(oldKey);
      if (value != null && localStorage.getItem(newKey) == null) {
        localStorage.setItem(newKey, value);
      }
      if (value != null) {
        localStorage.removeItem(oldKey);
      }
    }

    localStorage.setItem(MIGRATION_FLAG, '1');
  } catch {
    /* quota or private-mode — ignore */
  }
}
