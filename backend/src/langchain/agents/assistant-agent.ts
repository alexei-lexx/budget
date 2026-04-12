import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { createAgent, dynamicSystemPromptMiddleware } from "langchain";
import { z } from "zod";
import { AccountRepository } from "../../ports/account-repository";
import { CategoryRepository } from "../../ports/category-repository";
import { TransactionRepository } from "../../ports/transaction-repository";
import { insightSkill } from "../skills/insight";
import { createAggregateTransactionsTool } from "../tools/aggregate-transactions";
import { createGetAccountsTool } from "../tools/get-accounts";
import { createGetCategoriesTool } from "../tools/get-categories";
import { createGetTransactionsTool } from "../tools/get-transactions";
import { createLoadSkillTool } from "../tools/load-skill";
import { avgTool, calculateTool, sumTool } from "../tools/math";

export const assistantAgentContextSchema = z.object({
  today: z.iso.date(),
  userId: z.uuid(),
});

export type AssistantAgentContext = z.infer<typeof assistantAgentContextSchema>;

const SYSTEM_PROMPT = `
## Role

You are a personal finance assistant.
You help users manage their finances by answering questions,
providing insights, and performing actions based on user requests.

## Domain

Users track their finances using:
- Accounts — bank accounts, credit cards, wallets, etc.
- Categories — labels for classifying transactions (e.g. Food, Transport)
- Transactions — financial movements: INCOME, EXPENSE, REFUND, TRANSFER_IN, TRANSFER_OUT

## Task

Use the available skills and tools to fulfill requests.

## Output

Default rules — follow unless the user requests a different format or the active skill specifies one:

- Keep the answer concise and focused on the question
- Respond in plain text
- Do NOT respond in markdown
`.trim();

export function createAssistantAgent({
  model,
  accountRepository,
  categoryRepository,
  transactionRepository,
}: {
  model: BaseChatModel;
  accountRepository: AccountRepository;
  categoryRepository: CategoryRepository;
  transactionRepository: TransactionRepository;
}) {
  const dataTools = [
    createGetAccountsTool(accountRepository),
    createGetCategoriesTool({ categoryRepository, transactionRepository }),
    createGetTransactionsTool({ transactionRepository }),
    createAggregateTransactionsTool({ transactionRepository }),
  ];

  const mathTools = [avgTool, calculateTool, sumTool];
  const tools = [
    createLoadSkillTool([insightSkill]),
    ...dataTools,
    ...mathTools,
  ];

  return createAgent({
    model,
    tools,
    contextSchema: assistantAgentContextSchema,
    middleware: [
      dynamicSystemPromptMiddleware<AssistantAgentContext>(
        (_state, runtime) => {
          return `${SYSTEM_PROMPT}\n\n## Current Date\n\nToday is ${runtime.context.today}.`;
        },
      ),
    ],
  });
}
