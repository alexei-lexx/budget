import { jest } from "@jest/globals";
import { BackgroundJobDispatcher } from "../../../services/ports/background-job-dispatcher";

export const createMockBackgroundJobDispatcher =
  (): jest.Mocked<BackgroundJobDispatcher> => ({
    dispatch: jest.fn(),
  });
