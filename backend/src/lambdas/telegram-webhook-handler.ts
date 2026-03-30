import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { z } from "zod";
import { resolveTelegramBotService } from "../dependencies";

const telegramUpdateSchema = z.object({
  update_id: z.number(),
  message: z
    .object({
      message_id: z.number(),
      chat: z.object({ id: z.number() }),
      text: z.string().optional(),
    })
    .optional(),
});

type TelegramUpdate = z.infer<typeof telegramUpdateSchema>;

export async function telegramWebhookHandler(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> {
  const telegramBotService = resolveTelegramBotService();
  const webhookSecret = event.headers["x-telegram-bot-api-secret-token"];

  if (!webhookSecret) {
    return { statusCode: 403, body: "Forbidden" };
  }

  if (!event.body) {
    return { statusCode: 400, body: "Bad Request" };
  }

  let telegramUpdate: TelegramUpdate;

  try {
    telegramUpdate = telegramUpdateSchema.parse(JSON.parse(event.body));
  } catch (error) {
    console.error("Failed to parse request body:", error);

    return { statusCode: 400, body: "Bad Request" };
  }

  if (telegramUpdate.message) {
    const result = await telegramBotService.acceptMessage(webhookSecret, {
      chatId: telegramUpdate.message.chat.id,
      text: telegramUpdate.message.text,
    });

    if (!result.success) {
      console.error("Failed to accept Telegram message:", result.error);
      throw new Error(`Failed to accept Telegram message: ${result.error}`);
    }

    if (result.data) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "sendMessage",
          chat_id: telegramUpdate.message.chat.id,
          text: result.data,
        }),
      };
    }
  }

  return { statusCode: 200, body: "OK" };
}
