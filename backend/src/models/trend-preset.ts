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
  includeUncategorized?: true;
  createdAt: DateTimeString;
}

/**
 * No isArchived: a trend preset is a lightweight save/remove toggle
 * with no audit or recovery value, so deleting it hard-deletes the row.
 * This is an intentional exception to the soft-deletion rule.
 */
export class TrendPreset implements TrendPresetData {
  private readonly data: Readonly<TrendPresetData>;

  get id() {
    return this.data.id;
  }

  get userId() {
    return this.data.userId;
  }

  get periodUnit() {
    return this.data.periodUnit;
  }

  get lookback() {
    return this.data.lookback;
  }

  get currency() {
    return this.data.currency;
  }

  get categoryIds() {
    return this.data.categoryIds;
  }

  get includeUncategorized() {
    return this.data.includeUncategorized;
  }

  get createdAt() {
    return this.data.createdAt;
  }

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
      includeUncategorized: input.includeUncategorized,
      createdAt: toDateTimeString(new Date().toISOString()),
    };

    return new TrendPreset(data);
  }

  static fromPersistence(data: Readonly<TrendPresetData>): TrendPreset {
    return new TrendPreset(data);
  }

  toData(): Readonly<TrendPresetData> {
    return {
      ...this.data,
    };
  }

  private constructor(data: Readonly<TrendPresetData>) {
    this.data = { ...data };
    this.assertInvariants();
  }

  private assertInvariants(): void {
    if (
      !Number.isInteger(this.lookback) ||
      this.lookback < LOOKBACK_MIN ||
      this.lookback > LOOKBACK_MAX
    ) {
      throw new ModelError(
        `Lookback must be a whole number from ${LOOKBACK_MIN} to ${LOOKBACK_MAX}`,
      );
    }

    if (this.currency.trim().length === 0) {
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
  includeUncategorized?: true;
}
