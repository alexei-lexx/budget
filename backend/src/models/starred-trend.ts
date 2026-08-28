import { randomUUID } from "crypto";
import { DateTimeString, toDateTimeString } from "../types/date-time-string";
import { ModelError } from "./model-error";

export type TrendPeriodUnit = "MONTH" | "WEEK";

export const LOOKBACK_MIN = 1;
export const LOOKBACK_MAX = 12;

// Plain data shape.
export interface StarredTrendData {
  id: string;
  userId: string;
  periodUnit: TrendPeriodUnit;
  lookback: number;
  currency: string;
  categoryIds: string[];
  includeUncategorized: boolean;
  createdAt: DateTimeString;
}

/**
 * No isArchived: a starred trend is a lightweight save/remove toggle
 * with no audit or recovery value, so unstarring hard-deletes the row.
 * This is an intentional exception to the soft-deletion rule.
 */
export class StarredTrend implements StarredTrendData {
  readonly id: string;
  readonly userId: string;
  readonly periodUnit: TrendPeriodUnit;
  readonly lookback: number;
  readonly currency: string;
  readonly categoryIds: string[];
  readonly includeUncategorized: boolean;
  readonly createdAt: DateTimeString;

  static create(
    input: CreateStarredTrendInput,
    { idGenerator = randomUUID }: { idGenerator?: () => string } = {},
  ): StarredTrend {
    const data: StarredTrendData = {
      id: idGenerator(),
      userId: input.userId,
      periodUnit: input.periodUnit,
      lookback: input.lookback,
      currency: input.currency,
      categoryIds: input.categoryIds ?? [],
      includeUncategorized: input.includeUncategorized ?? false,
      createdAt: toDateTimeString(new Date().toISOString()),
    };

    return new StarredTrend(data);
  }

  static fromPersistence(data: StarredTrendData): StarredTrend {
    return new StarredTrend(data);
  }

  toData(): StarredTrendData {
    return {
      id: this.id,
      userId: this.userId,
      periodUnit: this.periodUnit,
      lookback: this.lookback,
      currency: this.currency,
      categoryIds: this.categoryIds,
      includeUncategorized: this.includeUncategorized,
      createdAt: this.createdAt,
    };
  }

  private constructor(data: StarredTrendData) {
    StarredTrend.assertInvariants(data);

    this.id = data.id;
    this.userId = data.userId;
    this.periodUnit = data.periodUnit;
    this.lookback = data.lookback;
    this.currency = data.currency;
    this.categoryIds = data.categoryIds;
    this.includeUncategorized = data.includeUncategorized;
    this.createdAt = data.createdAt;
  }

  private static assertInvariants(data: StarredTrendData): void {
    if (
      !Number.isInteger(data.lookback) ||
      data.lookback < LOOKBACK_MIN ||
      data.lookback > LOOKBACK_MAX
    ) {
      throw new ModelError(
        `Lookback must be a whole number from ${LOOKBACK_MIN} to ${LOOKBACK_MAX}`,
      );
    }

    if (data.currency.trim().length === 0) {
      throw new ModelError("Currency must not be empty");
    }

    if (data.periodUnit !== "MONTH" && data.periodUnit !== "WEEK") {
      throw new ModelError(`Unsupported period unit: ${data.periodUnit}`);
    }
  }
}

export interface CreateStarredTrendInput {
  userId: string;
  periodUnit: TrendPeriodUnit;
  lookback: number;
  currency: string;
  categoryIds?: string[];
  includeUncategorized?: boolean;
}
