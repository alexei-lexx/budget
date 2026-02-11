import { LangchainBedrockAgent } from "../ai/langchain-bedrock-agent";
import {
  avgTool,
  calculateTool,
  createGetTransactionsTool,
  sumTool,
} from "../ai/langchain-tools";
import { ToolExecution } from "../models/ai-agent";
import { YEAR_RANGE_OFFSET } from "../types/validation";
import { formatDateAsYYYYMMDD } from "../utils/date";
import { AiDataService } from "./ai-data-service";
import { BusinessError, BusinessErrorCodes } from "./business-error";

const MAX_PERIOD_DAYS = 366;

const SYSTEM_PROMPT = `
## Role

You are a personal finance assistant.

## Task

User asks questions about their financial transactions within a specific date range.
You must use the getTransactions tool to retrieve relevant transactions, then perform calculations to answer the question.

## Workflow

1. First, review the available accounts and categories provided in the context
2. Use the getTransactions tool to retrieve transactions filtered by category IDs and/or account IDs
3. Use sum, avg, or calculate tools to perform mathematical operations on the retrieved transactions
4. Answer the user's question based on the calculations

## Available Data

You have access to:
- Accounts: Each has id, name, currency, and isArchived status
- Categories: Each has id, name, type (INCOME/EXPENSE), and isArchived status
- Active entities have precedence over archived entities when names match

## Transaction Filtering

The getTransactions tool accepts:
- categoryIds (optional): Array of category IDs to filter by
- accountIds (optional): Array of account IDs to filter by
- If both are omitted, returns ALL transactions in the date range

## Transaction Types

Transaction types: INCOME, EXPENSE, REFUND, TRANSFER_IN, TRANSFER_OUT.
- EXPENSE increases spending
- REFUND decreases matching spending
- INCOME and all TRANSFER types never affect spending

## Rules

- ALWAYS use getTransactions tool FIRST before performing calculations
- Filter by category ID (not category name) when possible
- For each calculation, clearly identify which transactions are included and why
- For each calculation, always state the number of transactions included
- Apply filtering consistently

## Output

- Do NOT repeat, reprint, or quote the transaction list or any transaction lines
- Do NOT include per-transaction details (dates, merchants, descriptions, categories, accounts, amounts) unless the user explicitly asks to list/show transactions
- Keep the answer concise and focused on the question
- Respond in plain text
`.trim();

interface DateRange {
  startDate: string;
  endDate: string;
}

export interface InsightInput {
  question: string;
  dateRange: DateRange;
}

export class InsightService {
  constructor(private aiDataService: AiDataService) {}

  async call(userId: string, input: InsightInput): Promise<string> {
    if (!userId) {
      throw new BusinessError(
        "User ID is required",
        BusinessErrorCodes.INVALID_PARAMETERS,
      );
    }

    const { question, dateRange } = input;

    const normalizedQuestion = question.trim();
    if (!normalizedQuestion) {
      throw new BusinessError(
        "Question is required",
        BusinessErrorCodes.INVALID_PARAMETERS,
      );
    }

    const validatedDateRange = this.validateDateRange(dateRange);

    // Get metadata for accounts and categories
    const accounts = await this.aiDataService.getAvailableAccounts(userId);
    const categories = await this.aiDataService.getAvailableCategories(userId);

    // Build metadata payload
    const metadataPayload = this.buildMetadataPayload(
      accounts,
      categories,
      validatedDateRange,
    );

    // Create the getTransactions tool with closure over userId and dateRange
    const getTransactionsTool = createGetTransactionsTool(
      this.aiDataService,
      userId,
      validatedDateRange,
    );

    // Create AI agent with all tools including the dynamic getTransactions tool
    const aiAgent = new LangchainBedrockAgent([
      getTransactionsTool,
      sumTool,
      avgTool,
      calculateTool,
    ]);

    const systemPrompt = this.buildSystemPrompt(metadataPayload);
    const userPrompt = this.buildUserPrompt(
      normalizedQuestion,
      validatedDateRange,
    );

    const response = await aiAgent.call(
      [{ role: "user", content: userPrompt }],
      systemPrompt,
    );

    if (!response.answer) {
      throw new BusinessError(
        "Empty response",
        BusinessErrorCodes.EMPTY_RESPONSE,
      );
    }

    let finalAnswer = response.answer.trim();

    // Append tool executions to the response for observability
    if (response.toolExecutions && response.toolExecutions.length > 0) {
      const usedToolDetails = response.toolExecutions.map(
        (toolExecution: ToolExecution, index: number) => {
          const formattedInput = this.formatJsonIfValid(toolExecution.input);
          const formattedOutput = this.formatJsonIfValid(toolExecution.output);
          return [
            `${index + 1}. ${toolExecution.tool}`,
            `Input:\n${formattedInput}`,
            `Output:\n${formattedOutput}`,
          ].join("\n");
        },
      );

      finalAnswer += "\n\n[DEBUG] Tools performed:\n";
      finalAnswer += usedToolDetails.join("\n\n");
    }

    return finalAnswer;
  }

