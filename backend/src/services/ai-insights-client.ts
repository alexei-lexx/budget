export type AiInsightsModelRole = "user" | "assistant";

export interface AiInsightsModelMessage {
  role: AiInsightsModelRole;
  content: string;
}

export interface AiInsightsModelClient {
  generateResponse(
    messages: AiInsightsModelMessage[],
    systemPrompt: string,
  ): Promise<string>;
}
