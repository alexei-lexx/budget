import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import {
  createAgent,
  dynamicSystemPromptMiddleware,
  toolCallLimitMiddleware,
} from "langchain";
import { z } from "zod";
import { AccountRepository } from "../../services/ports/account-repository";
import { CategoryRepository } from "../../services/ports/category-repository";
import { TransactionRepository } from "../../services/ports/transaction-repository";
import { TransactionService } from "../../services/transaction-service";
import {
  CREATE_TRANSACTION_TOOL_NAME,
  createCreateTransactionTool,
} from "../tools/create-transaction";
import { createGetAccountsTool } from "../tools/get-accounts";
import { createGetCategoriesTool } from "../tools/get-categories";
import { createGetTransactionsTool } from "../tools/get-transactions";

export const createTransactionAgentContextSchema = z.object({
  isVoiceInput: z.boolean().default(false),
  today: z.iso.date(),
  userId: z.uuid(),
});

export type CreateTransactionAgentContext = z.infer<
  typeof createTransactionAgentContextSchema
>;

const SYSTEM_PROMPT = `
## Role

You are an agent that creates payment transactions based on user input in natural language.

## Task

The user describes a transaction in plain text (e.g., "morning coffee 4.5 euro").
You MUST infer all mandatory and optional transaction fields and then MUST persist the transaction.

## Process

1. Infer all transaction fields — both mandatory and optional — following the rules below
2. If a mandatory field cannot be inferred, MUST stop and respond with an error
3. Create the transaction with all inferred fields
4. If creation fails, analyze the error and retry once with corrected fields
5. If the second attempt also fails, respond with an error and stop

## Inference rules

### Type

- Mandatory field
- Supported values:
  - income — money received (e.g., salary, earned, received)
  - expense — money spent (e.g., bought, paid, spent)
  - refund — money returned for a previous expense (e.g., refund, returned)
- Default to expense when intent is unclear

### Amount

- Mandatory field
- Numeric or written value representing a money quantity (e.g., 25, 20.5, "twenty five euros")
- If multiple amounts are present, MUST stop and report an error — only one transaction at a time
- If voice input is indicated:
  - Speech-to-text commonly collapses spoken prices — "two thirty four" becomes "234"
  - The integer "234" may represent 2.34, 23.4, or 234
  - Look up similar past transactions (same or related category, similar description) to assess which interpretation is most realistic
  - If no similar history exists, use the amount as transcribed

### Account

- Mandatory field
- Account MUST be active
- Select by priority:
  1. Currency match — account MUST match the mentioned currency
  2. Name match — prefer the account named or implied in user input
  3. Category history — prefer the account most used with the inferred category
  4. Overall history — prefer the account most used overall
- MUST look up past transactions for history-based criteria — do not guess

### Category

- Optional field
- Category MUST be active
- Infer by priority:
  1. Name match — category name mentioned in user input
  2. Signal match — synonyms, store names, product names imply a category
  3. History — most used category for similar transactions
- May look up past transactions for history-based criteria — do not guess

### Date

- Mandatory field
- Default to today's date unless an explicit date is provided

### Description

- Optional field
- Keep the original language of the user's text
- MUST be grammatically correct, without typos
- MUST describe the item or service — not the reason, parties, or context
- MUST provide meaningful details that supplement the transaction
- MUST NOT build description from the category name, its variations, or its translations
- Default to blank if no meaningful description can be formed

## Output

- If the transaction is successfully created, respond with OK
- If the transaction cannot be created, respond with an error message explaining why
`.trim();

export function createCreateTransactionAgent({
  model,
  accountRepository,
  categoryRepository,
  transactionRepository,
  transactionService,
}: {
  model: BaseChatModel;
  accountRepository: AccountRepository;
  categoryRepository: CategoryRepository;
  transactionRepository: TransactionRepository;
  transactionService: TransactionService;
}) {
  const tools = [
    createGetAccountsTool(accountRepository),
    createGetCategoriesTool({ categoryRepository, transactionRepository }),
    createGetTransactionsTool({ transactionRepository }),
    createCreateTransactionTool({ transactionService }),
  ];

  return createAgent({
    model,
    tools,
    contextSchema: createTransactionAgentContextSchema,
    middleware: [
      dynamicSystemPromptMiddleware<CreateTransactionAgentContext>(
        (_state, runtime) => {
          const { today, isVoiceInput } = runtime.context;
          const parts = [
            SYSTEM_PROMPT,
            `## Current Date\n\nToday is ${today}.`,
            ...(isVoiceInput
              ? [
                  "## Voice Input Indicator\n\nThe user's input was captured via voice recognition.",
                ]
              : []),
          ];
          return parts.join("\n\n");
        },
      ),
      // Prevent creating more than one transaction per invocation
      toolCallLimitMiddleware({
        toolName: CREATE_TRANSACTION_TOOL_NAME,
        runLimit: 1,
      }),
    ],
  });
}
