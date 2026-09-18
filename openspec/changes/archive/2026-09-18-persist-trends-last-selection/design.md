## Context

See proposal.md - Why. `Trends.vue` currently seeds `appliedSelection` from `route.query` once, at ref-initialization time, falling straight to hardcoded defaults when the query is empty. The view has no `KeepAlive` wrapper, so it fully unmounts on navigation away and remounts on return - any state must survive outside the component instance. There is no Pinia store in this app; the only precedent for cross-reload persistence is `frontend/src/lib/appStorage.ts`, a thin `budget:`-prefixed wrapper around `localStorage` used today for session housekeeping, not filter state.

## Goals / Non-Goals

**Goals:**

- Remember the last applied trend selection across full unmount/remount cycles (in-app navigation) and across page reloads / new tabs.
- Keep the URL as the highest-priority source when it carries a selection, preserving bookmark/share behavior unchanged.
- Reuse the existing validation already applied to URL query parameters, so a stale or malformed stored value degrades to defaults silently instead of throwing or half-applying.

**Non-Goals:**

- No cross-device sync (that's what starred configurations are for). This is per-browser, local-only memory.
- No change to how starred configurations are stored, listed, or matched.
- No change to the GraphQL schema or backend.

## Decisions

**Storage mechanism: `localStorage`, via `appStorage.ts`.**

Considered:

- In-memory module-level singleton (a `ref` outside the component). Survives in-app navigation but not a page reload or the mobile OS killing a backgrounded tab - too fragile given the constitution's mobile/PWA-first framing.
- `sessionStorage`. Survives reload but not reopening the app later, which is a plausible everyday case for a PWA. Rejected in favor of the more durable option.
- `localStorage` via the existing `appStorage.ts` wrapper. Survives reload and reopening the app; already namespaced under `budget:` and already wired into the sign-out `clearAll()` sweep, so the remembered selection is cleared like other user-scoped data when the user signs out. Chosen for durability and because it reuses an established convention rather than adding a new one.

**Key shape: one key, whole selection as JSON.**

Store the entire `TrendSelection` object as a single JSON-encoded value under one `budget:`-prefixed key, rather than one key per field. The selection is always read/written as a unit (it mirrors `appliedSelection`), so splitting it into multiple keys would add complexity with no benefit.

**Validation: reuse the URL query parsers.**

`Trends.vue` already has per-field parsers/validators for hydrating from `route.query` (period unit, lookback, currency, category ids). Reading from `localStorage` follows the same untrusted-input shape (a plain object of strings/arrays that may be stale relative to current categories/currencies), so the same parsers validate the stored value. No separate validation logic to write or maintain.

**Precedence: URL wins outright, no per-field merge.**

If `route.query` carries any applied-selection parameters, use it exactly as today - each field falls back to its own hardcoded default if missing or invalid, independent of local storage. Local storage is only consulted when the query is entirely empty. This keeps the mental model simple (URL present → URL; URL absent → remembered; neither → defaults) and matches a deep link's implicit intent to specify a full selection, not to be silently patched with unrelated remembered fields.

**Write timing: on every applied-selection change, including Clear.**

`handleApply` and `handleClear` in `Trends.vue` both already update `appliedSelection` and the URL. Both SHALL also write to `localStorage`, so clearing "forgets" the previous narrowed selection rather than leaving stale data ready to reappear on the next visit.

## Risks / Trade-offs

- [Stored value can go stale relative to server data - a deleted category, a currency no longer on the account] → same exposure already exists for URL parameters today (neither validates category ids or currency against the account, both simply pass them through), so behavior stays consistent; a stale category id or currency yields an empty-looking chart rather than an error, same as a stale URL does today.
- [Multiple browser tabs on the Trends page could overwrite each other's remembered selection] → acceptable; this mirrors how the URL itself already behaves per-tab, and the existing app has no cross-tab coordination anywhere.
- [localStorage is unavailable or throws in some contexts (private browsing, storage disabled)] → `appStorage.ts` callers should treat failures the same way a missing value is treated (fall back to defaults), not surface an error.

## Constitution Compliance

- **Vendor Independence**: `localStorage` is a standard browser API; no vendor lock-in, no new dependency.
- **Frontend Code Discipline**: reuses the existing `appStorage.ts` convention instead of introducing a new persistence utility or a state management library.
- **UI Guidelines**: no new error-facing UI; invalid/missing stored data is handled the same silent-fallback way invalid URL parameters already are.
- **Test Strategy**: frontend is tested manually; the stored-value parsing reuses existing, already-covered validation logic.

Compliant, no violations.
