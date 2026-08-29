import { randomUUID } from "crypto";
import { DateTimeString, toDateTimeString } from "../types/date-time-string";
import { ModelError } from "./model-error";

export type TrendPeriodUnit = "MONTH" | "WEEK";

export const LOOKBACK_MIN = 1;
export const LOOKBACK_MAX = 12;

// Plain data shape.
export interface TrendPresetData {
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
 * No isArchived: a trend preset is a lightweight save/remove toggle
 * with no audit or recovery value, so deleting it hard-deletes the row.
 * This is an intentional exception to the soft-deletion rule.
 */
export class TrendPreset implements TrendPresetData {
  readonly id: string;
  readonly userId: string;
  readonly periodUnit: TrendPeriodUnit;
  readonly lookback: number;
  readonly currency: string;
  readonly categoryIds: string[];
  readonly includeUncategorized: boolean;
  readonly createdAt: DateTimeString;

  static create(
    input: CreateTrendPresetInput,
    { idGenerator = randomUUID }: { idGenerator?: () => string } = {},
  ): TrendPreset {
    const data: TrendPresetData = {
      id: idGenerator(),
      userId: input.userId,
      periodUnit: input.periodUnit,
      lookback: input.lookback,
      currency: input.currency,
      categoryIds: input.categoryIds ?? [],
      includeUncategorized: input.includeUncategorized ?? false,
      createdAt: toDateTimeString(new Date().toISOString()),
    };

    return new TrendPreset(data);
  }

  static fromPersistence(data: TrendPresetData): TrendPreset {
    return new TrendPreset(data);
  }

  toData(): TrendPresetData {
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

  private constructor(data: TrendPresetData) {
    TrendPreset.assertInvariants(data);

    this.id = data.id;
    this.userId = data.userId;
    this.periodUnit = data.periodUnit;
    this.lookback = data.lookback;
    this.currency = data.currency;
    this.categoryIds = data.categoryIds;
    this.includeUncategorized = data.includeUncategorized;
    this.createdAt = data.createdAt;
  }

  private static assertInvariants(data: TrendPresetData): void {
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
  }
}

export interface CreateTrendPresetInput {
  userId: string;
  periodUnit: TrendPeriodUnit;
  lookback: number;
  currency: string;
  categoryIds?: string[];
  includeUncategorized?: boolean;
}
