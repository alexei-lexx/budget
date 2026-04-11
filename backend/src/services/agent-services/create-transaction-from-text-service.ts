import { ReactAgent } from "langchain";
import { z } from "zod";
import { CREATE_TRANSACTION_TOOL_NAME } from "../../langchain/tools/create-transaction";
import {
  extractAgentTrace,
  extractLastMessageText,
  extractToolExecutions,
} from "../../langchain/utils";
import { Transaction } from "../../models/transaction";
import { Failure, Result, Success } from "../../types/result";
import { formatDateAsYYYYMMDD } from "../../utils/date";
import { AgentTraceMessage } from "../ports/agent-types";
import { TransactionService } from "../transaction-service";

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
  private createTransactionAgent: ReactAgent;
  private transactionService: TransactionService;

  constructor(deps: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createTransactionAgent: ReactAgent<any>;
    transactionService: TransactionService;
  }) {
    this.createTransactionAgent = deps.createTransactionAgent;
    this.transactionService = deps.transactionService;
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
          today: formatDateAsYYYYMMDD(new Date()),
        },
      },
    );

    const toolExecutions = extractToolExecutions(response.messages);
    const agentTrace = extractAgentTrace(response.messages);
    const answer = extractLastMessageText(response.messages)?.trim();

    const lastCreateTransactionToolExecution = toolExecutions.findLast(
      (toolExecution) => toolExecution.tool === CREATE_TRANSACTION_TOOL_NAME,
    );

    if (!lastCreateTransactionToolExecution) {
      console.log("Agent error", {
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
      console.log("Agent error", {
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
      console.log("Agent error", {
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
      console.log("Agent error", {
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

    const transaction = await this.transactionService.getTransactionById(
      transactionId,
      userId,
    );
    return Success({ transaction, agentTrace });
  }
}
