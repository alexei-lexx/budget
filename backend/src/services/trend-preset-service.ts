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

  async getTrendPresetsByUser(userId: string): Promise<TrendPreset[]> {
    return this.trendPresetRepository.findManyByUserId(userId);
  }

  async createTrendPreset(
    userId: string,
    input: CreateTrendPresetServiceInput,
  ): Promise<TrendPreset> {
    const trendPreset = TrendPreset.create({ userId, ...input });
    await this.trendPresetRepository.create(trendPreset);
    return trendPreset;
  }

  async deleteTrendPreset(userId: string, id: string): Promise<boolean> {
    await this.trendPresetRepository.deleteOneById({ id, userId });
    return true;
  }
}
