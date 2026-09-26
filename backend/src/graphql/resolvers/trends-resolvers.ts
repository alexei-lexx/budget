import { GraphQLError } from "graphql";
import {
  MutationCreateTrendPresetArgs,
  MutationDeleteTrendPresetArgs,
  QueryExpenseTrendArgs,
} from "../../__generated__/resolvers-types";
import { toDateString } from "../../types/date-string";
import { GraphQLContext } from "../context";

import { getAuthenticatedUser } from "./shared";

export const trendsResolvers = {
  Query: {
    expenseTrend: async (
      _parent: unknown,
      args: QueryExpenseTrendArgs,
      context: GraphQLContext,
    ) => {
      const user = await getAuthenticatedUser(context);

      const result = await context.expenseTrendService.call({
        userId: user.id,
        periodUnit: args.input.periodUnit,
        lookback: args.input.lookback,
        currency: args.input.currency,
        today: toDateString(args.input.today),
        categoryIds: args.input.categoryIds ?? undefined,
        includeUncategorized: args.input.includeUncategorized || undefined,
      });

      return result.unwrapOrThrowAs(GraphQLError);
    },
    trendPresets: async (
      _parent: unknown,
      _args: unknown,
      context: GraphQLContext,
    ) => {
      const user = await getAuthenticatedUser(context);

      const result = await context.trendPresetService.getTrendPresetsByUser(
        user.id,
      );

      return result.unwrapOrThrowAs(GraphQLError);
    },
  },
  Mutation: {
    createTrendPreset: async (
      _parent: unknown,
      args: MutationCreateTrendPresetArgs,
      context: GraphQLContext,
    ) => {
      const user = await getAuthenticatedUser(context);

      const result = await context.trendPresetService.createTrendPreset(
        user.id,
        {
          periodUnit: args.input.periodUnit,
          lookback: args.input.lookback,
          currency: args.input.currency,
          categoryIds: args.input.categoryIds ?? undefined,
          includeUncategorized: args.input.includeUncategorized || undefined,
        },
      );

      return result.unwrapOrThrowAs(GraphQLError);
    },
    deleteTrendPreset: async (
      _parent: unknown,
      args: MutationDeleteTrendPresetArgs,
      context: GraphQLContext,
    ) => {
      const user = await getAuthenticatedUser(context);

      const result = await context.trendPresetService.deleteTrendPreset(
        user.id,
        args.id,
      );

      result.unwrapOrThrowAs(GraphQLError);

      return undefined;
    },
  },
};
