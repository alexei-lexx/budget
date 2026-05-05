import { tool } from "langchain";
import { z } from "zod";
import { CategoryRepository } from "../../ports/category-repository";
import { TransactionRepository } from "../../ports/transaction-repository";
import { toDateString } from "../../types/date";
import { Success } from "../../types/result";
import { daysAgo, formatDateAsYYYYMMDD } from "../../utils/date";
import { agentContextSchema } from "../agents/agent-context";
import { CategoryDto, toCategoryDto } from "./category-dto";
import { EntityScope } from "./get-accounts";

type CategoryData = CategoryDto & { keywords: string[] };

export const CATEGORY_HISTORY_LOOKBACK_DAYS = 90;
export const CATEGORY_HISTORY_MAX_KEYWORDS_PER_CATEGORY = 10;

const schema = z.object({
  scope: z
    .enum(EntityScope)
    .describe(
      `Which categories to retrieve: "${EntityScope.ACTIVE}" for active (non-archived) only, "${EntityScope.ARCHIVED}" for archived only, "${EntityScope.ALL}" for both active and archived`,
    ),
});

export const createGetCategoriesTool = ({
  categoryRepository,
  transactionRepository,
}: {
  categoryRepository: CategoryRepository;
  transactionRepository: TransactionRepository;
}) =>
  tool(
    async ({ scope }, config) => {
      const userId = agentContextSchema.shape.userId.parse(
        config?.context?.userId,
      );
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
          ...toCategoryDto(category),
          keywords: [],
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
      const keywordsByCategory = new Map<string, Set<string>>();

      for (const transaction of transactions) {
        const { categoryId, description } = transaction;

        if (!categoryId || !description || !categoryIdSet.has(categoryId)) {
          continue;
        }

        if (!keywordsByCategory.has(categoryId)) {
          keywordsByCategory.set(categoryId, new Set());
        }

        const keywords = keywordsByCategory.get(categoryId);
        if (keywords) {
          if (keywords.size < CATEGORY_HISTORY_MAX_KEYWORDS_PER_CATEGORY) {
            keywords.add(description);
          }
        }
      }

      const enrichedCategoryDataList = categoryDataList.map((category) => ({
        ...category,
        keywords: Array.from(keywordsByCategory.get(category.id) || []),
      }));

      return Success(enrichedCategoryDataList);
    },
    {
      name: "get_categories",
      description:
        "Get user categories filtered by scope. Each category includes keywords showing how similar transactions were previously categorised.",
      schema,
    },
  );
