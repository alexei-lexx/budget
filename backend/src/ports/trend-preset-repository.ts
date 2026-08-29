import { TrendPreset } from "../models/trend-preset";

export interface TrendPresetRepository {
  findManyByUserId(userId: string): Promise<TrendPreset[]>;
  create(trendPreset: Readonly<TrendPreset>): Promise<void>;
  deleteOneById(selector: { id: string; userId: string }): Promise<void>;
}
