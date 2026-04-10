import { createAggregateTransactionsTool } from "../../langchain/tools/aggregate-transactions";
import { createGetAccountsTool } from "../../langchain/tools/get-accounts";
import { createGetCategoriesTool } from "../../langchain/tools/get-categories";
import { createGetTransactionsTool } from "../../langchain/tools/get-transactions";
import { avgTool, calculateTool, sumTool } from "../../langchain/tools/math";
import { Failure, Result, Success } from "../../types/result";
import { formatDateAsYYYYMMDD } from "../../utils/date";
import { AccountRepository } from "../ports/account-repository";
import { Agent, AgentMessage, AgentTraceMessage } from "../ports/agent";
import { CategoryRepository } from "../ports/category-repository";
import { TransactionRepository } from "../ports/transaction-repository";

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

export interface InsightInput {
  question: string;
  history?: readonly AgentMessage[];
}

type InsightOutput = Result<
  { answer: string; agentTrace: AgentTraceMessage[] },
  { message: string; agentTrace: AgentTraceMessage[] }
>;

export interface InsightService {
  call(userId: string, input: InsightInput): Promise<InsightOutput>;
}

export class InsightServiceImpl implements InsightService {
  private accountRepository: AccountRepository;
  private categoryRepository: CategoryRepository;
  private transactionRepository: TransactionRepository;
  private agent: Agent;

  constructor({
    accountRepository,
    categoryRepository,
    transactionRepository,
    agent,
  }: {
    accountRepository: AccountRepository;
    categoryRepository: CategoryRepository;
    transactionRepository: TransactionRepository;
    agent: Agent;
  }) {
    this.accountRepository = accountRepository;
    this.categoryRepository = categoryRepository;
    this.transactionRepository = transactionRepository;
    this.agent = agent;
  }

  async call(userId: string, input: InsightInput): Promise<InsightOutput> {
    if (!userId) {
      return Failure({ message: "User ID is required", agentTrace: [] });
    }

    const normalizedQuestion = input.question.trim();
    if (!normalizedQuestion) {
      return Failure({ message: "Question is required", agentTrace: [] });
    }

    const systemPrompt = this.buildSystemPrompt();

    const dataTools = [
      createGetAccountsTool(this.accountRepository, userId),
      createGetCategoriesTool({
        categoryRepository: this.categoryRepository,
        transactionRepository: this.transactionRepository,
        userId,
      }),
      createGetTransactionsTool({
        transactionRepository: this.transactionRepository,
        userId,
      }),
      createAggregateTransactionsTool({
        transactionRepository: this.transactionRepository,
        userId,
      }),
    ];

    const mathTools = [avgTool, calculateTool, sumTool];
    const tools = [...dataTools, ...mathTools];

    const historyMessages: readonly AgentMessage[] = input.history ?? [];
    const currentMessage: AgentMessage = {
      role: "user",
      content: `My question: ${normalizedQuestion}`,
    };

    const response = await this.agent.call({
      messages: [...historyMessages, currentMessage],
      systemPrompt,
      tools,
    });

    if (!response.answer) {
      return Failure({
        message: "Empty response",
        agentTrace: response.agentTrace,
      });
    }

    const finalAnswer = response.answer.trim();

    return Success({ answer: finalAnswer, agentTrace: response.agentTrace });
  }

  private buildSystemPrompt(): string {
    const currentDate = formatDateAsYYYYMMDD(new Date());

    return SYSTEM_PROMPT + `\n\nToday's date is ${currentDate}.`;
  }
}
