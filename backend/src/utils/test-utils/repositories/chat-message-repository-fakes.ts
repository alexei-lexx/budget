import { faker } from "@faker-js/faker";
import { ChatMessageRole } from "../../../models/chat-message";
import { CreateChatMessageInput } from "../../../ports/chat-message-repository";

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
    ...overrides,
  };
};
