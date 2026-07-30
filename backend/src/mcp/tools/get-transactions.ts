import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TransactionRepository } from "../../ports/transaction-repository";
import {
  description,
  handler,
  inputSchema,
} from "../../tools/get-transactions";
import { toDateString } from "../../types/date";
import { toToolResult } from "./to-tool-result";

export function registerGetTransactionsTool(
  server: McpServer,
  deps: { transactionRepository: TransactionRepository; userId: string },
): void {
  server.registerTool(
    "get_transactions",
    {
      description,
      inputSchema,
    },
    async ({ startDate, endDate, accountIds, categoryIds, types }) =>
      toToolResult(
        await handler(
          {
            startDate: toDateString(startDate),
            endDate: toDateString(endDate),
            accountIds,
            categoryIds,
            types,
          },
          deps,
        ),
      ),
  );
}
