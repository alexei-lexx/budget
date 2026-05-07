/**
 * Wrapper around localStorage for user-scoped data that must be wiped on sign out.
 *
 * Why: a previous bug allowed one user's assistant data
 * to persist into the next user's session on a shared browser.
 * Calling localStorage.clear() on sign out fixed the leak
 * but also wiped oidc-client-ts state (id_token_hint),
 * breaking signoutRedirect.
 *
 * This wrapper namespaces every user-scoped key with a `budget:` prefix
 * so clearAll() can wipe exactly that data and nothing else.
 */
const PREFIX = "budget:";

export const appStorage = {
  getItem(key: string): string | null {
    return localStorage.getItem(PREFIX + key);
  },

  setItem(key: string, value: string): void {
    localStorage.setItem(PREFIX + key, value);
  },

  removeItem(key: string): void {
    localStorage.removeItem(PREFIX + key);
  },

  clearAll(): void {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(PREFIX)) {
        localStorage.removeItem(key);
      }
    }
  },
};