  private validateDateRange(dateRange: DateRange): DateRange {
    if (!dateRange.startDate) {
      throw new BusinessError(
        "Start date is required",
        BusinessErrorCodes.INVALID_PARAMETERS,
      );
    }

    if (!dateRange.endDate) {
      throw new BusinessError(
        "End date is required",
        BusinessErrorCodes.INVALID_PARAMETERS,
      );
    }

    const startDate = this.parseDate(dateRange.startDate, "Start date");
    const endDate = this.parseDate(dateRange.endDate, "End date");

    if (startDate > endDate) {
      throw new BusinessError(
        "Start date must be before or equal to end date",
        BusinessErrorCodes.INVALID_DATE,
      );
    }

    const differenceInDays =
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);

    if (differenceInDays > MAX_PERIOD_DAYS) {
      throw new BusinessError(
        `Date range cannot exceed ${MAX_PERIOD_DAYS} days`,
        BusinessErrorCodes.INVALID_DATE,
      );
    }

    return { ...dateRange };
  }

  private parseDate(value: string, fieldName: string): Date {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BusinessError(
        `${fieldName} must be a valid date in YYYY-MM-DD format`,
        BusinessErrorCodes.INVALID_DATE,
      );
    }

    const currentYear = new Date().getFullYear();
    const minimumYear = currentYear - YEAR_RANGE_OFFSET;
    const maximumYear = currentYear + YEAR_RANGE_OFFSET;
    const yearValue = parsed.getFullYear();

    if (yearValue < minimumYear || yearValue > maximumYear) {
      throw new BusinessError(
        `${fieldName} must be between ${minimumYear} and ${maximumYear}`,
        BusinessErrorCodes.INVALID_DATE,
      );
    }

    return parsed;
  }

  private buildMetadataPayload(
    accounts: {
      id: string;
      name: string;
      currency: string;
      isArchived: boolean;
    }[],
    categories: {
      id: string;
      name: string;
      type: string;
      isArchived: boolean;
    }[],
    dateRange: DateRange,
  ): string {
    const accountsData = accounts.map((account) => ({
      id: account.id,
      name: account.name,
      currency: account.currency,
      isArchived: account.isArchived,
    }));

    const categoriesData = categories.map((category) => ({
      id: category.id,
      name: category.name,
      type: category.type,
      isArchived: category.isArchived,
    }));

    return [
      `Date Range: ${dateRange.startDate} to ${dateRange.endDate}`,
      "",
      "Available Accounts:",
      JSON.stringify(accountsData, null, 2),
      "",
      "Available Categories:",
      JSON.stringify(categoriesData, null, 2),
    ].join("\n");
  }

  private buildUserPrompt(question: string, dateRange: DateRange): string {
    return [
      `I have transactions between ${dateRange.startDate} and ${dateRange.endDate}.`,
      "",
      `My question: ${question}`,
    ].join("\n");
  }

  private buildSystemPrompt(metadataPayload: string): string {
    const currentDate = formatDateAsYYYYMMDD(new Date());

    return (
      SYSTEM_PROMPT +
      `\n\nToday's date is ${currentDate}.\n\n${metadataPayload}`
    );
  }

  private formatJsonIfValid(input: string): string {
    try {
      return JSON.stringify(JSON.parse(input), null, 2);
    } catch {
      return input;
    }
  }
}
