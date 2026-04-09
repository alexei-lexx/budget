import { MutationAskAssistantArgs } from "../../__generated__/resolvers-types";
import { GraphQLContext } from "../context";
import { getAuthenticatedUser, handleResolverError } from "./shared";

export const assistantResolvers = {
  Mutation: {
    askAssistant: async (
      _parent: unknown,
      args: MutationAskAssistantArgs,
      context: GraphQLContext,
    ) => {
      try {
        const user = await getAuthenticatedUser(context);

        const result = await context.assistantChatService.call(user.id, {
          question: args.input.question,
          sessionId: args.input.sessionId || undefined,
        });

        if (!result.success) {
          return {
            __typename: "AssistantFailure" as const,
            message: result.error.message,
            agentTrace: result.error.agentTrace,
            sessionId: result.error.sessionId,
          };
        }

        return {
          __typename: "AssistantSuccess" as const,
          answer: result.data.answer,
          agentTrace: result.data.agentTrace,
          sessionId: result.data.sessionId,
        };
      } catch (error) {
        handleResolverError(error, "Failed to fetch assistant response");
      }
    },
  },
};
