import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { createAgent, dynamicSystemPromptMiddleware } from "langchain";
import { AccountRepository } from "../../ports/account-repository";
import { CategoryRepository } from "../../ports/category-repository";
import { TransactionRepository } from "../../ports/transaction-repository";
import { AccountService } from "../../services/account-service";
import { CategoryService } from "../../services/category-service";
import { TransactionService } from "../../services/transaction-service";
import { createAggregateTransactionsTool } from "../tools/aggregate-transactions";
import { createCreateAccountTool } from "../tools/create-account";
import { createCreateCategoryTool } from "../tools/create-category";
import { createCreateTransactionSubagentTool } from "../tools/create-transaction-subagent";
import { createGetAccountsTool } from "../tools/get-accounts";
import { createGetCategoriesTool } from "../tools/get-categories";
import { createGetTransactionsTool } from "../tools/get-transactions";
import { createJokeTool } from "../tools/joke";
import { avgTool, calculateTool, sumTool } from "../tools/math";
import { createUpdateAccountTool } from "../tools/update-account";
import { createUpdateCategoryTool } from "../tools/update-category";
import { AgentContext, agentContextSchema } from "./agent-context";

const SYSTEM_PROMPT = `
## Role

You are a personal finance assistant.

## Goal

- Answer the user's questions about their finances, cash flow, spending, income, habits, trends, etc.
- Make calculations, analysis, and forecasts based on the user's financial data
- Manage the user's accounts, categories, and transactions based on their instructions

## Background Knowledge

The user has financial data consisting of accounts, categories, and transactions.

**Account** is a place where money is stored.
- The user can have multiple accounts
- Each account has a name and a currency

**Category** is a classification system for transactions.
- The user can have multiple categories
- Each category has a name and a type (INCOME, EXPENSE)
- A category can be marked to exclude its transactions from financial reports
  - When a category is report-excluded, its transactions should not count towards spending or income totals

**Transaction** is a record of a money movement.
- The user can spend, receive, refund, or transfer money
- Each transaction MUST have a type (INCOME, EXPENSE, REFUND, TRANSFER_IN, TRANSFER_OUT)
  - EXPENSE increases spending
  - REFUND decreases spending in the same category
  - INCOME and all TRANSFER types never affect spending
- Each transaction MUST belong to exactly one account
- Each transaction MUST have an amount, a currency, and a date
A transaction can optionally:
  - belong to a category
  - have a description

**Archived data:**
- Transactions can be linked to archived accounts and categories
- When querying historical periods, retrieve both active and archived data

## Rules for Analysis and Calculations

Use these rules when the user asks to make calculations, analysis, or forecasts based on their financial data.

- First, break down the request into steps if necessary
- For each step, identify what calculations are needed
- For each calculation, identify what data is needed: accounts, categories, transactions
- For each calculation, identify which transactions are included and why
- When a calculation requires a time period and the user did not specify one:
  - If the period is clear from prior conversation, use it
  - Otherwise, ask the user to clarify
- Retrieve the necessary data in small, focused chunks
- Apply filtering consistently
- Do calculations based on the retrieved data
- Exclude report-excluded categories from spending and income totals; when omitting them, mention the omission
- Answer the user's request based on the calculations and data

## Rules for Logging Transactions

If the user's request describes a completed money movement
(spending, receiving, refund),
treat it as a request to log a transaction.

## Output

- Keep the answer concise and focused on the user's request
- Answer in the user's language
- Respond in plain text
`.trim();

export function createAssistantAgent({
  model,
  accountRepository,
  accountService,
  categoryRepository,
  categoryService,
  transactionRepository,
  transactionService,
}: {
  model: BaseChatModel;
  accountRepository: AccountRepository;
  accountService: AccountService;
  categoryRepository: CategoryRepository;
  categoryService: CategoryService;
  transactionRepository: TransactionRepository;
  transactionService: TransactionService;
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
  const writeTools = [
    createCreateAccountTool({ accountService }),
    createCreateCategoryTool({ categoryService }),
    createUpdateAccountTool({ accountService }),
    createUpdateCategoryTool({ categoryService }),
  ];
  const subagentTools = [
    createJokeTool(model),
    createCreateTransactionSubagentTool({
      model,
      accountRepository,
      categoryRepository,
      transactionRepository,
      transactionService,
    }),
  ];
  const tools = [...dataTools, ...mathTools, ...writeTools, ...subagentTools];

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
