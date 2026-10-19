import { type Mocked, vi } from "vitest";
import { Logger } from "../../../ports/logger";

export const createMockLogger = (): Mocked<Logger> => ({
  error: vi.fn(),
  info: vi.fn(),
});
