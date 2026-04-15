import { tool } from "langchain";
import { z } from "zod";
import { UpdateAccountInput as UpdateAccountServiceInput } from "../../ports/account-repository";
import { AccountService } from "../../services/account-service";
import { Success } from "../../types/result";
import { SUPPORTED_CURRENCIES } from "../../types/validation";
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
        `New account currency (ISO 4217 code). Supported currencies: ${SUPPORTED_CURRENCIES.join(", ")}.`,
      ),
  })
  .strict();

export type UpdateAccountInput = z.infer<typeof schema>;

const description = `
Update an existing account's name and/or currency.

Before calling, check the user's existing accounts
to resolve the account id (never guess it or accept it from user input).
If the requested new name is a semantic near-variant of another existing account
(pluralisation, typo, abbreviation, or synonym)
ask the user to confirm before updating.

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
