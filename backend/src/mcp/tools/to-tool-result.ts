import { CallToolResult } from "@modelcontextprotocol/server";

export function toToolResult(data: unknown): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data) }],
  };
}

export function toToolError(error: string): CallToolResult {
  return {
    content: [{ type: "text", text: error }],
    isError: true,
  };
}
