import { jest } from "@jest/globals";
import { ChatMessageRepository } from "../../../ports/chat-message-repository";

export const createMockChatMessageRepository =
  (): jest.Mocked<ChatMessageRepository> => ({
    findManyRecentBySessionId: jest.fn(),
    create: jest.fn(),
  });
