import { z } from "zod";
import { ModelError } from "../models/model-error";
import { AccountService } from "../services/account-service";
import { BusinessError } from "../services/business-error";
import { Failure, Result, Success } from "../types/result";
import { AccountDto, toAccountDto } from "./account-dto";

export async function createAccount(
  {
    name,
    currency,
    initialBalance,
  }: { name: string; currency: string; initialBalance?: number },
  {
    accountService,
    userId,
  }: {
    accountService: AccountService;
    userId: string;
  },
): Promise<Result<AccountDto & { initialBalance: number }>> {
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
    if (error instanceof BusinessError || error instanceof ModelError) {
      return Failure(error.message);
    }
    throw error;
  }
}

export const inputSchema = {
  name: z.string().describe("Account name"),
  currency: z
    .string()
    .describe("Account currency — any ISO 4217 code (e.g. USD, EUR, GBP)."),
  initialBalance: z
    .number()
    .optional()
    .describe(
      "Initial balance of the account. Omit when the user did not state one; the account will start at zero.",
    ),
};

export const description = `
Create a new account for the user.

Account is a place where money is stored.

Before calling, check the user's existing active (non-archived) accounts.
If the requested name is a semantic near-variant of an existing active one
(pluralisation, typo, abbreviation, or synonym)
ask the user to confirm before creating.
Archived accounts are not considered — reusing an archived account's name is not a duplicate.
`.trim();
