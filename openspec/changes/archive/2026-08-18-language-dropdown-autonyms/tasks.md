## 1. Update label logic in Settings.vue

- [x] 1.1 Add a shared `autonymOptions(codes)` helper that labels each code with `new Intl.DisplayNames([code], { type: "language" }).of(code) ?? code`
- [x] 1.2 Rebuild `interfaceLanguageOptions` from `autonymOptions(supportedInterfaceLanguages.value)`
- [x] 1.3 Rebuild `voiceInputLanguageOptions` from `autonymOptions(VOICE_INPUT_LANGUAGE_CODES)`, dropping the `.sort((a, b) => a.title.localeCompare(b.title))` call
- [x] 1.4 Rewrite the comment above the voice-input options computed to describe the autonym behavior instead of the interface-language-translation behavior it replaces
- [x] 1.5 Remove `locale` from `const { t, locale } = useI18n()` now that nothing in the file reads `locale.value`

## 2. Manual verification (per constitution's frontend test strategy)

- [x] 2.1 With interface language set to English, open Settings and confirm the Interface language dropdown reads "English" / "Deutsch"
- [x] 2.2 Switch interface language to German, reopen Settings, and confirm the Interface language dropdown still reads "English" / "Deutsch" (not "Englisch")
- [x] 2.3 In both interface languages, open the Voice input language dropdown and confirm every option is labeled in its own language (e.g. "Français", "日本語", "Русский") and stays in the same order regardless of the active interface language

## 3. Validation

- [x] 3.1 Run `npm test` in `frontend/` (no regressions)
- [x] 3.2 Run `npm run typecheck` in `frontend/`
- [x] 3.3 Run `npm run format` (lint) in `frontend/`

## Constitution Compliance

- **Test Strategy** (frontend: manual verification; component tests only for complex/critical components, not required): Settings.vue has no existing test file and this change is a label-rendering adjustment, not a complex/critical component — covered by manual verification (tasks 2.1-2.3) plus the existing test suite regression run (3.1), not new automated tests. This supersedes the generic OpenSpec tasks-artifact TDD default for this frontend-only change.
- **Frontend Code Discipline** (framework components over custom implementations): No custom UI added; only the `items` source for existing `v-select` components changes.
- **TypeScript Code Generation** (descriptive names, strict typing, no `any`/non-null assertions): `autonymOptions` and its parameter are descriptively named; no `any` or non-null assertions introduced.
- **Code Quality Validation** workflow followed via tasks 3.1-3.3 (no test file for the changed file → full suite → typecheck → lint).
- No other constitution principles apply — no backend, schema, data, or migration impact.
