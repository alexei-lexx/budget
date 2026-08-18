## Context

Both Settings-page language dropdowns build their `v-select` option labels in [Settings.vue](../../../frontend/src/views/Settings.vue) with `new Intl.DisplayNames([locale.value], { type: "language" })` — one `Intl.DisplayNames` instance built from the _active UI locale_, reused to translate every option's code. See proposal.md - Why for the resulting bug.

## Goals / Non-Goals

**Goals:**

- Each dropdown option is labeled with its own language's autonym, computed independently of `locale.value`.
- Remove the now-misleading sort and comment on `voiceInputLanguageOptions` without changing anything else about it.

**Non-Goals:**

- No change to which language codes are offered (`supportedInterfaceLanguages`, `VOICE_INPUT_LANGUAGE_CODES`).
- No change to how a selected language is applied (locale switching, speech-recognition wiring).
- No change to non-language `Intl` usage elsewhere in the app (date/currency formatting, which intentionally does follow locale per the `ui-localization` spec).

## Decisions

**Per-code `Intl.DisplayNames` instead of a hardcoded name map.**

Build the display name for each code by asking that code's own locale to name itself:

```js
new Intl.DisplayNames([code], { type: "language" }).of(code);
```

instead of the current single instance keyed on `locale.value`. Alternative considered: a hardcoded `{ en: "English", de: "Deutsch" }` map (or one per voice-input code). Rejected — `Intl.DisplayNames` already covers all 20 voice-input codes correctly, needs no maintenance when a locale is added, and keeps the existing idiom instead of introducing a second, parallel naming source.

**Share one label-building helper between both dropdowns.**

Both computeds reduce to the same map-over-codes shape once neither depends on `locale.value`. A single function (e.g. `autonymOptions(codes: string[])`) removes the duplication; each computed calls it with its own code list.

**Drop the `localeCompare` sort on `voiceInputLanguageOptions`.**

`VOICE_INPUT_LANGUAGE_CODES` is already declared in alphabetical order by code (`ar-SA, da-DK, de-DE, ... zh-CN`). Sorting by translated `.title` made sense when every title was in one script; sorting by autonym `.title` would mix Arabic, Cyrillic, CJK, and Latin scripts under the runtime's default collation, an order that's neither predictable nor meaningful. Dropping the sort keeps the existing (already sensible) declaration order with less code. Confirmed with the user directly rather than treated as a minor default.

**Rewrite, don't delete, the stale comment.**

The comment above `voiceInputLanguageOptions` documents current intent for future readers; since this change reverses that intent, the comment is rewritten to describe the new autonym behavior rather than left describing the old one.

**Drop the now-unused `locale` binding.**

`const { t, locale } = useI18n()` in Settings.vue destructures `locale` only for the two `Intl.DisplayNames([locale.value], ...)` calls this change removes. Once those are gone, `locale` is unused elsewhere in the file (verified) and is removed from the destructure as a direct consequence of this change, per the project's surgical-changes convention of cleaning up only orphans your own edit creates.

## Risks / Trade-offs

- [Voice-input autonym order may look arbitrary to a given reader, since it groups by code (e.g. `en-AU`, `en-GB`, `en-US` adjacent) rather than by any visual ordering of the autonym text] → Accepted: the source list is already in this order today; this change only stops re-sorting it by a now-inapplicable translated string.
- [`Intl.DisplayNames` browser support] → Non-issue: already a hard dependency of the existing code (used today for both dropdowns), so this change doesn't add a new compatibility requirement.

## Constitution Compliance

- **Frontend Code Discipline** (framework components over custom implementations): Change stays within existing `v-select` usage; only the JS building its `items` changes.
- **TypeScript Code Generation** (descriptive names, strict typing): `autonymOptions` and its parameter are descriptively named; no `any` or non-null assertions introduced.
- No other constitution principles apply — no backend, schema, data, or test-strategy impact.
