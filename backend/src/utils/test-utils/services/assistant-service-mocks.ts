import { type Mocked, vi } from "vitest";
import { AssistantService } from "../../../services/assistant-service";

export const createMockAssistantService = (): Mocked<AssistantService> => ({
  call: vi.fn(),
});
