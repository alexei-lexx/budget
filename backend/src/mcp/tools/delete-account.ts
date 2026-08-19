import {
  CLIENT_CAPABILITIES_META_KEY,
  InputRequiredResult,
  McpServer,
  type ServerContext,
  acceptedContent,
  inputRequired,
  isInputRequiredResult,
} from "@modelcontextprotocol/server";
import { z } from "zod";
import { AccountDto, toAccountDto } from "../../langchain/tools/account-dto";
import { AccountService } from "../../services/account-service";
import { BusinessError } from "../../services/business-error";
import { Failure, Result, Success } from "../../types/result";
import { buildGuideTokensField, verifyGuideTokens } from "./guides";
import { toToolResult } from "./to-tool-result";

const requiredGuides = ["basics"] as const;

const NOT_CONFIRMED_MESSAGE = "Account deletion was not confirmed.";
const CANNOT_ELICIT_MESSAGE =
  "This client cannot prompt the user for confirmation. Delete the account in the app instead.";

type NarrowedServerContext = Omit<ServerContext, "mcpReq"> & {
  mcpReq: Pick<ServerContext["mcpReq"], "envelope" | "inputResponses">;
};

export async function deleteAccount(
  {
    id,
    guideTokens,
  }: {
    id: string;
    guideTokens: string[];
  },
  {
    accountService,
    userId,
    context,
  }: {
    accountService: AccountService;
    userId: string;
    context: NarrowedServerContext;
  },
): Promise<Result<AccountDto> | InputRequiredResult> {
  const verification = verifyGuideTokens({
    guideTokens,
    requiredGuides,
  });
  if (!verification.success) return verification;

  if (!canElicit(context)) {
    return Failure(CANNOT_ELICIT_MESSAGE);
  }

  try {
    // The client resends the original arguments plus the elicitation answer,
    // keyed by the identifier this tool assigned it below: "confirm".
    const isRetry = context.mcpReq.inputResponses?.confirm !== undefined;

    if (!isRetry) {
      const { account, transactionCount } =
        await accountService.getAccountForDeletion(id, userId);

      return inputRequired({
        inputRequests: {
          confirm: inputRequired.elicit({
            message: `Delete account "${account.name}"? It has ${transactionCount} transaction(s), which will be kept. This cannot be undone.`,
            requestedSchema: {
              type: "object",
              properties: { confirm: { type: "boolean" } },
              required: ["confirm"],
            },
          }),
        },
      });
    }

    const confirmation = acceptedContent<{ confirm: boolean }>(
      context.mcpReq.inputResponses,
      "confirm",
    );

    if (confirmation?.confirm !== true) {
      return Failure(NOT_CONFIRMED_MESSAGE);
    }

    const deleted = await accountService.deleteAccount(id, userId);

    return Success(toAccountDto(deleted));
  } catch (error) {
    if (error instanceof BusinessError) {
      return Failure(error.message);
    }

    console.error(error);
    return Failure("Failed to delete the account");
  }
}

function canElicit(context: NarrowedServerContext): boolean {
  const envelope = context.mcpReq.envelope;
  if (!envelope) return false;

  if (!(CLIENT_CAPABILITIES_META_KEY in envelope)) return false;
  const capabilities = envelope[CLIENT_CAPABILITIES_META_KEY];

  if (typeof capabilities !== "object" || capabilities === null) return false;

  if (!("elicitation" in capabilities)) return false;
  const elicitation = capabilities.elicitation;

  if (typeof elicitation !== "object" || elicitation === null) return false;

  return true;
}

const inputSchema = z.object({
  id: z.uuid().describe("Account ID to delete"),
  guideTokens: buildGuideTokensField(requiredGuides),
});

const description = `
Delete an account. This archives it: the account no longer appears in the user's active records, but its transactions are kept.

- Requires the user to confirm through a prompt before deleting
- If the connecting client cannot show that prompt, delete the account in the app instead
`.trim();

export function registerDeleteAccountTool(
  server: McpServer,
  deps: { accountService: AccountService; userId: string },
): void {
  server.registerTool(
    "delete_account",
    { description, inputSchema },
    async (input, context) => {
      const result = await deleteAccount(input, { ...deps, context });
      return isInputRequiredResult(result) ? result : toToolResult(result);
    },
  );
}
