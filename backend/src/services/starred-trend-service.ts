import { ModelError } from "../models/model-error";
import { CreateStarredTrendInput, StarredTrend } from "../models/starred-trend";
import { StarredTrendRepository } from "../ports/starred-trend-repository";
import { Failure, Result, Success } from "../types/result";

export type StarTrendInput = Omit<CreateStarredTrendInput, "userId">;

/**
 * Manages a user's saved (starred) Trends filter configurations.
 */
export class StarredTrendService {
  constructor(private starredTrendRepository: StarredTrendRepository) {}

  async listStarredTrends(userId: string): Promise<Result<StarredTrend[]>> {
    const starredTrends =
      await this.starredTrendRepository.findManyByUserId(userId);

    return Success(
      [...starredTrends].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    );
  }

  /**
   * Saves a configuration as starred, unless an equal configuration is
   * already starred — in which case the existing entry is returned instead
   * of creating a duplicate.
   */
  async starTrend(
    userId: string,
    input: StarTrendInput,
  ): Promise<Result<StarredTrend>> {
    const existingStarredTrends =
      await this.starredTrendRepository.findManyByUserId(userId);

    const matchingStarredTrend = existingStarredTrends.find((starredTrend) =>
      this.isMatchingConfiguration(starredTrend, input),
    );

    if (matchingStarredTrend) {
      return Success(matchingStarredTrend);
    }

    try {
      const starredTrend = StarredTrend.create({ userId, ...input });
      await this.starredTrendRepository.create(starredTrend);
      return Success(starredTrend);
    } catch (error) {
      if (error instanceof ModelError) {
        return Failure(error.message);
      }
      throw error;
    }
  }

  async unstarTrend(userId: string, id: string): Promise<Result<boolean>> {
    await this.starredTrendRepository.deleteOneById({ id, userId });
    return Success(true);
  }

  private isMatchingConfiguration(
    starredTrend: StarredTrend,
    input: StarTrendInput,
  ): boolean {
    if (
      starredTrend.periodUnit !== input.periodUnit ||
      starredTrend.lookback !== input.lookback ||
      starredTrend.currency !== input.currency ||
      starredTrend.includeUncategorized !==
        (input.includeUncategorized ?? false)
    ) {
      return false;
    }

    const starredCategoryIds = new Set(starredTrend.categoryIds);
    const inputCategoryIds = input.categoryIds ?? [];

    return (
      starredCategoryIds.size === inputCategoryIds.length &&
      inputCategoryIds.every((categoryId) => starredCategoryIds.has(categoryId))
    );
  }
}
