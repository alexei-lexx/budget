import { type Mocked, vi } from "vitest";
import { StarredTrendRepository } from "../../../ports/starred-trend-repository";

/**
 * Mock starred trend repository for testing
 */
export const createMockStarredTrendRepository =
  (): Mocked<StarredTrendRepository> => ({
    findManyByUserId: vi.fn(),
    create: vi.fn(),
    deleteOneById: vi.fn(),
  });
