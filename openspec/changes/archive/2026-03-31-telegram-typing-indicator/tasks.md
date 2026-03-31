## 1. Update TelegramBotService

- [x] 1.1 Change `acceptMessage` return type from `Result<string | null>` to `Result<void>` in `backend/src/services/telegram-bot-service.ts`
- [x] 1.2 Replace `return Success("thinking...");` with `return Success(undefined);`
- [x] 1.3 Update `backend/src/services/telegram-bot-service.test.ts` to reflect the new return type (remove assertions on the returned string)

## 2. Update Webhook Handler

- [x] 2.1 In `backend/src/lambdas/telegram-webhook-handler.ts`, replace the `if (result.data)` block with an unconditional inline `sendChatAction` reply: `{ method: "sendChatAction", action: "typing", chat_id: ... }`
- [x] 2.2 No webhook handler tests needed — the handler is a thin layer; `TelegramBotService` is tested directly
