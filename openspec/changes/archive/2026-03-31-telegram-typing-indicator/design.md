## Context

The webhook handler currently works like this:

1. Telegram POSTs a message to the webhook.
2. `TelegramBotService.acceptMessage` dispatches a background job for AI processing and returns `Success("thinking...")`.
3. The webhook handler returns `{ method: "sendMessage", text: "thinking..." }` as the HTTP response body — Telegram's inline reply mechanism executes this automatically.
4. The background job later calls `sendMessage` with the AI answer.

This leaves two message bubbles per question. The Telegram Bot API's inline reply mechanism supports any Bot API method, including `sendChatAction`. Returning `{ method: "sendChatAction", action: "typing" }` instead shows the native typing indicator without a message bubble.

## Goals / Non-Goals

**Goals:**

- Replace the "thinking..." message bubble with a native typing indicator.
- Keep the change minimal: only `TelegramBotService.acceptMessage` and `telegramWebhookHandler` are touched.

**Non-Goals:**

- Adding `sendChatAction` to the `TelegramApiClient` port.
- Periodic re-sends to keep the indicator alive beyond 5 seconds.
- Retrying on failure.

## Decisions

### 1. Use the inline webhook reply for `sendChatAction`

Telegram allows any Bot API method to be returned inline in the webhook HTTP response. Returning `{ method: "sendChatAction", action: "typing" }` is equivalent to a separate API call but requires no additional HTTP round-trip and no changes to the port or HTTP client.

### 2. `acceptMessage` returns `Result<void>`

The only reason the return type was `Result<string | null>` was to pass back the reply text. With the reply logic moved entirely into the webhook handler, `acceptMessage` no longer needs to return data. Returning `void` is cleaner and removes a leaky abstraction.

### 3. Always send `sendChatAction` on any incoming message

The webhook handler will unconditionally return `sendChatAction` when `acceptMessage` succeeds, regardless of whether the message was silently ignored (e.g. no connected bot). This is safe — sending a typing indicator to an unrecognised chat is harmless.

## Risks / Trade-offs

- **Typing indicator expires after 5 seconds** → Accepted; single send only, per product decision.
- **`sendChatAction` failure** → Inline replies are best-effort; Telegram may silently drop them. No degraded UX beyond the indicator not appearing.

## Migration Plan

1. Deploy the updated backend Lambda. No data migration required.
2. Rollback: redeploy the previous Lambda version. No side effects.
