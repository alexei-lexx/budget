import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AccountDto, toAccountDto } from "../../langchain/tools/account-dto";
import { UpdateAccountInput } from "../../models/account";
import { AccountService } from "../../services/account-service";
import { Failure, Result, Success } from "../../types/result";
import { buildGuideTokensField, verifyGuideTokens } from "./guides";
import { toToolResult } from "./to-tool-result";

const requiredGuides = ["basics"] as const;

export async function updateAccount(
  {
    id,
    name,
    currency,
    guideTokens,
  }: {
    id: string;
    name?: string;
    currency?: string;
    guideTokens: string[];
  },
  {
    accountService,
    userId,
  }: {
    accountService: AccountService;
    userId: string;
  },
): Promise<Result<AccountDto>> {
  const verification = verifyGuideTokens({
    guideTokens,
    requiredGuides,
  });
  if (!verification.success) return verification;

  try {
    const input: UpdateAccountInput = {
      ...(name !== undefined && { name }),
      ...(currency !== undefined && { currency }),
    };

    const updated = await accountService.updateAccount(id, userId, input);

    return Success(toAccountDto(updated));
  } catch (error) {
    if (error instanceof Error) {
      return Failure(error.message);
    }
    throw error;
  }
}

const inputSchema = z.object({
  id: z.uuid().describe("Account ID to update"),
  name: z.string().optional().describe("New account name"),
  currency: z
    .string()
    .optional()
    .describe("New account currency — any ISO 4217 code (e.g. USD, EUR, GBP)."),
  guideTokens: buildGuideTokensField(requiredGuides),
});

const description = `
Update an existing account's name and/or currency.

- Only the supplied fields are changed
- Fails if an active (non-archived) account with the same name already exists
- Fails if changing currency on an account that already has transactions
- Changing an account's initial balance is not supported by this tool
`.trim();

export function registerUpdateAccountTool(
  server: McpServer,
  deps: { accountService: AccountService; userId: string },
): void {
  server.registerTool(
    "update_account",
    { description, inputSchema },
    async (input) => toToolResult(await updateAccount(input, deps)),
  );
}
