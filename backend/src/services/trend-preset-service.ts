import { ModelError } from "../models/model-error";
import { CreateTrendPresetInput, TrendPreset } from "../models/trend-preset";
import { TrendPresetRepository } from "../ports/trend-preset-repository";
import { Failure, Result, Success } from "../types/result";

export type CreateTrendPresetServiceInput = Omit<
  CreateTrendPresetInput,
  "userId"
>;

/**
 * Manages a user's saved Trends filter presets.
 */
export class TrendPresetService {
  constructor(private trendPresetRepository: TrendPresetRepository) {}

  async getTrendPresetsByUser(userId: string): Promise<Result<TrendPreset[]>> {
    const trendPresets =
      await this.trendPresetRepository.findManyByUserId(userId);

    return Success(
      [...trendPresets].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    );
  }

  /**
   * Saves a configuration as a preset, unless an equal configuration is
   * already saved — in which case the existing entry is returned instead
   * of creating a duplicate.
   */
  async createTrendPreset(
    userId: string,
    input: CreateTrendPresetServiceInput,
  ): Promise<Result<TrendPreset>> {
    const existingTrendPresets =
      await this.trendPresetRepository.findManyByUserId(userId);

    const matchingTrendPreset = existingTrendPresets.find((trendPreset) =>
      this.isMatchingConfiguration(trendPreset, input),
    );

    if (matchingTrendPreset) {
      return Success(matchingTrendPreset);
    }

    try {
      const trendPreset = TrendPreset.create({ userId, ...input });
      await this.trendPresetRepository.create(trendPreset);
      return Success(trendPreset);
    } catch (error) {
      if (error instanceof ModelError) {
        return Failure(error.message);
      }
      throw error;
    }
  }

  async deleteTrendPreset(
    userId: string,
    id: string,
  ): Promise<Result<boolean>> {
    await this.trendPresetRepository.deleteOneById({ id, userId });
    return Success(true);
  }

  private isMatchingConfiguration(
    trendPreset: TrendPreset,
    input: CreateTrendPresetServiceInput,
  ): boolean {
    if (
      trendPreset.periodUnit !== input.periodUnit ||
      trendPreset.lookback !== input.lookback ||
      trendPreset.currency !== input.currency ||
      trendPreset.includeUncategorized !== (input.includeUncategorized ?? false)
    ) {
      return false;
    }

    const presetCategoryIds = new Set(trendPreset.categoryIds);
    const inputCategoryIds = input.categoryIds ?? [];

    return (
      presetCategoryIds.size === inputCategoryIds.length &&
      inputCategoryIds.every((categoryId) => presetCategoryIds.has(categoryId))
    );
  }
}
