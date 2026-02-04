export type AiInsightsModelRole = "system" | "user" | "assistant";

export interface AiInsightsModelMessage {
  role: AiInsightsModelRole;
  content: string;
}

export interface AiInsightsModelClient {
  generateResponse(messages: AiInsightsModelMessage[]): Promise<string>;
}
