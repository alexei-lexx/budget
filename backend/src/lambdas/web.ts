import { APIGatewayProxyEventV2, Context } from "aws-lambda";
import { createSingleton } from "../utils/dependency-injection";
import { injectRuntimeEnv } from "./bootstrap";
import { apolloHandler } from "./web-handlers/apollo-handler";
import { mcpHandler } from "./web-handlers/mcp-handler";
import { telegramWebhookHandler } from "./web-handlers/telegram-webhook-handler";

// Handler runs per invocation; cache so warm-start invocations skip the SSM fetch.
const ensureRuntimeEnv = createSingleton(() => injectRuntimeEnv(process.env));

export const handler = async (
  event: APIGatewayProxyEventV2,
  context: Context,
) => {
  await ensureRuntimeEnv();

  if (event.rawPath === "/webhooks/telegram") {
    return telegramWebhookHandler(event);
  }

  if (event.rawPath === "/mcp") {
    return mcpHandler(event);
  }

  // MCP clients probe OAuth discovery paths
  // (e.g. oauth-authorization-server)
  // before falling back to unauthenticated access.
  // Without this, they fell through to Apollo,
  // whose CSRF guard returned a 400 instead of a clean 404,
  // which some clients misread as "sign-in broken".
  if (event.rawPath.startsWith("/.well-known/")) {
    return { statusCode: 404, body: "Not Found" };
  }

  // @ts-expect-error: handler is async despite the type requiring a callback
  // https://github.com/apollo-server-integrations/apollo-server-integration-aws-lambda/issues/168
  return apolloHandler(event, context);
};
