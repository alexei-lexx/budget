import { DateString } from "../types/date";
import { daysBetween, formatDateAsYYYYMMDD } from "../utils/date";
import { createGetAccountsTool } from "./agent-tools/get-accounts-tool";
import { createGetCategoriesTool } from "./agent-tools/get-categories-tool";
import {
  MAX_PERIOD_DAYS,
  createGetTransactionsTool,
} from "./agent-tools/get-transactions-tool";
import { avgTool, calculateTool, sumTool } from "./agent-tools/math";
import { BusinessError, BusinessErrorCodes } from "./business-error";
import { AccountRepository } from "./ports/account-repository";
import { Agent, AgentTraceMessage } from "./ports/agent";
import { CategoryRepository } from "./ports/category-repository";
import { TransactionRepository } from "./ports/transaction-repository";

const SYSTEM_PROMPT = `
## Role

You are a personal finance assistant.

## Task

User asks questions about their financial transactions within a specific date range.
You must identify which transactions are relevant to the user's question.
And then perform calculations based on those transactions to answer the question.

## Process

First, break down the question into sub-questions if necessary.
For each sub-question, identify what calculations are needed.
For each calculation, identify what data is needed: accounts, categories, transactions.
Keep in mind that transactions can be linked to archived accounts and categories,
so you may need to retrieve both active and archived data.
Retrieve the necessary data in small, focused chunks.
Do calculations based on the retrieved data.
Answer the user's question based on the calculations and data.

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
  startDate: DateString;
  endDate: DateString;
}

export class InsightService {
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

  async call(
    userId: string,
    input: InsightInput,
  ): Promise<{ answer: string; agentTrace: AgentTraceMessage[] }> {
    if (!userId) {
      throw new BusinessError(
        "User ID is required",
        BusinessErrorCodes.INVALID_PARAMETERS,
      );
    }

    const { question, startDate, endDate } = input;

    const normalizedQuestion = question.trim();
    if (!normalizedQuestion) {
      throw new BusinessError(
        "Question is required",
        BusinessErrorCodes.INVALID_PARAMETERS,
      );
    }

    this.validateDateRange(startDate, endDate);

    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(
      normalizedQuestion,
      startDate,
      endDate,
    );

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
    ];

    const mathTools = [avgTool, calculateTool, sumTool];
    const tools = [...dataTools, ...mathTools];

    const response = await this.agent.call({
      messages: [{ role: "user", content: userPrompt }],
      systemPrompt,
      tools,
    });

    if (!response.answer) {
      throw new BusinessError(
        "Empty response",
        BusinessErrorCodes.EMPTY_RESPONSE,
      );
    }

    const finalAnswer = response.answer.trim();

    return { answer: finalAnswer, agentTrace: response.agentTrace };
  }

  private validateDateRange(startDate: DateString, endDate: DateString) {
    if (startDate > endDate) {
      throw new BusinessError(
        "Start date must be before or equal to end date",
        BusinessErrorCodes.INVALID_DATE,
      );
    }

    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    const differenceInDays = daysBetween(startDateObj, endDateObj);

    if (differenceInDays > MAX_PERIOD_DAYS) {
      throw new BusinessError(
        `Date range cannot exceed ${MAX_PERIOD_DAYS} days`,
        BusinessErrorCodes.INVALID_DATE,
      );
    }
  }

  private buildUserPrompt(
    question: string,
    startDate: DateString,
    endDate: DateString,
  ): string {
    return [
      `I have transactions between ${startDate} and ${endDate}.`,
      "",
      `My question: ${question}`,
    ].join("\n");
  }

  private buildSystemPrompt(): string {
    const currentDate = formatDateAsYYYYMMDD(new Date());

    return SYSTEM_PROMPT + `\n\nToday's date is ${currentDate}.`;
  }

  private formatJsonString(jsonInput: string): string {
    try {
      const parsed = JSON.parse(jsonInput);

      return JSON.stringify(parsed, null, 2);
    } catch {
      return jsonInput;
    }
  }
}
