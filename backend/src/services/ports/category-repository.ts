import { Category, CategoryType } from "../../models/category";

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

export interface ICategoryRepository {
  findActiveByUserId(userId: string): Promise<Category[]>;
  findAllByUserId(userId: string): Promise<Category[]>;
  findActiveByUserIdAndType(
    userId: string,
    type: CategoryType,
  ): Promise<Category[]>;
  findActiveById(id: string, userId: string): Promise<Category | null>;
  findByIds(ids: readonly string[], userId: string): Promise<Category[]>;
  create(input: CreateCategoryInput): Promise<Category>;
  update(
    id: string,
    userId: string,
    input: UpdateCategoryInput,
  ): Promise<Category>;
  archive(id: string, userId: string): Promise<Category>;
}
