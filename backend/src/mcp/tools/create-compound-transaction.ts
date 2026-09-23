import { z } from "zod";
import {
  TransactionDto,
  toTransactionDto,
} from "../../langchain/tools/transaction-dto";
import { TransactionType } from "../../models/transaction";
import {
  CreateCompoundTransactionServiceInput,
  TransactionService,
} from "../../services/transaction-service";
import { toDateString } from "../../types/date-string";
import { assertGuideTokens, buildGuideTokensField } from "./guides";
import { Tool } from "./tool";

const requiredGuides = ["basics", "create-transaction"] as const;

export async function createCompoundTransaction(
  {
    guideTokens,
    ...input
  }: CreateCompoundTransactionServiceInput & { guideTokens: string[] },
  {
    transactionService,
    userId,
  }: {
    transactionService: TransactionService;
    userId: string;
  },
): Promise<TransactionDto[]> {
  assertGuideTokens({
    guideTokens,
    requiredGuides,
  });

  const created = await transactionService.createCompoundTransaction(
    input,
    userId,
  );

  return created.map(toTransactionDto);
}

const inputSchema = z.object({
  accountId: z.uuid().describe("Account ID to associate the transactions with"),
  date: z.iso
    .date()
    .transform(toDateString)
    .describe("Transaction date, shared by every leg"),
  type: z
    .enum([
      TransactionType.INCOME,
      TransactionType.EXPENSE,
      TransactionType.REFUND,
    ])
    .describe("Transaction type, shared by every leg"),
  expectedTotal: z
    .number()
    .positive()
    .describe("Total amount the legs must sum to"),
  legs: z
    .array(
      z.object({
        amount: z.number().positive().describe("Leg amount"),
        categoryId: z
          .uuid()
          .optional()
          .describe("Category ID to associate this leg with"),
        description: z
          .string()
          .max(500)
          .optional()
          .describe("Short description for this leg"),
      }),
    )
    .min(2)
    .describe("Legs to create, one transaction each"),
  guideTokens: buildGuideTokensField(requiredGuides),
});

const description = `
Create two or more transactions from one event (purchase, earnings, refund)
whose items (goods, services, articles) do not all belong to the same category.

- Each of these transactions is called a leg of a compound transaction
- Legs must belong to distinct categories
- At most one leg may omit a category
- Transfers are not supported by this tool

Example

The user purchases items A, B, C, and D at once,
where A and B can be classified as Category X and
C and D can be classified as Category Y.
The tool should be called with two legs:
first for A and B, and second for C and D.
`.trim();

export function createCreateCompoundTransactionTool(deps: {
  transactionService: TransactionService;
  userId: string;
}): Tool<CreateCompoundTransactionServiceInput & { guideTokens: string[] }> {
  return {
    name: "create_compound_transaction",
    description,
    inputSchema,
    run: (input) => createCompoundTransaction(input, deps),
  };
}
