/**
 * What was last loaded, kept on this device so a screen can show it at once and refresh
 * in the background. Kept in memory for moving between screens, and in local storage for
 * the next time the app opens. Everything is cleared on sign-out.
 */
const prefix = 'mishkan.cache.v2.';
const memory = new Map<string, unknown>();

export function readCache<T>(key: string, isValid: (value: unknown) => value is T): T | null {
  if (memory.has(key)) {
    const value = memory.get(key);
    return isValid(value) ? value : null;
  }
  try {
    const stored = window.localStorage.getItem(prefix + key);
    if (stored === null) {
      return null;
    }
    const value: unknown = JSON.parse(stored);
    if (!isValid(value)) {
      return null;
    }
    memory.set(key, value);
    return value;
  } catch {
    return null;
  }
}

export function writeCache(key: string, value: unknown): void {
  memory.set(key, value);
  try {
    window.localStorage.setItem(prefix + key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the copy in memory still serves this visit.
  }
}

export function clearCache(): void {
  memory.clear();
  try {
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith(prefix)) {
        window.localStorage.removeItem(key);
      }
    }
  } catch {
    // Storage blocked: nothing was kept there.
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Whether a value looks like rows as the database returns them: objects with a string id. */
export function isRowList(value: unknown): boolean {
  return (
    Array.isArray(value) && value.every((row) => isObject(row) && typeof row['id'] === 'string')
  );
}

/** Whether a value is an object whose listed keys hold rows. */
export function hasRowLists(value: unknown, keys: readonly string[]): boolean {
  return isObject(value) && keys.every((key) => isRowList(value[key]));
}

/** Whether a value is an object whose listed keys hold single rows. */
export function hasRows(value: unknown, keys: readonly string[]): boolean {
  return (
    isObject(value) &&
    keys.every((key) => {
      const row = value[key];
      return isObject(row) && typeof row['id'] === 'string';
    })
  );
}
