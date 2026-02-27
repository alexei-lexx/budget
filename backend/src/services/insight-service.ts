import { Agent } from "../models/agent";
import { DateString } from "../types/date";
import { YEAR_RANGE_OFFSET } from "../types/validation";
import { formatDateAsYYYYMMDD } from "../utils/date";
import { AgentDataService } from "./agent-data-service";
import {
  createGetAccountsTool,
  createGetCategoriesTool,
  createGetTransactionsTool,
} from "./agent-data-tools";
import { avgTool, calculateTool, sumTool } from "./agent-math-tools";
import { BusinessError, BusinessErrorCodes } from "./business-error";

const MAX_PERIOD_DAYS = 366;

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
  constructor(
    private agentDataService: AgentDataService,
    private agent: Agent,
  ) {}

  async call(userId: string, input: InsightInput): Promise<string> {
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
      createGetAccountsTool(this.agentDataService, userId),
      createGetCategoriesTool(this.agentDataService, userId),
      createGetTransactionsTool({
        agentDataService: this.agentDataService,
        userId,
        allowedStartDate: startDate,
        allowedEndDate: endDate,
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

    let finalAnswer = response.answer.trim();

    // Append tool executions to the response for observability
    if (response.toolExecutions && response.toolExecutions.length > 0) {
      const toolsSummary = response.toolExecutions.map(
        (toolExecution, index) => {
          const formattedInput = this.formatJsonString(toolExecution.input);
          const formattedOutput = this.formatJsonString(toolExecution.output);
          return `${index + 1}. ${toolExecution.tool}\nInput:\n${formattedInput}\nOutput:\n${formattedOutput}`;
        },
      );

      finalAnswer += "\n\n[DEBUG] Tools performed:\n";
      finalAnswer += toolsSummary.join("\n");
    }

    return finalAnswer;
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

    const currentYear = new Date().getFullYear();
    const minimumYear = currentYear - YEAR_RANGE_OFFSET;
    const maximumYear = currentYear + YEAR_RANGE_OFFSET;

    if (
      startDateObj.getFullYear() < minimumYear ||
      startDateObj.getFullYear() > maximumYear
    ) {
      throw new BusinessError(
        `Start date must be between ${minimumYear} and ${maximumYear}`,
        BusinessErrorCodes.INVALID_DATE,
      );
    }

    if (
      endDateObj.getFullYear() < minimumYear ||
      endDateObj.getFullYear() > maximumYear
    ) {
      throw new BusinessError(
        `End date must be between ${minimumYear} and ${maximumYear}`,
        BusinessErrorCodes.INVALID_DATE,
      );
    }

    const differenceInDays =
      (endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24);

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
