import {
  Category,
  CategoryType,
  ICategoryRepository,
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
}
