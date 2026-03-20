## 1. Voice Input Composable

- [x] 1.1 Create `frontend/src/composables/useVoiceInput.ts` with `isSupported`, `isRecording`, `startRecording`, and `stopRecording` — wrapping `window.SpeechRecognition` / `window.webkitSpeechRecognition`
- [x] 1.2 Accept an `onTranscript` callback and call it with the final transcript when speech recognition ends with a non-empty result
- [x] 1.3 Return to idle silently when the transcript is empty or a non-critical error occurs (e.g. no-speech, audio-capture)

## 2. TextboxButtonInput Component

- [x] 2.1 Add `isRecording` and `isVoiceSupported` props and a `startRecording` / `stopRecording` event interface
- [x] 2.2 Render a mic icon inside the textarea (append-inner) only when `isVoiceSupported` is true
- [x] 2.3 Apply pulsing red style to the mic icon while `isRecording` is true
- [x] 2.4 Disable the mic icon while the component is in `loading` state

## 3. AgenticInput Integration

- [x] 3.1 Instantiate `useVoiceInput` in `AgenticInput.vue` with an `onTranscript` handler that sets the model value and triggers submit
- [x] 3.2 Pass `isRecording` and `isVoiceSupported` down to `TextboxButtonInput`, and wire up `startRecording` / `stopRecording` events

## 4. Validation

- [x] 4.1 Verify mic button appears in Chrome/Edge and is hidden in Firefox
- [x] 4.2 Verify pulsing red animation plays while recording and stops on completion
- [x] 4.3 Verify speaking a transaction (e.g. "coffee 4 euro") creates the transaction and clears the input
- [x] 4.4 Verify silence returns the mic to idle with no error shown
- [x] 4.5 Verify mic button is disabled while AI inference is in progress
- [x] 4.6 Run `npm run typecheck` and `npm run format` in `frontend/`

## Constitution Compliance

- **Vendor Independence**: Web Speech API only — no third-party STT vendor. ✓
- **Free or minimal cost**: No API costs. ✓
- **Frontend Code Discipline**: Vuetify icon slot used; no custom CSS beyond animation. ✓
- **TypeScript strict mode**: All new code strictly typed; no `!` or `as any`. ✓
- **Test Strategy**: Frontend tested manually per constitution; no backend changes. ✓
- **Code Quality Validation**: Typecheck and format run as final task. ✓
