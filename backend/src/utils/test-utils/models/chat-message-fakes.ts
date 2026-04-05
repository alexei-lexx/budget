import { faker } from "@faker-js/faker";
import { ChatMessage, ChatMessageRole } from "../../../models/chat-message";

export const fakeChatMessage = (
  overrides: Partial<ChatMessage> = {},
): ChatMessage => {
  const now = new Date();
  return {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    sessionId: faker.string.uuid(),
    role: faker.helpers.arrayElement([
      ChatMessageRole.ASSISTANT,
      ChatMessageRole.USER,
    ]),
    content: faker.lorem.sentence(),
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 60 * 60 * 1000).getTime() / 1000, // Expires in 1 hour
    ...overrides,
  };
};
