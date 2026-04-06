import { randomUUID } from "crypto";
import { ChatMessageRole } from "../../models/chat-message";
import { Result, Success } from "../../types/result";
import { AgentMessage, AgentTraceMessage } from "../ports/agent";
import { ChatMessageRepository } from "../ports/chat-message-repository";
import { InsightService } from "./insight-service";

export const DEFAULT_CHAT_HISTORY_MAX_MESSAGES = 20;

export interface InsightChatInput {
  question: string;
  sessionId?: string;
}

export interface InsightChatOutput {
  answer: string;
  agentTrace: AgentTraceMessage[];
  sessionId: string;
}

type InsightChatResult = Result<
  InsightChatOutput,
  { message: string; agentTrace: AgentTraceMessage[] }
>;

export interface InsightChatService {
  call(userId: string, input: InsightChatInput): Promise<InsightChatResult>;
}

export class InsightChatServiceImpl implements InsightChatService {
  private readonly chatMessageRepository: ChatMessageRepository;
  private readonly insightService: InsightService;
  private readonly maxMessages: number;

  constructor(deps: {
    chatMessageRepository: ChatMessageRepository;
    insightService: InsightService;
    maxMessages?: number;
  }) {
    this.chatMessageRepository = deps.chatMessageRepository;
    this.insightService = deps.insightService;
    this.maxMessages = deps.maxMessages ?? DEFAULT_CHAT_HISTORY_MAX_MESSAGES;
  }

  async call(
    userId: string,
    input: InsightChatInput,
  ): Promise<InsightChatResult> {
    const sessionId = input.sessionId || randomUUID();

    // Load history for this session
    const recentMessages =
      await this.chatMessageRepository.findManyRecentBySessionId(
        { userId, sessionId },
        this.maxMessages,
      );

    const roleMap: Record<ChatMessageRole, AgentMessage["role"]> = {
      [ChatMessageRole.ASSISTANT]: "assistant",
      [ChatMessageRole.USER]: "user",
    };

    const history: AgentMessage[] = recentMessages.reverse().map((message) => ({
      role: roleMap[message.role],
      content: message.content,
    }));

    // Call InsightService with history
    const result = await this.insightService.call(userId, {
      question: input.question,
      history,
    });

    if (!result.success) {
      return result;
    }

    // Persist user question and assistant answer after successful response
    await this.chatMessageRepository.create({
      userId,
      sessionId,
      role: ChatMessageRole.USER,
      content: input.question,
    });
    await this.chatMessageRepository.create({
      userId,
      sessionId,
      role: ChatMessageRole.ASSISTANT,
      content: result.data.answer,
    });

    return Success({
      answer: result.data.answer,
      agentTrace: result.data.agentTrace,
      sessionId,
    });
  }
}
