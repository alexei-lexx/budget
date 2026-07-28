import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  resolveAccountRepository,
  resolveCategoryRepository,
  resolveTransactionRepository,
  resolveTransactionService,
  resolveUserRepository,
} from "../dependencies";
import { authenticateMcpToken } from "./auth";
import { registerCreateTransactionTool } from "./tools/create-transaction";
import { registerGetAccountsTool } from "./tools/get-accounts";
import { registerGetCategoriesTool } from "./tools/get-categories";
import { registerGetTransactionsTool } from "./tools/get-transactions";

const instructions = `
The user's financial data consists of accounts, categories, and transactions.

**Account** is a place where money is stored.
- The user can have multiple accounts
- Each account has a name and a currency
- An account can be archived; use the "scope" input on "get_accounts" to include archived accounts

**Category** is a classification system for transactions.
- The user can have multiple categories
- Each category has a name and a type (INCOME, EXPENSE)
- A category can be marked to exclude its transactions from financial reports
  - When a category is report-excluded, its transactions should not count towards spending or income totals
- A category can be archived; use the "scope" input on "get_categories" to include archived categories

**Transaction** is a record of a money movement.
- "get_transactions" can return any type: INCOME, EXPENSE, REFUND, TRANSFER_IN, TRANSFER_OUT
- "create_transaction" only supports INCOME, EXPENSE, and REFUND; transfers cannot be created through this tool
- Each transaction MUST belong to exactly one account
- Each transaction MUST have an amount, a currency, and a date
- A transaction can optionally belong to a category and have a description

**Archived data:**
- Transactions can be linked to archived accounts and categories
- When querying historical periods, retrieve both active and archived data
`.trim();

export async function createAuthenticatedMcpServer(
  token: string | null,
): Promise<McpServer | null> {
  const user = await authenticateMcpToken(token, resolveUserRepository());

  if (!user) return null;

  const server = new McpServer(
    { name: "budget-mcp-server", version: "1.0.0" },
    { instructions },
  );

  const accountRepository = resolveAccountRepository();
  const categoryRepository = resolveCategoryRepository();
  const transactionRepository = resolveTransactionRepository();
  const transactionService = resolveTransactionService();

  const userId = user.id;

  registerGetAccountsTool(server, { accountRepository, userId });
  registerGetCategoriesTool(server, { categoryRepository, userId });
  registerGetTransactionsTool(server, { transactionRepository, userId });
  registerCreateTransactionTool(server, { transactionService, userId });

  return server;
}
