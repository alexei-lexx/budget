import { vi, type Mocked } from "vitest";
import { ChatMessageRepository } from "../../../ports/chat-message-repository";

export const createMockChatMessageRepository =
  (): Mocked<ChatMessageRepository> => ({
    findManyRecentBySessionId: vi.fn(),
    create: vi.fn(),
  });
