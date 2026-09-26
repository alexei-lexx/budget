import {
  Category,
  CategoryType,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "../models/category";
import { CategoryRepository } from "../ports/category-repository";
import { EntityScope } from "../types/entity-scope";
import { Failure, Result, Success } from "../types/result";

export interface CategoryService {
  getCategoriesByUser(
    userId: string,
    filters: { scope: EntityScope; type?: CategoryType },
  ): Promise<Result<Category[]>>;
  createCategory(input: CreateCategoryInput): Promise<Result<Category>>;
  updateCategory(
    id: string,
    userId: string,
    input: UpdateCategoryInput,
  ): Promise<Result<Category>>;
  deleteCategory(id: string, userId: string): Promise<Result<Category>>;
}

/**
 * Category service class for handling business logic
 * Implements the service layer pattern for category operations
 */
export class CategoryServiceImpl implements CategoryService {
  constructor(private categoryRepository: CategoryRepository) {}

  /**
   * Get categories for a user filtered by scope, optionally filtered by type
   * Categories are sorted alphabetically by name (case-insensitive)
   * @param userId - The user ID to fetch categories for
   * @param filters.scope - Which categories to include (active, archived, or all)
   * @param filters.type - Optional category type filter (INCOME or EXPENSE)
   * @returns Categories matching the scope and type
   */
  async getCategoriesByUser(
    userId: string,
    { scope, type }: { scope: EntityScope; type?: CategoryType },
  ): Promise<Result<Category[]>> {
    if (scope === "ACTIVE") {
      return Success(
        await this.categoryRepository.findManyByUserId(userId, {
          type,
        }),
      );
    }

    const categories =
      await this.categoryRepository.findManyWithArchivedByUserId(userId);

    const scoped =
      scope === "ALL"
        ? categories
        : categories.filter((category) => category.isArchived);

    return Success(
      type ? scoped.filter((category) => category.type === type) : scoped,
    );
  }

  /**
   * Create a new category for a user
   * @param input - Category creation input
   * @returns The created category, or a failure reason
   */
  async createCategory(input: CreateCategoryInput): Promise<Result<Category>> {
    const category = Category.create(input);

    if (await this.isDuplicateName(category.userId, category.name)) {
      return Failure(`Category "${category.name}" already exists`);
    }

    await this.categoryRepository.create(category);
    return Success(category);
  }

  /**
   * Update a category
   * @param id - Category ID to update
   * @param userId - User ID for authorization
   * @param input - Category update input
   * @returns The updated category, or a failure reason
   */
  async updateCategory(
    id: string,
    userId: string,
    input: UpdateCategoryInput,
  ): Promise<Result<Category>> {
    const existingCategory = await this.categoryRepository.findOneById({
      id,
      userId,
    });

    if (!existingCategory) {
      return Failure("Category not found");
    }

    const updatedCategory = existingCategory.update(input);

    // Check for duplicate names if name is being updated
    if (
      updatedCategory.name !== existingCategory.name &&
      (await this.isDuplicateName(userId, updatedCategory.name, id))
    ) {
      return Failure(`Category "${updatedCategory.name}" already exists`);
    }

    return Success(await this.categoryRepository.update(updatedCategory));
  }

  /**
   * Archive (soft-delete) a category
   * @param id - Category ID to archive
   * @param userId - User ID for authorization
   * @returns The archived category, or a failure reason
   */
  async deleteCategory(id: string, userId: string): Promise<Result<Category>> {
    const existingCategory = await this.categoryRepository.findOneById({
      id,
      userId,
    });

    if (!existingCategory) {
      return Failure("Category not found");
    }

    return Success(
      await this.categoryRepository.update(existingCategory.archive()),
    );
  }

  private async isDuplicateName(
    userId: string,
    name: string,
    excludeId?: string,
  ): Promise<boolean> {
    const existingCategories =
      await this.categoryRepository.findManyByUserId(userId);

    const duplicateCategory = existingCategories.find(
      (category) =>
        category.name.toLowerCase() === name.toLowerCase() &&
        category.id !== excludeId,
    );

    return Boolean(duplicateCategory);
  }
}
