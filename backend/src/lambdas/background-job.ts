import { z } from "zod";
import { resolveProcessTelegramMessageService } from "../dependencies";
import { BackgroundJob } from "../ports/background-job-dispatcher";
import { createSingleton } from "../utils/dependency-injection";
import { injectRuntimeEnv } from "./bootstrap";

// Handler runs per invocation; cache so warm-start invocations skip the SSM fetch.
const ensureRuntimeEnv = createSingleton(() => injectRuntimeEnv(process.env));

const backgroundJobEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("telegram-message"),
    payload: z.object({
      botId: z.string(),
      chatId: z.number(),
      text: z.string().nullable(),
      userId: z.string(),
    }),
  }),
]) satisfies z.ZodType<BackgroundJob>;

export const handler = async (rawEvent: unknown): Promise<void> => {
  await ensureRuntimeEnv();

  const parsedEvent = backgroundJobEventSchema.safeParse(rawEvent);

  if (!parsedEvent.success) {
    console.error("Invalid background job event:", parsedEvent.error.issues);
    throw parsedEvent.error;
  }

  const event = parsedEvent.data;

  console.log(`Processing job type: ${event.type}`);

  switch (event.type) {
    case "telegram-message": {
      const result = await resolveProcessTelegramMessageService().call({
        botId: event.payload.botId,
        chatId: event.payload.chatId,
        text: event.payload.text,
        userId: event.payload.userId,
      });

      if (!result.success) {
        console.error("Failed to process telegram message:", result.error);
        throw new Error(result.error);
      }

      break;
    }
  }
};
