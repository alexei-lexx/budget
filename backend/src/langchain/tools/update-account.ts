import { tool } from "langchain";
import { z } from "zod";
import { UpdateAccountInput as UpdateAccountServiceInput } from "../../ports/account-repository";
import { AccountService } from "../../services/account-service";
import { Success } from "../../types/result";
import { agentContextSchema } from "../agents/agent-context";
import { toAccountDto } from "./account-dto";

const schema = z
  .object({
    id: z.uuid().describe("Account ID to update"),
    name: z.string().optional().describe("New account name"),
    currency: z
      .string()
      .optional()
      .describe(
        "New account currency — any ISO 4217 code (e.g. USD, EUR, GBP).",
      ),
  })
  .strict();

export type UpdateAccountInput = z.infer<typeof schema>;

const description = `
Update an existing account's name and/or currency.

Before calling, check the user's existing active (non-archived) accounts
to resolve the account id (never guess it or accept it from user input).
If the requested new name is a semantic near-variant of another existing active account
(pluralisation, typo, abbreviation, or synonym)
ask the user to confirm before updating.
Archived accounts are not considered — reusing an archived account's name is not a duplicate.

Changing an account's initial balance is not supported.
`.trim();

export const createUpdateAccountTool = ({
  accountService,
}: {
  accountService: AccountService;
}) => {
  return tool(
    async (input: UpdateAccountInput, config) => {
      const userId = agentContextSchema.shape.userId.parse(
        config?.context?.userId,
      );

      const serviceInput: UpdateAccountServiceInput = {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.currency !== undefined && { currency: input.currency }),
      };

      const updated = await accountService.updateAccount(
        input.id,
        userId,
        serviceInput,
      );

      return Success(toAccountDto(updated));
    },
    {
      name: "update_account",
      description,
      schema,
    },
  );
};
