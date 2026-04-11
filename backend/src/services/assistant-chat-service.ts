import { randomUUID } from "crypto";
import { ChatMessageRole } from "../models/chat-message";
import { Failure, Result, Success } from "../types/result";
import { InsightService } from "./insight-service";
import { AgentMessage, AgentTraceMessage } from "./ports/agent-types";
import { ChatMessageRepository } from "./ports/chat-message-repository";

export interface AssistantChatInput {
  question: string;
  sessionId?: string;
}

interface AssistantChatData {
  agentTrace: AgentTraceMessage[];
  answer: string;
  sessionId: string;
}

// sessionId is included on both success and failure
// so the caller can continue the same session on retry,
// without needing to independently persist it client-side.
interface AssistantChatError {
  agentTrace: AgentTraceMessage[];
  message: string;
  sessionId: string;
}

export type AssistantChatOutput = Result<AssistantChatData, AssistantChatError>;

export interface AssistantChatService {
  call(userId: string, input: AssistantChatInput): Promise<AssistantChatOutput>;
}

export class AssistantChatServiceImpl implements AssistantChatService {
  private readonly chatMessageRepository: ChatMessageRepository;
  private readonly insightService: InsightService;
  private readonly maxMessages: number;

  constructor(deps: {
    chatMessageRepository: ChatMessageRepository;
    insightService: InsightService;
    maxMessages: number;
  }) {
    this.chatMessageRepository = deps.chatMessageRepository;
    this.insightService = deps.insightService;
    this.maxMessages = deps.maxMessages;
  }

  async call(
    userId: string,
    input: AssistantChatInput,
  ): Promise<AssistantChatOutput> {
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

    const history: AgentMessage[] = recentMessages
      .toReversed()
      .map((message) => ({
        role: roleMap[message.role],
        content: message.content,
      }));

    // Call InsightService with history
    const result = await this.insightService.call(userId, {
      question: input.question,
      history,
    });

    if (!result.success) {
      return Failure({ ...result.error, sessionId });
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
