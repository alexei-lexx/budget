import { tool } from "langchain";
import { evaluate, mean, sum } from "mathjs";
import { z } from "zod";
import { AiDataService } from "../services/ai-data-service";
import { DateRange } from "../types/date-range";

export const sumTool = tool(
  (input: { numbers: number[] }) => sum(input.numbers).toString(),
  {
    name: "sum",
    description:
      "Calculate the sum of an array of numbers. Use this to add up transaction amounts. Input should be a JSON string with a 'numbers' array. Example: {\"numbers\": [10.5, 20.3, 15.0]}",
    schema: z.object({
      numbers: z.array(z.number()),
    }),
  },
);

export const avgTool = tool(
  (input: { numbers: number[] }) => {
    if (input.numbers.length === 0) {
      return "Error: cannot calculate average of an empty array";
    }

    return mean(input.numbers).toString();
  },
  {
    name: "avg",
    description:
      "Calculate the average of an array of numbers. Input should be a JSON string with a 'numbers' array. Example: {\"numbers\": [10.5, 20.3, 15.0]}",
    schema: z.object({
      numbers: z.array(z.number()),
    }),
  },
);

export const calculateTool = tool(
  (input: { expression: string }) => {
    const result = evaluate(input.expression);
    const resultString =
      typeof result === "number" ? result.toString() : String(result);

    return resultString;
  },
  {
    name: "calculate",
    description:
      'Evaluate a mathematical expression and return the result. Use this for percentages, division, or complex calculations. Input should be a JSON string with an \'expression\' field. Example: {"expression": "(45.8 / 200) * 100"}',
    schema: z.object({
      expression: z.string(),
    }),
  },
);

export function createGetTransactionsTool(
  aiDataService: AiDataService,
  userId: string,
  dateRange: DateRange,
) {
  return tool(
    async (input: { categoryIds?: string[]; accountIds?: string[] }) => {
      const transactions = await aiDataService.getFilteredTransactions(
        userId,
        dateRange,
        input.categoryIds,
        input.accountIds,
      );

      return JSON.stringify(transactions);
    },
    {
      name: "getTransactions",
      description:
        "Retrieve transactions filtered by category IDs and/or account IDs. If both categoryIds and accountIds are omitted, returns all transactions in the date range. Returns an array of transaction objects with fields: id, accountId, categoryId, type, amount, currency, date, description, transferId. You should use this tool FIRST before performing any calculations to get the relevant transactions.",
      schema: z.object({
        categoryIds: z
          .array(z.string())
          .optional()
          .describe(
            "Optional array of category IDs to filter transactions. If provided, only transactions with these category IDs will be returned.",
          ),
        accountIds: z
          .array(z.string())
          .optional()
          .describe(
            "Optional array of account IDs to filter transactions. If provided, only transactions from these accounts will be returned.",
          ),
      }),
    },
  );
}
