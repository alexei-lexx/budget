import {
  Category,
  CategoryType,
  CreateCategoryInput,
  ICategoryRepository,
  UpdateCategoryInput,
} from "../models/category";

/**
 * Category service class for handling business logic
 * Implements the service layer pattern for category operations
 */
export class CategoryService {
  constructor(private categoryRepository: ICategoryRepository) {}

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
    if (type) {
      return await this.categoryRepository.findActiveByUserIdAndType(
        userId,
        type,
      );
    }
    return await this.categoryRepository.findActiveByUserId(userId);
  }

  /**
   * Create a new category for a user
   * @param input - Category creation input
   * @returns Promise<Category> - The created category
   */
  async createCategory(input: CreateCategoryInput): Promise<Category> {
    return await this.categoryRepository.create(input);
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
    return await this.categoryRepository.update(id, userId, input);
  }

  /**
   * Archive (soft-delete) a category
   * @param id - Category ID to archive
   * @param userId - User ID for authorization
   * @returns Promise<Category> - The archived category
   */
  async deleteCategory(id: string, userId: string): Promise<Category> {
    return await this.categoryRepository.archive(id, userId);
  }
}
