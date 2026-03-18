## Why

Entering transactions by typing is friction-heavy on mobile. Voice input lets users record a transaction hands-free with a single tap, feeding the existing natural-language pipeline without any backend changes.

## What Changes

- Add a mic button inside the `TextboxButtonInput` textarea (suffix icon)
- While recording: mic icon pulses red to signal active listening
- Web Speech API captures audio and converts to text in the browser
- On transcription complete: text is auto-submitted to the existing `createTransactionFromText` pipeline
- If transcript is empty (silence, mic error): idle back to ready state silently — no error shown
- No configuration, no per-user settings, no backend changes

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `transactions`: Adding a voice input requirement to the existing Natural Language Transaction Creation requirement — new mic button input modality, auto-submit on transcript

## Impact

- **Frontend only**: changes limited to `TextboxButtonInput.vue` and a new `useVoiceInput.ts` composable
- **No backend changes**: GraphQL schema, resolvers, and services are untouched
- **No new dependencies**: Web Speech API is browser-native
- **PWA**: Web Speech API requires HTTPS — satisfied by CloudFront in production and localhost in development
- **Browser support**: Chrome, Edge, Safari (iOS 14.5+), Chrome Android — no support in Firefox (mic button hidden when API unavailable)

## Constitution Compliance

- **Vendor Independence**: Web Speech API is browser-native with no third-party vendor or API key — fully compliant
- **Free or minimal cost**: No API calls, no paid services — compliant
- **PWA**: HTTPS is already enforced via CloudFront — compliant
- **Frontend Code Discipline**: Vuetify components used for mic button and icons; minimal custom CSS — compliant
- **Mobile-first UI**: Voice input is primarily a mobile UX improvement — compliant
- **TypeScript strict mode**: New composable will use strict TypeScript — compliant
