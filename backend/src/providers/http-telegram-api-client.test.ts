import { HttpTelegramApiClient } from "./http-telegram-api-client";

const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

describe("HttpTelegramApiClient", () => {
  const baseUrl = "https://api.telegram.test";

  let client: HttpTelegramApiClient;

  beforeEach(() => {
    client = new HttpTelegramApiClient(baseUrl);
    mockFetch.mockReset();
  });

  describe("getWebhookInfo", () => {
    it("should call Telegram getWebhookInfo endpoint and return webhook info", async () => {
      const webhookInfo = { url: "https://example.com/telegram/webhook" };
      mockFetch.mockResolvedValue(
        mockResponse({ ok: true, result: webhookInfo }),
      );

      const result = await client.getWebhookInfo("token-12345");

      expect(result).toEqual({ success: true, data: webhookInfo });
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/bottoken-12345/getWebhookInfo`,
      );
    });

    it("should return failure when Telegram returns ok: false", async () => {
      mockFetch.mockResolvedValue(
        mockResponse({ ok: false, description: "Some error" }),
      );

      const result = await client.getWebhookInfo("token-12345");

      expect(result).toEqual({
        success: false,
        error: "Telegram getWebhookInfo failed: Some error",
      });
    });

    it("should return failure when response has unexpected format", async () => {
      mockFetch.mockResolvedValue(mockResponse({ status: "error" }));

      const result = await client.getWebhookInfo("token-12345");

      expect(result).toEqual({
        success: false,
        error: "Telegram getWebhookInfo returned unexpected response format",
      });
    });

    it("should return failure when HTTP status is not ok", async () => {
      mockFetch.mockResolvedValue(mockResponse({}, 500));

      const result = await client.getWebhookInfo("token-12345");

      expect(result).toEqual({
        success: false,
        error: "Telegram getWebhookInfo failed: HTTP 500",
      });
    });

    it("should return failure when fetch throws", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const result = await client.getWebhookInfo("token-12345");

      expect(result).toEqual({
        success: false,
        error: "Telegram getWebhookInfo failed: Error: Network error",
      });
    });
  });

  describe("setWebhook", () => {
    const params = {
      token: "token-12345",
      url: "https://example.com/telegram/webhook",
      secretToken: "secret-67890",
    };

    it("should call Telegram setWebhook endpoint", async () => {
      mockFetch.mockResolvedValue(mockResponse({ ok: true }));

      const result = await client.setWebhook(params);

      expect(result).toEqual({ success: true, data: undefined });
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/bottoken-12345/setWebhook`,
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: "https://example.com/telegram/webhook",
            secret_token: "secret-67890",
          }),
        }),
      );
    });

    it("should return failure when Telegram returns ok: false", async () => {
      mockFetch.mockResolvedValue(
        mockResponse({ ok: false, description: "Some error" }),
      );

      const result = await client.setWebhook(params);

      expect(result).toEqual({
        success: false,
        error: "Telegram setWebhook failed: Some error",
      });
    });

    it("should return failure when response has unexpected format", async () => {
      mockFetch.mockResolvedValue(mockResponse({ status: "error" }));

      const result = await client.setWebhook(params);

      expect(result).toEqual({
        success: false,
        error: "Telegram setWebhook returned unexpected response format",
      });
    });

    it("should return failure when HTTP status is not ok", async () => {
      mockFetch.mockResolvedValue(mockResponse({}, 500));

      const result = await client.setWebhook(params);

      expect(result).toEqual({
        success: false,
        error: "Telegram setWebhook failed: HTTP 500",
      });
    });

    it("should return failure when fetch throws", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const result = await client.setWebhook(params);

      expect(result).toEqual({
        success: false,
        error: "Telegram setWebhook failed: Error: Network error",
      });
    });
  });

  describe("deleteWebhook", () => {
    it("should call Telegram deleteWebhook endpoint", async () => {
      mockFetch.mockResolvedValue(mockResponse({ ok: true }));

      const result = await client.deleteWebhook("token-12345");

      expect(result).toEqual({ success: true, data: undefined });
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/bottoken-12345/deleteWebhook`,
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("should return failure when Telegram returns ok: false", async () => {
      mockFetch.mockResolvedValue(
        mockResponse({ ok: false, description: "Some error" }),
      );

      const result = await client.deleteWebhook("token-12345");

      expect(result).toEqual({
        success: false,
        error: "Telegram deleteWebhook failed: Some error",
      });
    });

    it("should return failure when response has unexpected format", async () => {
      mockFetch.mockResolvedValue(mockResponse({ status: "error" }));

      const result = await client.deleteWebhook("token-12345");

      expect(result).toEqual({
        success: false,
        error: "Telegram deleteWebhook returned unexpected response format",
      });
    });

    it("should return failure when HTTP status is not ok", async () => {
      mockFetch.mockResolvedValue(mockResponse({}, 500));

      const result = await client.deleteWebhook("token-12345");

      expect(result).toEqual({
        success: false,
        error: "Telegram deleteWebhook failed: HTTP 500",
      });
    });

    it("should return failure when fetch throws", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const result = await client.deleteWebhook("token-12345");

      expect(result).toEqual({
        success: false,
        error: "Telegram deleteWebhook failed: Error: Network error",
      });
    });
  });

  describe("sendMessage", () => {
    const params = {
      token: "token-12345",
      chatId: 123456,
      text: "Hello!",
    };

    it("should call Telegram sendMessage endpoint", async () => {
      mockFetch.mockResolvedValue(mockResponse({ ok: true }));

      const result = await client.sendMessage(params);

      expect(result).toEqual({ success: true, data: undefined });
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/bottoken-12345/sendMessage`,
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: 123456, text: "Hello!" }),
        }),
      );
    });

    it("should return failure when Telegram returns ok: false", async () => {
      mockFetch.mockResolvedValue(
        mockResponse({ ok: false, description: "Some error" }),
      );

      const result = await client.sendMessage(params);

      expect(result).toEqual({
        success: false,
        error: "Telegram sendMessage failed: Some error",
      });
    });

    it("should return failure when response has unexpected format", async () => {
      mockFetch.mockResolvedValue(mockResponse({ status: "error" }));

      const result = await client.sendMessage(params);

      expect(result).toEqual({
        success: false,
        error: "Telegram sendMessage returned unexpected response format",
      });
    });

    it("should return failure when HTTP status is not ok", async () => {
      mockFetch.mockResolvedValue(mockResponse({}, 500));

      const result = await client.sendMessage(params);

      expect(result).toEqual({
        success: false,
        error: "Telegram sendMessage failed: HTTP 500",
      });
    });

    it("should return failure when fetch throws", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const result = await client.sendMessage(params);

      expect(result).toEqual({
        success: false,
        error: "Telegram sendMessage failed: Error: Network error",
      });
    });
  });
});
