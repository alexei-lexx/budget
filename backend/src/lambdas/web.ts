import {
  handlers,
  startServerAndCreateLambdaHandler,
} from "@as-integrations/aws-lambda";
import { APIGatewayProxyEventV2, Context } from "aws-lambda";
import { createContext, server } from "../server";
import { telegramWebhookHandler } from "./telegram-webhook-handler";

const apolloHandler = startServerAndCreateLambdaHandler(
  server,
  handlers.createAPIGatewayProxyEventV2RequestHandler(),
  {
    context: async ({ event }) => {
      try {
        return await createContext({
          headers: event.headers || {},
        });
      } catch (error) {
        // Apollo swallows context errors into GraphQL responses without logging them.
        // Log explicitly so they appear in CloudWatch.
        console.error("Context creation failed:", error);
        throw error;
      }
    },
  },
);

export const handler = async (
  event: APIGatewayProxyEventV2,
  context: Context,
) => {
  if (event.rawPath === "/webhooks/telegram") {
    return telegramWebhookHandler(event);
  }

  // @ts-expect-error: handler is async despite the type requiring a callback
  // https://github.com/apollo-server-integrations/apollo-server-integration-aws-lambda/issues/168
  return apolloHandler(event, context);
};
