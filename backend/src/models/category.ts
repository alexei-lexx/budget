import { randomUUID } from "crypto";
import {
  DateTimeString,
  currentDateTimeString,
} from "../types/date-time-string";
import { Archivable } from "./entity/archivable";
import { Entity } from "./entity/entity";
import { Timestampable } from "./entity/timestampable";
import { Versioned } from "./entity/versioned";
import { ModelError } from "./model-error";

export const NAME_MIN_LENGTH = 1;
export const NAME_MAX_LENGTH = 100;

export enum CategoryType {
  INCOME = "INCOME",
  EXPENSE = "EXPENSE",
}

// Plain data shape.
export interface CategoryData {
  userId: string;
  id: string;
  name: string;
  type: CategoryType;
  excludeFromReports: boolean;
  isArchived: boolean;
  version: number;
  createdAt: DateTimeString;
  updatedAt: DateTimeString;
}

export class Category
  extends Archivable(Versioned(Timestampable(Entity<CategoryData>)))
  implements CategoryData
{
  get userId() {
    return this.data.userId;
  }

  get id() {
    return this.data.id;
  }

  get name() {
    return this.data.name;
  }

  get type() {
    return this.data.type;
  }

  get excludeFromReports() {
    return this.data.excludeFromReports;
  }

  static create(
    input: CreateCategoryInput,
    { idGenerator = randomUUID }: { idGenerator?: () => string } = {},
  ): Category {
    const createdAt = currentDateTimeString();

    const data: CategoryData = {
      id: idGenerator(),
      userId: input.userId,
      name: normalizeCategoryName(input.name),
      type: input.type,
      excludeFromReports: input.excludeFromReports,
      ...Category.archivableDefaults,
      ...Category.versionDefaults,
      createdAt,
      updatedAt: createdAt,
    };

    return new Category(data);
  }

  update(input: UpdateCategoryInput): Category {
    this.assertNotArchived();

    return this.copy({
      ...(input.name !== undefined && {
        name: normalizeCategoryName(input.name),
      }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.excludeFromReports !== undefined && {
        excludeFromReports: input.excludeFromReports,
      }),
      updatedAt: currentDateTimeString(),
    });
  }

  protected assertInvariants(): void {
    const trimmedLength = this.name.trim().length;
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
