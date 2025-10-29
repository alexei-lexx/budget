import DataLoader from "dataloader";
import { Category, ICategoryRepository } from "../models/Category";
import { TransactionEmbeddedCategory } from "../types/graphql";

export type { TransactionEmbeddedCategory };

const createStubCategory = (id: string): TransactionEmbeddedCategory => ({
  id,
  name: "Unknown",
  isArchived: false,
});

/**
 * Batch load categories by their IDs
 * Deduplicates IDs and returns results in the same order as input
 * Always returns category data (either real or stub with name "Unknown")
 *
 * @param categoryIds - Array of category IDs to batch load
 * @param categoryRepository - Repository instance for category lookups
 * @param userId - Authenticated user ID for authorization scoping
 * @returns Array of categories or stub data, in same order as input IDs
 */
export async function batchLoadCategories(
  categoryIds: readonly string[],
  categoryRepository: ICategoryRepository,
  userId: string,
): Promise<TransactionEmbeddedCategory[]> {
  if (categoryIds.length === 0) {
    return [];
  }

  // Deduplicate IDs while preserving original order mapping
  const uniqueIds = Array.from(new Set(categoryIds));

  try {
    // Fetch all categories in a single batch operation (including archived items)
    const categories = await categoryRepository.findByIds(uniqueIds, userId);

    // Create a map of ID to category (repository returns arbitrary order)
    const categoryMap = new Map<string, Category>();
    categories.forEach((category) => {
      categoryMap.set(category.id, category);
    });

    // Return results in original order, converting to embedded type
    return categoryIds.map((id) => {
      const category = categoryMap.get(id);

      if (!category) {
        // Log warning for missing categories (data consistency edge case)
        console.warn(`Missing category ${id} for transaction context`);
        // Return stub data instead of null
        return createStubCategory(id);
      }

      return {
        id: category.id,
        name: category.name,
        isArchived: category.isArchived,
      };
    });
  } catch (error) {
    console.error("Error batch loading categories:", error);
    throw error;
  }
}

/**
 * Create a DataLoader instance for categories
 * Scoped per GraphQL request to ensure fresh data on each request
 *
 * @param categoryRepository - Repository instance for category lookups
 * @param getUserId - Function that returns the authenticated user ID (called during batch operations)
 * @returns DataLoader instance configured for category batching
 */
export function createCategoryLoader(
  categoryRepository: ICategoryRepository,
  getUserId: () => Promise<string>,
): DataLoader<string, TransactionEmbeddedCategory> {
  return new DataLoader(async (categoryIds) => {
    const userId = await getUserId();
    return batchLoadCategories(categoryIds, categoryRepository, userId);
  });
}
