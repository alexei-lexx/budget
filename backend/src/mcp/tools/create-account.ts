import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AccountDto, toAccountDto } from "../../langchain/tools/account-dto";
import { AccountService } from "../../services/account-service";
import { Failure, Result, Success } from "../../types/result";
import { buildGuideTokensField, verifyGuideTokens } from "./guides";
import { toToolResult } from "./to-tool-result";

const requiredGuides = ["basics"] as const;

export async function createAccount(
  {
    name,
    currency,
    initialBalance,
    guideTokens,
  }: {
    name: string;
    currency: string;
    initialBalance?: number;
    guideTokens: string[];
  },
  {
    accountService,
    userId,
  }: {
    accountService: AccountService;
    userId: string;
  },
): Promise<Result<AccountDto & { initialBalance: number }>> {
  const verification = verifyGuideTokens({
    guideTokens,
    requiredGuides,
  });
  if (!verification.success) return verification;

  try {
    const created = await accountService.createAccount({
      userId,
      name,
      currency,
      initialBalance: initialBalance ?? 0,
    });

    return Success({
      ...toAccountDto(created),
      initialBalance: created.initialBalance,
    });
  } catch (error) {
    if (error instanceof Error) {
      return Failure(error.message);
    }
    throw error;
  }
}

const inputSchema = {
  name: z.string().describe("Account name"),
  currency: z
    .string()
    .describe("Account currency — any ISO 4217 code (e.g. USD, EUR, GBP)."),
  initialBalance: z
    .number()
    .optional()
    .describe(
      "Initial balance of the account. Omit to start the account at zero.",
    ),
  guideTokens: buildGuideTokensField(requiredGuides),
};

const description = `
Create a new account for the user.

- Fails if an active (non-archived) account with the same name already exists
- Archived accounts are not considered duplicates
`.trim();

export function registerCreateAccountTool(
  server: McpServer,
  deps: { accountService: AccountService; userId: string },
): void {
  server.registerTool(
    "create_account",
    { description, inputSchema },
    async (input) => toToolResult(await createAccount(input, deps)),
  );
}
