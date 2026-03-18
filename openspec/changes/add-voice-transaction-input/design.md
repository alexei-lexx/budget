## Context

The Transactions page has a natural language text input (`TextboxButtonInput` inside `AgenticInput`) that submits free-text to an AI agent via the `createTransactionFromText` GraphQL mutation. The backend pipeline is complete and unchanged.

This change adds a voice input modality: speech-to-text in the browser, then auto-submit to the existing pipeline. The change is frontend-only.

Current component hierarchy:

```
AgenticInput.vue
  └─ TextboxButtonInput.vue   (textarea + send button)
  └─ AgentTraceTriggerButton.vue
```

## Goals / Non-Goals

**Goals:**

- Add a mic button inside `TextboxButtonInput`'s input area (suffix icon)
- Capture speech via Web Speech API and auto-submit the transcript
- Visual recording state (pulsing red mic icon)
- Gracefully degrade on unsupported browsers (hide mic button)

**Non-Goals:**

- Server-side speech-to-text (no backend changes)
- Per-user or global toggle for auto-submit behaviour
- Custom language selection UI (uses browser default)
- Offline transcription

## Decisions

### Decision 1: Web Speech API over server-side STT

**Chosen**: Web Speech API (`window.SpeechRecognition`)

**Alternatives considered**:

- **OpenAI Whisper API** — high quality, but costs money per request and adds vendor lock-in. Violates constitution requirements.
- **Whisper.js (browser WASM)** — free and offline-capable, but requires a ~150 MB model download on first use, unacceptable for a PWA on mobile.
- **AWS Transcribe** — AWS vendor lock-in and costs money. Violates constitution requirements.

**Rationale**: Web Speech API is browser-native, free, zero dependencies, and works on all target platforms (Chrome, Edge, Safari iOS 14.5+, Chrome Android). Fits the "free or minimal cost" and "minimize vendor lock-in" constraints exactly.

### Decision 2: Mic button inside `TextboxButtonInput` (suffix icon)

**Chosen**: Add the mic icon as a suffix inside the Vuetify `v-textarea` using the `append-inner-icon` slot or appended icon prop.

**Alternatives considered**:

- **Separate floating button** — not standard UX for voice input; disconnected from the input it controls.
- **Button next to send in `AgenticInput`** — places it outside the input boundary, inconsistent with common voice-input patterns (Google Search, iOS keyboard).

**Rationale**: Mic icon inside the input field is the dominant platform convention (Google, iOS, Android). Keeps `TextboxButtonInput` self-contained and `AgenticInput` unchanged.

### Decision 3: `useVoiceInput` composable

**Chosen**: Encapsulate all Web Speech API logic in a new `frontend/src/composables/useVoiceInput.ts` composable.

**Rationale**: Follows the existing composable pattern (`useCreateTransactionFromText`, `useTransactions`, etc.). Keeps `TextboxButtonInput` as a presentational component — it receives `isRecording` and callbacks as props/events, while the composable owns the API interaction.

**Composable interface**:

```
useVoiceInput({ onTranscript: (text: string) => void, onError?: (message: string) => void })
  → { isSupported, isRecording, startRecording, stopRecording }
```

### Decision 4: Auto-submit with no confirmation step

**Chosen**: On final transcript, emit it directly to the existing `submit` handler — no intermediate review step.

**Rationale**: Agreed during exploration. The AI pipeline already handles ambiguous/incorrect input gracefully (error snackbar, preserved input on failure). Adding a review step would reduce the "hands-free" value of voice.

### Decision 5: Silent failure on empty transcript

**Chosen**: If Web Speech API returns an empty result (silence, background noise), return the mic to idle state with no notification.

**Rationale**: Showing an error for accidental mic taps would be noisy and unhelpful. The user simply taps again.

## Risks / Trade-offs

- **Firefox not supported** → Mic button is conditionally rendered only when `window.SpeechRecognition` is available. Firefox users see no mic button — no regression.
- **Microphone permission denied** → Web Speech API fires an `onerror` event. The composable catches this and returns to idle silently (same as empty transcript — no distraction).
- **Transcription quality** → Misrecognised amounts or descriptions will fail in the AI pipeline and show the existing error snackbar, with the original transcript preserved in the input for correction.
- **HTTPS requirement** → Web Speech API requires a secure origin. Production runs behind CloudFront (HTTPS enforced). Dev runs on localhost (secure origin by browser policy). No action needed.
- **`TextboxButtonInput` becomes voice-aware** → This component was generic. Adding a mic prop couples it slightly to the agentic context. Acceptable trade-off given it is only used in `AgenticInput`.

## Constitution Compliance

- **Vendor Independence**: Web Speech API is browser-native — no vendor, no API key. Frontend remains deployable to any static host. ✓
- **Free or minimal cost**: No API costs introduced. ✓
- **PWA / mobile-first**: Voice is primarily a mobile improvement; HTTPS already enforced. ✓
- **Frontend Code Discipline**: Vuetify icon/slot used for mic button; no custom CSS beyond animation class. ✓
- **TypeScript strict mode**: Composable and component changes will be strictly typed. ✓
- **Test Strategy**: Frontend tested manually per constitution. No new backend code, no new service/repository tests required. ✓
