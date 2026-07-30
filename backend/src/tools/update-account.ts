import { z } from "zod";
import { UpdateAccountInput } from "../models/account";
import { ModelError } from "../models/model-error";
import { AccountService } from "../services/account-service";
import { BusinessError } from "../services/business-error";
import { Failure, Result, Success } from "../types/result";
import { AccountDto, toAccountDto } from "./account-dto";

export async function updateAccount(
  { id, name, currency }: { id: string; name?: string; currency?: string },
  {
    accountService,
    userId,
  }: {
    accountService: AccountService;
    userId: string;
  },
): Promise<Result<AccountDto>> {
  try {
    const input: UpdateAccountInput = {
      ...(name !== undefined && { name }),
      ...(currency !== undefined && { currency }),
    };

    const updated = await accountService.updateAccount(id, userId, input);

    return Success(toAccountDto(updated));
  } catch (error) {
    if (error instanceof BusinessError || error instanceof ModelError) {
      return Failure(error.message);
    }
    throw error;
  }
}

export const inputSchema = {
  id: z.uuid().describe("Account ID to update"),
  name: z.string().optional().describe("New account name"),
  currency: z
    .string()
    .optional()
    .describe("New account currency — any ISO 4217 code (e.g. USD, EUR, GBP)."),
};

export const description = `
Update an existing account's name and/or currency.

Before calling, check the user's existing active (non-archived) accounts
to resolve the account id (never guess it or accept it from user input).
If the requested new name is a semantic near-variant of another existing active account
(pluralisation, typo, abbreviation, or synonym)
ask the user to confirm before updating.
Archived accounts are not considered — reusing an archived account's name is not a duplicate.

- Only the supplied fields are changed
- Fails if an active (non-archived) account with the same name already exists
- Fails if changing currency on an account that already has transactions
- Changing an account's initial balance is not supported by this tool
`.trim();
