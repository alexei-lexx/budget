import { tool } from "langchain";
import { z } from "zod";
import { TransactionRepository } from "../../ports/transaction-repository";
import { CategoryService } from "../../services/category-service";
import { CategoryDto } from "../../tools/category-dto";
import {
  description as baseDescription,
  getCategories,
  inputSchema,
} from "../../tools/get-categories";
import { toDateString } from "../../types/date";
import { Success } from "../../types/result";
import { daysAgo, formatDateAsYYYYMMDD } from "../../utils/date";
import { agentContextSchema } from "../agents/agent-context";

type CategoryData = CategoryDto & { keywords: string[] };

export const CATEGORY_HISTORY_LOOKBACK_DAYS = 90;
export const CATEGORY_HISTORY_MAX_KEYWORDS_PER_CATEGORY = 10;

const schema = z.object(inputSchema);

// Keyword enrichment has no MCP equivalent: external agents aren't wired
// with a transactionRepository dependency, so this stays langchain-only.
const description = `${baseDescription}\n- Each category includes keywords showing how similar transactions were previously categorised`;

export const createGetCategoriesTool = ({
  categoryService,
  transactionRepository,
}: {
  categoryService: CategoryService;
  transactionRepository: TransactionRepository;
}) =>
  tool(
    async ({ scope }: z.infer<typeof schema>, config) => {
      const userId = agentContextSchema.shape.userId.parse(
        config?.context?.userId,
      );

      const result = await getCategories(
        { scope },
        { categoryService, userId },
      );

      if (!result.success) {
        return result;
      }

      if (result.data.length === 0) {
        return Success([]);
      }

      const categoryDataList: CategoryData[] = result.data.map((category) => ({
        ...category,
        keywords: [],
      }));

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
      description,
      schema,
    },
  );
