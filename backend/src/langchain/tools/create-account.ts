import { tool } from "langchain";
import { z } from "zod";
import { AccountService } from "../../services/account-service";
import { Success } from "../../types/result";
import { SUPPORTED_CURRENCIES } from "../../types/validation";
import { agentContextSchema } from "../agents/agent-context";
import { toAccountDto } from "./account-dto";

const schema = z.object({
  name: z.string().describe("Account name"),
  currency: z
    .string()
    .describe(
      `Account currency (ISO 4217 code). Supported currencies: ${SUPPORTED_CURRENCIES.join(", ")}.`,
    ),
  initialBalance: z
    .number()
    .optional()
    .describe(
      "Initial balance of the account. Omit when the user did not state one; the account will start at zero.",
    ),
});

export type CreateAccountInput = z.infer<typeof schema>;

const description = `
Create a new account for the user.

Before calling, check the user's existing active (non-archived) accounts.
If the requested name is a semantic near-variant of an existing active one
(pluralisation, typo, abbreviation, or synonym)
ask the user to confirm before creating.
Archived accounts are not considered — reusing an archived account's name is not a duplicate.
`.trim();

export const createCreateAccountTool = ({
  accountService,
}: {
  accountService: AccountService;
}) => {
  return tool(
    async (input: CreateAccountInput, config) => {
      const userId = agentContextSchema.shape.userId.parse(
        config?.context?.userId,
      );

      const created = await accountService.createAccount({
        userId,
        name: input.name,
        currency: input.currency,
        initialBalance: input.initialBalance ?? 0,
      });

      return Success({
        ...toAccountDto(created),
        initialBalance: created.initialBalance,
      });
    },
    {
      name: "create_account",
      description,
      schema,
    },
  );
};
