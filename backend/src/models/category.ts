import { randomUUID } from "crypto";
import { DateTimeString, toDateTimeString } from "../types/date-time-string";
import { ModelError } from "./model-error";

export const NAME_MIN_LENGTH = 1;
export const NAME_MAX_LENGTH = 100;

export enum CategoryType {
  INCOME = "INCOME",
  EXPENSE = "EXPENSE",
}

// Plain data shape.
export interface CategoryData {
  userId: string; // Partition key (same pattern as Accounts)
  id: string; // Sort key - UUID v4
  name: string; // Category name (e.g., "Groceries", "Salary")
  type: CategoryType; // Category type (INCOME, EXPENSE)
  excludeFromReports: boolean; // Whether to exclude from monthly reports
  isArchived: boolean; // Soft delete flag
  createdAt: DateTimeString; // ISO timestamp
  updatedAt: DateTimeString; // ISO timestamp
}

export class Category implements CategoryData {
  readonly userId: string;
  readonly id: string;
  readonly name: string;
  readonly type: CategoryType;
  readonly excludeFromReports: boolean;
  readonly isArchived: boolean;
  readonly createdAt: DateTimeString;
  readonly updatedAt: DateTimeString;

  static create(
    input: CreateCategoryInput,
    { idGenerator = randomUUID }: { idGenerator?: () => string } = {},
  ): Category {
    const now = toDateTimeString(new Date().toISOString());

    const data: CategoryData = {
      id: idGenerator(),
      userId: input.userId,
      name: normalizeCategoryName(input.name),
      type: input.type,
      excludeFromReports: input.excludeFromReports,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    };

    return new Category(data);
  }

  static fromPersistence(data: CategoryData): Category {
    return new Category(data);
  }

  toData(): CategoryData {
    return {
      userId: this.userId,
      id: this.id,
      name: this.name,
      type: this.type,
      excludeFromReports: this.excludeFromReports,
      isArchived: this.isArchived,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  update(input: UpdateCategoryInput): Category {
    if (this.isArchived) {
      throw new ModelError("Cannot update archived category");
    }

    const now = toDateTimeString(new Date().toISOString());

    const data: CategoryData = {
      ...this.toData(),
      name:
        input.name !== undefined
          ? normalizeCategoryName(input.name)
          : this.name,
      type: input.type ?? this.type,
      excludeFromReports: input.excludeFromReports ?? this.excludeFromReports,
      updatedAt: now,
    };

    return new Category(data);
  }

  archive(): Category {
    if (this.isArchived) {
      throw new ModelError("Cannot archive archived category");
    }

    const now = toDateTimeString(new Date().toISOString());

    const data: CategoryData = {
      ...this.toData(),
      isArchived: true,
      updatedAt: now,
    };

    return new Category(data);
  }

  private constructor(data: CategoryData) {
    Category.assertInvariants(data);

    this.userId = data.userId;
    this.id = data.id;
    this.name = data.name;
    this.type = data.type;
    this.excludeFromReports = data.excludeFromReports;
    this.isArchived = data.isArchived;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  private static assertInvariants(data: CategoryData): void {
    const trimmedLength = data.name.trim().length;
    if (trimmedLength < NAME_MIN_LENGTH || trimmedLength > NAME_MAX_LENGTH) {
      throw new ModelError(
        `Category name must be between ${NAME_MIN_LENGTH} and ${NAME_MAX_LENGTH} characters`,
      );
    }
  }
}

export interface CreateCategoryInput {
  userId: string;
  name: string;
  type: CategoryType;
  excludeFromReports: boolean;
}

export interface UpdateCategoryInput {
  name?: string;
  type?: CategoryType;
  excludeFromReports?: boolean;
}

function normalizeCategoryName(name: string): string {
  return name.trim();
}
