import { tool } from "langchain";
import { z } from "zod";
import { CategoryType } from "../../models/category";
import { CategoryRepository } from "../../ports/category-repository";
import { TransactionRepository } from "../../ports/transaction-repository";
import { toDateString } from "../../types/date";
import { Success } from "../../types/result";
import { daysAgo, formatDateAsYYYYMMDD } from "../../utils/date";
import { EntityScope } from "./get-accounts";

export const CATEGORY_HISTORY_LOOKBACK_DAYS = 90;
export const CATEGORY_HISTORY_MAX_DESCRIPTIONS_PER_CATEGORY = 10;

const schema = z.object({
  scope: z
    .enum(EntityScope)
    .describe(
      `Which categories to retrieve: "${EntityScope.ACTIVE}" for active (non-archived) only, "${EntityScope.ARCHIVED}" for archived only, "${EntityScope.ALL}" for both active and archived`,
    ),
});

interface CategoryData {
  id: string;
  name: string;
  type: CategoryType;
  isArchived: boolean;
  recentDescriptions: string[];
}

export const createGetCategoriesTool = ({
  categoryRepository,
  transactionRepository,
}: {
  categoryRepository: CategoryRepository;
  transactionRepository: TransactionRepository;
}) =>
  tool(
    async ({ scope }, config) => {
      const userId = config.context.userId;
      if (!userId || typeof userId !== "string") {
        throw new Error("Invalid tool config: missing userId");
      }

      const allCategories =
        await categoryRepository.findManyWithArchivedByUserId(userId);

      const filteredCategories = allCategories.filter((category) => {
        if (scope === EntityScope.ALL) return true;
        if (scope === EntityScope.ACTIVE) return !category.isArchived;
        return category.isArchived;
      });

      if (filteredCategories.length === 0) {
        return Success([]);
      }

      const categoryDataList: CategoryData[] = filteredCategories.map(
        (category) => ({
          id: category.id,
          name: category.name,
          type: category.type,
          isArchived: category.isArchived,
          recentDescriptions: [],
        }),
      );

      // Enrich with recent transaction descriptions
      const today = new Date();
      const lookbackDate = daysAgo(today, CATEGORY_HISTORY_LOOKBACK_DAYS);
      const lookbackDateString = toDateString(
        formatDateAsYYYYMMDD(lookbackDate),
      );
      const todayDateString = toDateString(formatDateAsYYYYMMDD(today));

      const transactions = await transactionRepository.findManyByUserId(
        userId,
        {
          dateAfter: lookbackDateString,
          dateBefore: todayDateString,
        },
      );

      const categoryIdSet = new Set(
        categoryDataList.map((category) => category.id),
      );
      const descriptionsByCategory = new Map<string, Set<string>>();

      for (const transaction of transactions) {
        const { categoryId, description } = transaction;

        if (!categoryId || !description || !categoryIdSet.has(categoryId)) {
          continue;
        }

        if (!descriptionsByCategory.has(categoryId)) {
          descriptionsByCategory.set(categoryId, new Set());
        }

        const descriptions = descriptionsByCategory.get(categoryId);
        if (descriptions) {
          if (
            descriptions.size < CATEGORY_HISTORY_MAX_DESCRIPTIONS_PER_CATEGORY
          ) {
            descriptions.add(description);
          }
        }
      }

      const enrichedCategoryDataList = categoryDataList.map((category) => ({
        ...category,
        recentDescriptions: Array.from(
          descriptionsByCategory.get(category.id) || [],
        ),
      }));

      return Success(enrichedCategoryDataList);
    },
    {
      name: "get_categories",
      description:
        "Get user categories filtered by scope. Each category includes recent usage examples showing how similar transactions were previously categorised.",
      schema,
    },
  );
