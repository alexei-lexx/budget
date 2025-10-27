export enum CategoryType {
  INCOME = "INCOME",
  EXPENSE = "EXPENSE",
}

export interface Category {
  userId: string; // Partition key (same pattern as Accounts)
  id: string; // Sort key - UUID v4
  name: string; // Category name (e.g., "Groceries", "Salary")
  type: CategoryType; // Category type (INCOME, EXPENSE)
  isArchived: boolean; // Soft delete flag
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export interface CreateCategoryInput {
  userId: string;
  name: string;
  type: CategoryType;
}

export interface UpdateCategoryInput {
  name?: string;
  type?: CategoryType;
}

export interface ICategoryRepository {
  findByUserId(
    userId: string,
    options?: { includeArchived?: boolean },
  ): Promise<Category[]>;
  findByUserIdAndType(
    userId: string,
    type: CategoryType,
    options?: { includeArchived?: boolean },
  ): Promise<Category[]>;
  findActiveByUserId(userId: string): Promise<Category[]>;
  findActiveByUserIdAndType(
    userId: string,
    type: CategoryType,
  ): Promise<Category[]>;
  findActiveById(id: string, userId: string): Promise<Category | null>;
  create(input: CreateCategoryInput): Promise<Category>;
  update(
    id: string,
    userId: string,
    input: UpdateCategoryInput,
  ): Promise<Category>;
  archive(id: string, userId: string): Promise<Category>;
}
