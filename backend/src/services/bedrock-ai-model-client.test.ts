import type {
  BedrockRuntimeClient,
  ConverseCommandInput,
} from "@aws-sdk/client-bedrock-runtime";
import type { AiModelMessage } from "./ai-model-client";
import { BedrockAiModelClient } from "./bedrock-ai-model-client";

jest.mock("../utils/bedrock-runtime-client", () => ({
  createBedrockRuntimeClient: jest.fn(),
  loadBedrockMaxTokens: jest.fn(() => 1024),
  loadBedrockModelId: jest.fn(() => "test-model-id"),
  loadBedrockTemperature: jest.fn(() => 0.7),
}));

describe("BedrockAiModelClient", () => {
  let client: BedrockAiModelClient;
  let mockBedrockRuntimeClient: { send: jest.Mock };

  beforeEach(() => {
    mockBedrockRuntimeClient = {
      send: jest.fn(),
    };

    client = new BedrockAiModelClient(
      mockBedrockRuntimeClient as unknown as BedrockRuntimeClient,
      2048,
      "custom-model-id",
      0.5,
    );

    jest.clearAllMocks();
  });

  describe("generateResponse", () => {
    it("should return text response from bedrock", async () => {
      // Arrange
      const messages: AiModelMessage[] = [{ role: "user", content: "Hello" }];
      mockBedrockRuntimeClient.send.mockResolvedValue({
        output: {
          message: {
            content: [{ text: "Hello there!" }],
          },
        },
      });

      // Act
      const result = await client.generateResponse(messages);

      // Assert
      expect(result).toBe("Hello there!");
    });

    it("should concatenate multiple content blocks", async () => {
      // Arrange
      const messages: AiModelMessage[] = [
        { role: "user", content: "Tell me a story" },
      ];
      mockBedrockRuntimeClient.send.mockResolvedValue({
        output: {
          message: {
            content: [{ text: "Once upon" }, { text: " a time" }],
          },
        },
      });

      // Act
      const result = await client.generateResponse(messages);

      // Assert
      expect(result).toBe("Once upon a time");
    });

    it("should separate system messages from user/assistant messages", async () => {
      // Arrange
      const messages: AiModelMessage[] = [
        { role: "system", content: "Be concise" },
        { role: "system", content: "Be helpful" },
        { role: "user", content: "Hi" },
        { role: "assistant", content: "Hello!" },
        { role: "user", content: "How are you?" },
      ];
      mockBedrockRuntimeClient.send.mockResolvedValue({
        output: {
          message: {
            content: [{ text: "I am good" }],
          },
        },
      });

      // Act
      await client.generateResponse(messages);

      // Assert
      const commandArg = mockBedrockRuntimeClient.send.mock.calls[0][0];
      expect(commandArg.input).toEqual({
        modelId: "custom-model-id",
        messages: [
          { role: "user", content: [{ text: "Hi" }] },
          { role: "assistant", content: [{ text: "Hello!" }] },
          { role: "user", content: [{ text: "How are you?" }] },
        ],
        system: [{ text: "Be concise" }, { text: "Be helpful" }],
        inferenceConfig: {
          maxTokens: 2048,
          temperature: 0.5,
        },
      });
    });

    it("should throw error when response is empty", async () => {
      // Arrange
      const messages: AiModelMessage[] = [{ role: "user", content: "Hello" }];
      mockBedrockRuntimeClient.send.mockResolvedValue({
        output: {
          message: {
            content: [],
          },
        },
      });

      // Act & Assert
      await expect(client.generateResponse(messages)).rejects.toThrow(
        "AI response was empty",
      );
    });

    it("should throw error when response content is undefined", async () => {
      // Arrange
      const messages: AiModelMessage[] = [{ role: "user", content: "Hello" }];
      mockBedrockRuntimeClient.send.mockResolvedValue({
        output: {
          message: {},
        },
      });

      // Act & Assert
      await expect(client.generateResponse(messages)).rejects.toThrow(
        "AI response was empty",
      );
    });

    it("should throw error when response is only whitespace", async () => {
      // Arrange
      const messages: AiModelMessage[] = [{ role: "user", content: "Hello" }];
      mockBedrockRuntimeClient.send.mockResolvedValue({
        output: {
          message: {
            content: [{ text: "   " }],
          },
        },
      });

      // Act & Assert
      await expect(client.generateResponse(messages)).rejects.toThrow(
        "AI response was empty",
      );
    });

    it("should handle content blocks without text property", async () => {
      // Arrange
      const messages: AiModelMessage[] = [{ role: "user", content: "Hello" }];
      mockBedrockRuntimeClient.send.mockResolvedValue({
        output: {
          message: {
            content: [{ image: "some-image" }, { text: "Hello!" }],
          },
        },
      });

      // Act
      const result = await client.generateResponse(messages);

      // Assert
      expect(result).toBe("Hello!");
    });

    it("should use default configuration when not provided", async () => {
      // Arrange
      const defaultClient = new BedrockAiModelClient(
        mockBedrockRuntimeClient as unknown as BedrockRuntimeClient,
      );
      const messages: AiModelMessage[] = [{ role: "user", content: "Hi" }];
      mockBedrockRuntimeClient.send.mockResolvedValue({
        output: {
          message: {
            content: [{ text: "Hello" }],
          },
        },
      });

      // Act
      await defaultClient.generateResponse(messages);

      // Assert
      const commandArg = mockBedrockRuntimeClient.send.mock.calls[0][0];
      const input = commandArg.input as ConverseCommandInput;
      expect(input.inferenceConfig).toEqual({
        maxTokens: 1024,
        temperature: 0.7,
      });
      expect(input.modelId).toBe("test-model-id");
    });
  });
});
