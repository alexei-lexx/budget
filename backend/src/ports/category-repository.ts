import { Category, CategoryType } from "../models/category";

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
  findOneById(selector: {
    id: string;
    userId: string;
  }): Promise<Category | null>;
  findManyByUserId(
    userId: string,
    filters?: { type?: CategoryType },
  ): Promise<Category[]>;
  findManyWithArchivedByUserId(userId: string): Promise<Category[]>;
  findManyWithArchivedByIds(selector: {
    ids: readonly string[];
    userId: string;
  }): Promise<Category[]>;
  create(input: CreateCategoryInput): Promise<Category>;
  update(
    selector: { id: string; userId: string },
    input: UpdateCategoryInput,
  ): Promise<Category>;
  archive(selector: { id: string; userId: string }): Promise<Category>;
}
