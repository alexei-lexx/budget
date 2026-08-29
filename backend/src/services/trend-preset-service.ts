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

    return Success(trendPresets);
  }

  async createTrendPreset(
    userId: string,
    input: CreateTrendPresetServiceInput,
  ): Promise<Result<TrendPreset>> {
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
}
