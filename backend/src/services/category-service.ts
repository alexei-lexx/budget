import { Category, CategoryType } from "../models/category";
import {
  CategoryRepository,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "../ports/category-repository";
import { BusinessError } from "./business-error";

export const NAME_MIN_LENGTH = 1;
export const NAME_MAX_LENGTH = 100;

export interface CategoryService {
  getCategoriesByUser(userId: string, type?: CategoryType): Promise<Category[]>;
  createCategory(input: CreateCategoryInput): Promise<Category>;
  updateCategory(
    id: string,
    userId: string,
    input: UpdateCategoryInput,
  ): Promise<Category>;
  deleteCategory(id: string, userId: string): Promise<Category>;
}

/**
 * Category service class for handling business logic
 * Implements the service layer pattern for category operations
 */
export class CategoryServiceImpl implements CategoryService {
  constructor(private categoryRepository: CategoryRepository) {}

  /**
   * Get all active categories for a user, optionally filtered by type
   * Categories are sorted alphabetically by name (case-insensitive)
   * @param userId - The user ID to fetch categories for
   * @param type - Optional category type filter (INCOME or EXPENSE)
   * @returns Promise<Category[]> - Alphabetically sorted categories
   */
  async getCategoriesByUser(
    userId: string,
    type?: CategoryType,
  ): Promise<Category[]> {
    return await this.categoryRepository.findManyByUserId(userId, {
      type,
    });
  }

  /**
   * Create a new category for a user
   * @param input - Category creation input
   * @returns Promise<Category> - The created category
   */
  async createCategory(input: CreateCategoryInput): Promise<Category> {
    const validatedInput = {
      ...input,
      name: this.validateName(input.name),
    };

    // Check for duplicate names
    await this.checkDuplicateName(validatedInput.userId, validatedInput.name);

    return await this.categoryRepository.create(validatedInput);
  }

  /**
   * Update a category
   * @param id - Category ID to update
   * @param userId - User ID for authorization
   * @param input - Category update input
   * @returns Promise<Category> - The updated category
   */
  async updateCategory(
    id: string,
    userId: string,
    input: UpdateCategoryInput,
  ): Promise<Category> {
    const validatedInput = {
      ...input,
      ...(input.name !== undefined && { name: this.validateName(input.name) }),
    };

    // Check for duplicate names if name is being updated
    if (validatedInput.name !== undefined) {
      await this.checkDuplicateName(userId, validatedInput.name, id);
    }

    return await this.categoryRepository.update({ id, userId }, validatedInput);
  }

  /**
   * Archive (soft-delete) a category
   * @param id - Category ID to archive
   * @param userId - User ID for authorization
   * @returns Promise<Category> - The archived category
   */
  async deleteCategory(id: string, userId: string): Promise<Category> {
    return await this.categoryRepository.archive({ id, userId });
  }

  private validateName(name: string): string {
    const trimmedName = name.trim();

    if (
      trimmedName.length < NAME_MIN_LENGTH ||
      trimmedName.length > NAME_MAX_LENGTH
    ) {
      throw new BusinessError(
        `Category name must be between ${NAME_MIN_LENGTH} and ${NAME_MAX_LENGTH} characters`,
      );
    }

    return trimmedName;
  }

  private async checkDuplicateName(
    userId: string,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const existingCategories =
      await this.categoryRepository.findManyByUserId(userId);

    const duplicateCategory = existingCategories.find(
      (category) =>
        category.name.toLowerCase() === name.toLowerCase() &&
        category.id !== excludeId,
    );

    if (duplicateCategory) {
      throw new BusinessError(`Category "${name}" already exists`);
    }
  }
}
