import { z } from "zod";
import { TelegramApiClient } from "../services/ports/telegram-api-client";
import { Failure, Result, Success } from "../types/result";

const baseResponseSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true) }),
  z.object({ ok: z.literal(false), description: z.string() }),
]);

const webhookInfoResponseSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), result: z.object({ url: z.string() }) }),
  z.object({ ok: z.literal(false), description: z.string() }),
]);

export class HttpTelegramApiClient implements TelegramApiClient {
  constructor(private readonly baseUrl = "https://api.telegram.org") {}

  async getWebhookInfo(token: string): Promise<Result<{ url: string }>> {
    try {
      const response = await fetch(
        `${this.baseUrl}/bot${token}/getWebhookInfo`,
      );

      if (!response.ok) {
        console.error(
          `Telegram getWebhookInfo failed: HTTP ${response.status}`,
        );
        return Failure(
          `Telegram getWebhookInfo failed: HTTP ${response.status}`,
        );
      }

      const parsed = webhookInfoResponseSchema.safeParse(await response.json());

      if (!parsed.success) {
        console.error(
          "Telegram getWebhookInfo returned unexpected response format",
          parsed.error,
        );
        return Failure(
          "Telegram getWebhookInfo returned unexpected response format",
        );
      }

      if (!parsed.data.ok) {
        console.error(
          `Telegram getWebhookInfo failed: ${parsed.data.description}`,
        );
        return Failure(
          `Telegram getWebhookInfo failed: ${parsed.data.description}`,
        );
      }

      return Success(parsed.data.result);
    } catch (error) {
      console.error("Telegram getWebhookInfo failed:", error);
      return Failure(`Telegram getWebhookInfo failed: ${String(error)}`);
    }
  }

  async setWebhook(params: {
    token: string;
    url: string;
    secretToken: string;
  }): Promise<Result<void>> {
    try {
      const response = await fetch(
        `${this.baseUrl}/bot${params.token}/setWebhook`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: params.url,
            secret_token: params.secretToken,
          }),
        },
      );

      if (!response.ok) {
        console.error(`Telegram setWebhook failed: HTTP ${response.status}`);
        return Failure(`Telegram setWebhook failed: HTTP ${response.status}`);
      }

      const parsed = baseResponseSchema.safeParse(await response.json());

      if (!parsed.success) {
        console.error(
          "Telegram setWebhook returned unexpected response format",
          parsed.error,
        );
        return Failure(
          "Telegram setWebhook returned unexpected response format",
        );
      }

      if (!parsed.data.ok) {
        console.error(`Telegram setWebhook failed: ${parsed.data.description}`);
        return Failure(
          `Telegram setWebhook failed: ${parsed.data.description}`,
        );
      }

      return Success(undefined);
    } catch (error) {
      console.error("Telegram setWebhook failed:", error);
      return Failure(`Telegram setWebhook failed: ${String(error)}`);
    }
  }

  async deleteWebhook(token: string): Promise<Result<void>> {
    try {
      const response = await fetch(
        `${this.baseUrl}/bot${token}/deleteWebhook`,
        { method: "POST" },
      );

      if (!response.ok) {
        console.error(`Telegram deleteWebhook failed: HTTP ${response.status}`);
        return Failure(
          `Telegram deleteWebhook failed: HTTP ${response.status}`,
        );
      }

      const parsed = baseResponseSchema.safeParse(await response.json());

      if (!parsed.success) {
        console.error(
          "Telegram deleteWebhook returned unexpected response format",
          parsed.error,
        );
        return Failure(
          "Telegram deleteWebhook returned unexpected response format",
        );
      }

      if (!parsed.data.ok) {
        console.error(
          `Telegram deleteWebhook failed: ${parsed.data.description}`,
        );
        return Failure(
          `Telegram deleteWebhook failed: ${parsed.data.description}`,
        );
      }

      return Success(undefined);
    } catch (error) {
      console.error("Telegram deleteWebhook failed:", error);
      return Failure(`Telegram deleteWebhook failed: ${String(error)}`);
    }
  }

  async sendMessage(params: {
    token: string;
    chatId: number;
    text: string;
  }): Promise<Result<void>> {
    try {
      const response = await fetch(
        `${this.baseUrl}/bot${params.token}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: params.chatId,
            text: params.text,
          }),
        },
      );

      if (!response.ok) {
        console.error(`Telegram sendMessage failed: HTTP ${response.status}`);
        return Failure(`Telegram sendMessage failed: HTTP ${response.status}`);
      }

      const parsed = baseResponseSchema.safeParse(await response.json());

      if (!parsed.success) {
        console.error(
          "Telegram sendMessage returned unexpected response format",
          parsed.error,
        );
        return Failure(
          "Telegram sendMessage returned unexpected response format",
        );
      }

      if (!parsed.data.ok) {
        console.error(
          `Telegram sendMessage failed: ${parsed.data.description}`,
        );
        return Failure(
          `Telegram sendMessage failed: ${parsed.data.description}`,
        );
      }

      return Success(undefined);
    } catch (error) {
      console.error("Telegram sendMessage failed:", error);
      return Failure(`Telegram sendMessage failed: ${String(error)}`);
    }
  }
}
