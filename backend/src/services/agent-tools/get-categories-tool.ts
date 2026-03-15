import { z } from "zod";
import { CategoryType } from "../../models/category";
import { toDateString } from "../../types/date";
import { daysAgo, formatDateAsYYYYMMDD } from "../../utils/date";
import { ToolSignature } from "../ports/agent";
import { CategoryRepository } from "../ports/category-repository";
import { TransactionRepository } from "../ports/transaction-repository";

export const CATEGORY_HISTORY_LOOKBACK_DAYS = 90;
export const CATEGORY_HISTORY_MAX_DESCRIPTIONS_PER_CATEGORY = 10;

export enum EntityScope {
  ACTIVE = "ACTIVE",
  ARCHIVED = "ARCHIVED",
  ALL = "ALL",
}

const getCategoriesInputSchema = z.object({
  scope: z
    .enum(EntityScope)
    .describe(
      `Which categories to retrieve: "${EntityScope.ACTIVE}" for active (non-archived) only, "${EntityScope.ARCHIVED}" for archived only, "${EntityScope.ALL}" for both active and archived`,
    ),
});

type GetCategoriesInput = z.infer<typeof getCategoriesInputSchema>;

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
  userId,
}: {
  categoryRepository: CategoryRepository;
  transactionRepository: TransactionRepository;
  userId: string;
}): ToolSignature<GetCategoriesInput> => ({
  name: "getCategories",
  description:
    "Get user categories filtered by scope. Each category includes recent usage examples showing how similar transactions were previously categorised.",
  inputSchema: getCategoriesInputSchema,
  func: async (input: GetCategoriesInput) => {
    const allCategories = await categoryRepository.findAllByUserId(userId);

    const filteredCategories = allCategories.filter((category) => {
      if (input.scope === EntityScope.ALL) return true;
      if (input.scope === EntityScope.ACTIVE) return !category.isArchived;
      return category.isArchived;
    });

    if (filteredCategories.length === 0) {
      return JSON.stringify([]);
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
    const lookbackDateString = toDateString(formatDateAsYYYYMMDD(lookbackDate));
    const todayDateString = toDateString(formatDateAsYYYYMMDD(today));

    const transactions = await transactionRepository.findActiveByUserId(
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

    return JSON.stringify(enrichedCategoryDataList);
  },
});
