import { type Mocked, vi } from "vitest";
import { TrendPresetRepository } from "../../../ports/trend-preset-repository";

/**
 * Mock trend preset repository for testing
 */
export const createMockTrendPresetRepository =
  (): Mocked<TrendPresetRepository> => ({
    findManyByUserId: vi.fn(),
    create: vi.fn(),
    deleteOneById: vi.fn(),
  });
