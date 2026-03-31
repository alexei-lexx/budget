## Why

The current implementation sends a static "thinking..." text message when the AI is processing, which creates an awkward extra message bubble in the chat. Telegram's Bot API supports inline webhook replies with `sendChatAction` and `action: "typing"` that shows the standard "User is typing..." indicator — matching what users expect from any Telegram conversation.

## What Changes

- Replace the inline "thinking..." `sendMessage` webhook reply with a `sendChatAction` reply in the webhook handler.
- `TelegramBotService.acceptMessage` return type changes from `Result<string | null>` to `Result<void>` — the handler no longer needs to know what text to send back.
- No changes to `TelegramApiClient` port, `HttpTelegramApiClient`, or `ProcessTelegramMessageService`.

## Capabilities

### New Capabilities

_None — this change modifies an existing capability._

### Modified Capabilities

- `telegram-bot-integration`: The "Immediate acknowledgement on text message" requirement changes from sending a "thinking..." text reply to showing a native Telegram typing indicator via an inline `sendChatAction` webhook reply.

## Impact

- **Backend**: `TelegramBotService.acceptMessage` and `telegramWebhookHandler` only.
- **No frontend changes.**
- **No infrastructure changes.**
- **No breaking changes** to any external API or GraphQL schema.

## Constitution Compliance

- **TypeScript strict mode**: Return type change is fully typed.
- **Testing**: `TelegramBotService` and `telegramWebhookHandler` have existing tests; both will be updated.
- **No paid services**: `sendChatAction` is part of the free Telegram Bot API.
