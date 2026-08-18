import { CallToolResult } from "@modelcontextprotocol/server";
import { Result } from "../../types/result";

export function toToolResult<TData>(result: Result<TData>): CallToolResult {
  if (!result.success) {
    return {
      content: [{ type: "text", text: result.error }],
      isError: true,
    };
  }

  return {
    content: [{ type: "text", text: JSON.stringify(result.data) }],
  };
}
