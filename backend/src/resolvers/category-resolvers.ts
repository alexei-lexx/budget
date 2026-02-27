import { GraphQLError } from "graphql";
import {
  MutationCreateCategoryArgs,
  MutationDeleteCategoryArgs,
  MutationUpdateCategoryArgs,
  QueryCategoriesArgs,
} from "../__generated__/resolvers-types";
import { GraphQLContext } from "../server";
import { getAuthenticatedUser, handleResolverError } from "./shared";

export const categoryResolvers = {
  Query: {
    categories: async (
      _parent: unknown,
      args: QueryCategoriesArgs,
      context: GraphQLContext,
    ) => {
      try {
        const user = await getAuthenticatedUser(context);
        return await context.categoryService.getCategoriesByUser(
          user.id,
          args.type,
        );
      } catch (error) {
        handleResolverError(error, "Failed to fetch categories");
      }
    },
  },
  Mutation: {
    createCategory: async (
      _parent: unknown,
      args: MutationCreateCategoryArgs,
      context: GraphQLContext,
    ) => {
      try {
        const user = await getAuthenticatedUser(context);

        const category = await context.categoryService.createCategory({
          userId: user.id,
          name: args.input.name,
          type: args.input.type,
          excludeFromReports: args.input.excludeFromReports,
        });
        return category;
      } catch (error) {
        handleResolverError(error, "Failed to create category");
      }
    },
    updateCategory: async (
      _parent: unknown,
      args: MutationUpdateCategoryArgs,
      context: GraphQLContext,
    ) => {
      try {
        const user = await getAuthenticatedUser(context);
        const { id, ...updateData } = args.input;

        const category = await context.categoryService.updateCategory(
          id,
          user.id,
          updateData,
        );
        return category;
      } catch (error) {
        handleResolverError(error, "Failed to update category");
      }
    },
    deleteCategory: async (
      _parent: unknown,
      args: MutationDeleteCategoryArgs,
      context: GraphQLContext,
    ) => {
      const { id } = args;

      // Validate input
      if (!id) {
        throw new GraphQLError("Category ID is required", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      try {
        const user = await getAuthenticatedUser(context);
        const category = await context.categoryService.deleteCategory(
          id,
          user.id,
        );
        return category;
      } catch (error) {
        handleResolverError(error, "Failed to delete category");
      }
    },
  },
};
