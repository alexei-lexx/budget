## Why

The Interface language and Voice input language dropdowns on the Settings page render each option's label by translating the language name into the currently active interface language (`Intl.DisplayNames([locale.value], ...)`). This defeats the purpose of a language picker: a user stuck in an unfamiliar interface language cannot recognize their own language in the list (e.g. "Deutsch" only appears when the UI is already German). Language pickers conventionally show each language in its own name (autonym) regardless of the active locale.

## What Changes

- Interface language dropdown always labels its options with each language's own name (autonym), e.g. "English", "Deutsch" — independent of the currently active interface language.
- Voice input language dropdown gets the same fix: each of its 20 speech-recognition locale codes is labeled with its own autonym instead of a translation into the active interface language.
- Voice input language options drop their `localeCompare` sort. The source list is already alphabetical by code, and sorting autonym strings that mix scripts (Arabic, Cyrillic, CJK, Latin) would produce a browser-dependent, unpredictable order.
- The two near-identical option-building computeds are unified behind one shared label-building helper.
- The comment documenting the (now reversed) "voice input labels follow the interface language" behavior is rewritten to describe the new autonym behavior.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `user-settings`: The Voice Input Language Setting requirement's scenario changes from labeling options in the active interface language to labeling them with each language's own autonym. The Interface Language Setting requirement gains a scenario stating its own dropdown options are always labeled with each language's autonym, independent of the active interface language.
- `ui-localization`: Add a carve-out to the general "everything follows the interface language" rule for language-name labels shown in language pickers, parallel to the existing carve-outs for browser-locale formatting and user-provided content.

## Impact

- `frontend/src/views/Settings.vue`: `interfaceLanguageOptions` and `voiceInputLanguageOptions` computeds, and their shared label-building logic.
- No backend, schema, or migration changes.

## Constitution Compliance

- **Frontend Code Discipline** (framework components over custom implementations): No new custom UI; only the label source for existing `v-select` options changes.
- **TypeScript Code Generation** (naming, strict typing): New shared helper uses descriptive naming and explicit types; no `any` or non-null assertions introduced.
- No other constitution principles apply — this is a frontend-only label-rendering change with no API, data, or architectural impact.
