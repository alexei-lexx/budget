import { vi, type Mocked } from "vitest";
import { BackgroundJobDispatcher } from "../../../ports/background-job-dispatcher";

export const createMockBackgroundJobDispatcher =
  (): Mocked<BackgroundJobDispatcher> => ({
    dispatch: vi.fn(),
  });
