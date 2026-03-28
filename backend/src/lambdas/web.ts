import {
  handlers,
  startServerAndCreateLambdaHandler,
} from "@as-integrations/aws-lambda";
import { createContext, server } from "../server";

export const handler = startServerAndCreateLambdaHandler(
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
