import { Temporal } from "temporal-polyfill";
import { Failure, Result, Success } from "ts-result";
import { z } from "zod";
import { CREATE_TRANSACTION_TOOL_NAME } from "../langchain/tools/create-transaction";
import { Transaction } from "../models/transaction";
import { Agent, AgentTraceMessage } from "../ports/agent-types";
import { Logger } from "../ports/logger";
import { TransactionService } from "./transaction-service";

const createdTransactionSchema = z.discriminatedUnion("success", [
  z.object({
    success: z.literal(true),
    data: z.object({
      id: z.string(),
    }),
  }),
  z.object({
    success: z.literal(false),
    error: z.string(),
  }),
]);

interface CreateTransactionFromTextInput {
  isVoiceInput?: boolean;
  text: string;
  userId: string;
}

type CreateTransactionFromTextOutput = Result<
  { transaction: Transaction; agentTrace: AgentTraceMessage[] },
  { message: string; agentTrace: AgentTraceMessage[] }
>;

export class CreateTransactionFromTextService {
  private createTransactionAgent: Agent<{
    isVoiceInput: boolean;
    today: string;
    userId: string;
  }>;
  private logger: Logger;
  private transactionService: TransactionService;

  constructor({
    createTransactionAgent,
    logger,
    transactionService,
  }: {
    createTransactionAgent: Agent<{
      isVoiceInput: boolean;
      today: string;
      userId: string;
    }>;
    logger: Logger;
    transactionService: TransactionService;
  }) {
    this.createTransactionAgent = createTransactionAgent;
    this.logger = logger;
    this.transactionService = transactionService;
  }

  async call({
    userId,
    text,
    isVoiceInput = false,
  }: CreateTransactionFromTextInput): Promise<CreateTransactionFromTextOutput> {
    if (!userId) {
      return Failure({ message: "User ID is required", agentTrace: [] });
    }

    const normalizedText = text.trim();
    if (!normalizedText) {
      return Failure({ message: "Text is required", agentTrace: [] });
    }

    const response = await this.createTransactionAgent.invoke(
      { messages: [{ role: "user", content: normalizedText }] },
      {
        context: {
          userId,
          isVoiceInput,
          today: Temporal.Now.plainDateISO().toString(),
        },
      },
    );

    const { answer: rawAnswer, agentTrace, toolExecutions } = response;
    const answer = rawAnswer?.trim();

    const lastCreateTransactionToolExecution = toolExecutions.findLast(
      (toolExecution) => toolExecution.tool === CREATE_TRANSACTION_TOOL_NAME,
    );

    if (!lastCreateTransactionToolExecution) {
      this.logger.error("Agent error", {
        error: "Agent did not attempt to create a transaction",
        agentAnswer: answer,
      });

      return Failure({
        message:
          "Agent did not attempt to create a transaction" +
          (answer ? `\n${answer}` : ""),
        agentTrace,
      });
    }

    let transactionDataJson;
    try {
      transactionDataJson = JSON.parse(
        lastCreateTransactionToolExecution.output,
      );
    } catch (error) {
      this.logger.error("Agent error", {
        error: error instanceof Error ? error.message : String(error),
        agentAnswer: answer,
        toolOutput: lastCreateTransactionToolExecution.output,
      });

      return Failure({
        message: "Response from agent is not valid JSON",
        agentTrace,
      });
    }

    const parsedTransactionData =
      createdTransactionSchema.safeParse(transactionDataJson);

    if (!parsedTransactionData.success) {
      this.logger.error("Agent error", {
        error: z.prettifyError(parsedTransactionData.error),
        agentAnswer: answer,
        toolOutput: lastCreateTransactionToolExecution.output,
      });

      return Failure({
        message: "Response from agent does not match expected format",
        agentTrace,
      });
    }

    // Tool responded with a failure
    if (!parsedTransactionData.data.success) {
      this.logger.error("Agent error", {
        error: parsedTransactionData.data.error,
        agentAnswer: answer,
        toolOutput: lastCreateTransactionToolExecution.output,
      });

      return Failure({
        message: "Agent failed to create transaction",
        agentTrace,
      });
    }

    const transactionId = parsedTransactionData.data.data.id;

    const transactionResult = await this.transactionService.getTransactionById(
      transactionId,
      userId,
    );

    if (!transactionResult.success) {
      return Failure({ message: transactionResult.error, agentTrace });
    }

    return Success({ transaction: transactionResult.data, agentTrace });
  }
}
