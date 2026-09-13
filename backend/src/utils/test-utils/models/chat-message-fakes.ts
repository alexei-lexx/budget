import { faker } from "@faker-js/faker";
import {
  ChatMessage,
  ChatMessageData,
  ChatMessageRole,
  CreateChatMessageInput,
} from "../../../models/chat-message";
import { toDateTimeString } from "../../../types/date-time-string";

export const fakeChatMessage = (
  overrides: Partial<ChatMessageData> = {},
): ChatMessage => {
  const now = new Date();

  return ChatMessage.fromPersistence({
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    sessionId: faker.string.uuid(),
    role: faker.helpers.arrayElement([
      ChatMessageRole.ASSISTANT,
      ChatMessageRole.USER,
    ]),
    content: faker.lorem.sentence(),
    createdAt: toDateTimeString(now.toISOString()),
    expiresAt: Math.floor(faker.date.future().getTime() / 1000),
    ...overrides,
  });
};

export const fakeCreateChatMessageInput = (
  overrides: Partial<CreateChatMessageInput> = {},
): CreateChatMessageInput => {
  return {
    userId: faker.string.uuid(),
    sessionId: faker.string.uuid(),
    role: faker.helpers.arrayElement([
      ChatMessageRole.ASSISTANT,
      ChatMessageRole.USER,
    ]),
    content: faker.lorem.sentence(),
    ttlSeconds: 3600,
    ...overrides,
  };
};
