import { Category, CategoryType } from "../models/category";

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
  create(category: Readonly<Category>): Promise<void>;
  update(category: Readonly<Category>): Promise<Category>;
}
