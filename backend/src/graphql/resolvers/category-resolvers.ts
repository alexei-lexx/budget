import { GraphQLError } from "graphql";
import {
  MutationCreateCategoryArgs,
  MutationDeleteCategoryArgs,
  MutationUpdateCategoryArgs,
  QueryCategoriesArgs,
} from "../../__generated__/resolvers-types";
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

      if (!result.success) {
        throw new GraphQLError(result.error);
      }

      return result.data;
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

      if (!result.success) {
        throw new GraphQLError(result.error);
      }

      return result.data;
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

      if (!result.success) {
        throw new GraphQLError(result.error);
      }

      return result.data;
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

      if (!result.success) {
        throw new GraphQLError(result.error);
      }

      return result.data;
    },
  },
};
