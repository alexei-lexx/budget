import { StructuredTool } from "langchain";
import { AIAgent, AIAgentFactory } from "../models/ai-agent";
import { LangchainBedrockAgent } from "./langchain-bedrock-agent";

export class LangchainBedrockAgentFactory implements AIAgentFactory {
  createAgent(tools: readonly StructuredTool[]): AIAgent {
    return new LangchainBedrockAgent([...tools]);
  }
}
