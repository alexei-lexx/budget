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

export interface CategoryRepository {
  findOneActiveById(id: string, userId: string): Promise<Category | null>;
  findManyActiveByUserId(userId: string): Promise<Category[]>;
  findManyByUserId(userId: string): Promise<Category[]>;
  findManyActiveByUserIdAndType(
    userId: string,
    type: CategoryType,
  ): Promise<Category[]>;
  findManyByIds(ids: readonly string[], userId: string): Promise<Category[]>;
  create(input: CreateCategoryInput): Promise<Category>;
  update(
    id: string,
    userId: string,
    input: UpdateCategoryInput,
  ): Promise<Category>;
  archive(id: string, userId: string): Promise<Category>;
}
