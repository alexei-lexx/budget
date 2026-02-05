import { GraphQLContext } from "../server";
import { getAuthenticatedUser, handleResolverError } from "./shared";

export const insightResolvers = {
  Query: {
    insight: async (
      _parent: unknown,
      args: {
        input: {
          question: string;
          period: { startDate: string; endDate: string };
          conversation?:
            | { role: "USER" | "ASSISTANT"; content: string }[]
            | null;
        };
      },
      context: GraphQLContext,
    ) => {
      try {
        const user = await getAuthenticatedUser(context);

        const answer = await context.insightService.call(user.id, args.input);

        return { answer };
      } catch (error) {
        handleResolverError(error, "Failed to fetch insight");
      }
    },
  },
};
