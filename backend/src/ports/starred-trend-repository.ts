import { StarredTrend } from "../models/starred-trend";

export interface StarredTrendRepository {
  findManyByUserId(userId: string): Promise<StarredTrend[]>;
  create(starredTrend: Readonly<StarredTrend>): Promise<void>;
  deleteOneById(selector: { id: string; userId: string }): Promise<void>;
}
