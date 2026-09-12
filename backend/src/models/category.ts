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

export class Category implements CategoryData {
  private readonly data: Readonly<CategoryData>;

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

  get isArchived() {
    return this.data.isArchived;
  }

  get version() {
    return this.data.version;
  }

  get createdAt() {
    return this.data.createdAt;
  }

  get updatedAt() {
    return this.data.updatedAt;
  }

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
      version: 0,
      createdAt: now,
      updatedAt: now,
    };

    return new Category(data);
  }

  static fromPersistence(data: Readonly<CategoryData>): Category {
    return new Category(data);
  }

  toData(): Readonly<CategoryData> {
    return {
      ...this.data,
    };
  }

  /**
   * Returns the version this entity will have once persisted.
   */
  nextVersion(): number {
    return this.version + 1;
  }

  bumpVersion(): Category {
    const data: CategoryData = {
      ...this.data,
      version: this.nextVersion(),
    };

    return new Category(
      data,
      // Version bump leaves all invariant-bearing fields unchanged.
      { skipInvariants: true },
    );
  }

  update(input: UpdateCategoryInput): Category {
    if (this.isArchived) {
      throw new ModelError("Cannot update archived category");
    }

    const now = toDateTimeString(new Date().toISOString());

    const data: CategoryData = {
      ...this.data,
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
      ...this.data,
      isArchived: true,
      updatedAt: now,
    };

    return new Category(data);
  }

  private constructor(
    data: Readonly<CategoryData>,
    { skipInvariants = false }: { skipInvariants?: boolean } = {},
  ) {
    this.data = { ...data };

    if (!skipInvariants) {
      this.assertInvariants();
    }
  }

  private assertInvariants(): void {
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
