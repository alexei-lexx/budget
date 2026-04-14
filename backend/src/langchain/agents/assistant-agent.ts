import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { createAgent, dynamicSystemPromptMiddleware } from "langchain";
import { AccountRepository } from "../../ports/account-repository";
import { CategoryRepository } from "../../ports/category-repository";
import { TransactionRepository } from "../../ports/transaction-repository";
import { createAggregateTransactionsTool } from "../tools/aggregate-transactions";
import { createGetAccountsTool } from "../tools/get-accounts";
import { createGetCategoriesTool } from "../tools/get-categories";
import { createGetTransactionsTool } from "../tools/get-transactions";
import { createJokeTool } from "../tools/joke";
import { avgTool, calculateTool, sumTool } from "../tools/math";
import { AgentContext, agentContextSchema } from "./agent-context";

const SYSTEM_PROMPT = `
## Role

You are a personal finance assistant.

## Task

User asks questions about their finances.
You must identify what data is relevant to the question and retrieve it.
And then perform calculations based on that data to answer the question.

## Process

First, break down the question into sub-questions if necessary.
For each sub-question, identify what calculations are needed.
For each calculation, identify what data is needed: accounts, categories, transactions.
Keep in mind that transactions can be linked to archived accounts and categories,
so you may need to retrieve both active and archived data.
When a step requires a time period and the user did not specify one, assume the current month.
Retrieve the necessary data in small, focused chunks.
Do calculations based on the retrieved data.
Answer the user's question based on the calculations and data.
If you assumed a time period, state it in the answer.

## Transaction types

- INCOME, EXPENSE, REFUND, TRANSFER_IN, TRANSFER_OUT
- EXPENSE increases spending
- REFUND decreases matching spending
- INCOME and all TRANSFER types never affect spending

## Rules

- For each calculation, clearly identify which transactions are included and why
- For each calculation, always state the number of transactions included
- Apply filtering consistently

## Output

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
    createGetCategoriesTool({
      categoryRepository,
      transactionRepository,
    }),
    createGetTransactionsTool({
      transactionRepository,
    }),
    createAggregateTransactionsTool({
      transactionRepository,
    }),
  ];

  const mathTools = [avgTool, calculateTool, sumTool];
  const subagentTools = [createJokeTool(model)];
  const tools = [...dataTools, ...mathTools, ...subagentTools];

  return createAgent({
    model,
    tools,
    contextSchema: agentContextSchema,
    middleware: [
      dynamicSystemPromptMiddleware<AgentContext>((_state, runtime) => {
        return `${SYSTEM_PROMPT}\n\n## Current Date\n\nToday is ${runtime.context.today}.`;
      }),
    ],
  });
}
