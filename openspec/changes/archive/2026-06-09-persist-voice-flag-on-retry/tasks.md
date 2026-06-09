## 1. Tests for `AgenticInput` voice-flag retention

- [x] 1.1 (use `testing` skill) Add test: pressing submit again without editing after voice transcript emits `submit(true)`
- [x] 1.2 (use `testing` skill) Add test: pressing submit again after manually editing voice transcript emits `submit(false)`
- [x] 1.3 (use `testing` skill) Add test: button submit without any prior voice input emits `submit(false)`
- [x] 1.4 (use `testing` skill) Add test: after a successful voice submission, subsequent button submit emits `submit(false)`

## 2. Implementation in `AgenticInput.vue`

- [x] 2.1 Add `isVoiceSet = ref(false)` reactive flag
- [x] 2.2 Set `isVoiceSet = true` inside `onTranscript` (before emitting `update:modelValue` and `submit`)
- [x] 2.3 Replace `@update:model-value="$emit('update:modelValue', $event)"` pass-through with a handler that clears `isVoiceSet` then re-emits
- [x] 2.4 Replace `@submit="$emit('submit', false)"` with a handler that emits `submit(isVoiceSet.value)` then clears `isVoiceSet`
- [x] 2.5 Run `npm --prefix frontend run test -- AgenticInput` and confirm all tests pass

## Constitution Compliance

- **Minimum code**: One `ref`, one handler, one guard — no new abstractions or files.
- **Surgical changes**: Only `AgenticInput.vue` and its test file are touched.
- **TDD**: Tests written before implementation (tasks 1.x precede 2.x).
- **No speculative features**: Exactly the three cases from the spec — no edge-case handling beyond what was discussed.
