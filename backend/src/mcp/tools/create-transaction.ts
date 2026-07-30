import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TransactionService } from "../../services/transaction-service";
import {
  createTransaction,
  description,
  inputSchema,
} from "../../tools/create-transaction";
import { toToolResult } from "./to-tool-result";

export function registerCreateTransactionTool(
  server: McpServer,
  deps: { transactionService: TransactionService; userId: string },
): void {
  server.registerTool(
    "create_transaction",
    { description, inputSchema },
    async (input) => toToolResult(await createTransaction(input, deps)),
  );
}
