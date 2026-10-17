import { GraphQLError } from "graphql";
import {
  MutationCreateCategoryArgs,
  MutationDeleteCategoryArgs,
  MutationUpdateCategoryArgs,
  QueryCategoriesArgs,
} from "../../__generated__/resolvers-types";
import { BadRequestGraphQLError } from "../bad-request-graphql-error";
import { GraphQLContext } from "../context";
import { getAuthenticatedUser } from "./shared";

export const categoryResolvers = {
  Query: {
    categories: async (
      _parent: unknown,
      args: QueryCategoriesArgs,
      context: GraphQLContext,
    ) => {
      const user = await getAuthenticatedUser(context);
      const result = await context.categoryService.getCategoriesByUser(
        user.id,
        {
          scope: "ACTIVE",
          type: args.type ?? undefined,
        },
      );

      return result.unwrapOrThrowAs(BadRequestGraphQLError);
    },
  },
  Mutation: {
    createCategory: async (
      _parent: unknown,
      args: MutationCreateCategoryArgs,
      context: GraphQLContext,
    ) => {
      const user = await getAuthenticatedUser(context);

      const result = await context.categoryService.createCategory({
        userId: user.id,
        name: args.input.name,
        type: args.input.type,
        excludeFromReports: args.input.excludeFromReports,
      });

      return result.unwrapOrThrowAs(BadRequestGraphQLError);
    },
    updateCategory: async (
      _parent: unknown,
      args: MutationUpdateCategoryArgs,
      context: GraphQLContext,
    ) => {
      const user = await getAuthenticatedUser(context);
      const { id, ...updateData } = args.input;

      const result = await context.categoryService.updateCategory(id, user.id, {
        ...updateData,
        excludeFromReports: updateData.excludeFromReports ?? undefined,
        name: updateData.name ?? undefined,
        type: updateData.type ?? undefined,
      });

      return result.unwrapOrThrowAs(BadRequestGraphQLError);
    },
    deleteCategory: async (
      _parent: unknown,
      args: MutationDeleteCategoryArgs,
      context: GraphQLContext,
    ) => {
      const { id } = args;

      // Validate input
      if (!id) {
        throw new GraphQLError("Category ID is required");
      }

      const user = await getAuthenticatedUser(context);
      const result = await context.categoryService.deleteCategory(id, user.id);

      return result.unwrapOrThrowAs(BadRequestGraphQLError);
    },
  },
};
