import { Result, Success } from "ts-result";
import { ModelError } from "../models/model-error";
import { CreateTrendPresetInput, TrendPreset } from "../models/trend-preset";
import { TrendPresetRepository } from "../ports/trend-preset-repository";

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
    const trendPresetResult = Result.fromThrowable(ModelError, () =>
      TrendPreset.create({ userId, ...input }),
    );
    if (!trendPresetResult.success) return trendPresetResult;

    const trendPreset = trendPresetResult.data;
    await this.trendPresetRepository.create(trendPreset);
    return Success(trendPreset);
  }

  async deleteTrendPreset(
    userId: string,
    id: string,
  ): Promise<Result<boolean>> {
    await this.trendPresetRepository.deleteOneById({ id, userId });
    return Success(true);
  }
}
