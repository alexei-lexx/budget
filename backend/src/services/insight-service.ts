import { AIAgent } from "../models/ai-agent";
import { DateRange } from "../types/date-range";
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
You must identify which transactions are relevant to the user's question.
And then perform calculations based on those transactions to answer the question.

## Workflow

When needed, use the getAccounts and getCategories tools to review the available accounts and categories.
Retrieve relevant transactions using the getTransactions tool.
Do calculations based on the retrieved transactions.
Retrieve and calculate for each sub-question if needed.
Answer the user's question based on the calculations.

## Available Tools

- getAccounts: Retrieve all user accounts with id, name, currency, and isArchived status
- getCategories: Retrieve all user categories with id, name, type (INCOME/EXPENSE), and isArchived status
- getTransactions: Retrieve transactions filtered by category ID and/or account ID
- Active entities (isArchived=false) have precedence over archived entities when names match

## Transaction Types

Transaction types: INCOME, EXPENSE, REFUND, TRANSFER_IN, TRANSFER_OUT.
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
- Do not respond in markdown or any other formatting
`.trim();

export interface InsightInput {
  question: string;
  dateRange: DateRange;
}

export class InsightService {
  constructor(
    private aiDataService: AiDataService,
    private aiAgent: AIAgent,
  ) {}

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

    const systemPrompt = this.buildSystemPrompt(validatedDateRange);
    const userPrompt = this.buildUserPrompt(
      normalizedQuestion,
      validatedDateRange,
    );

    const response = await this.aiAgent.call(
      [{ role: "user", content: userPrompt }],
      systemPrompt,
      {
        userId,
        dateRange: validatedDateRange,
        aiDataService: this.aiDataService,
      },
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
        (toolExecution, index) => {
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

  private buildUserPrompt(question: string, dateRange: DateRange): string {
    return [
      `I have transactions between ${dateRange.startDate} and ${dateRange.endDate}.`,
      "",
      `My question: ${question}`,
    ].join("\n");
  }

  private buildSystemPrompt(dateRange: DateRange): string {
    const currentDate = formatDateAsYYYYMMDD(new Date());

    return (
      SYSTEM_PROMPT +
      `\n\nToday's date is ${currentDate}.\n\nDate Range: ${dateRange.startDate} to ${dateRange.endDate}`
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
