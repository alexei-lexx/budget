import { GraphQLError } from "graphql";
import { z } from "zod";
import { CategoryType } from "../models/category";
import { GraphQLContext } from "../server";
import { getAuthenticatedUser, handleResolverError } from "./shared";

/**
 * Reusable schema components for categories
 */
const nameSchema = z
  .string()
  .trim()
  .min(1, "Category name cannot be empty")
  .max(100, "Category name cannot exceed 100 characters");

const typeSchema = z.enum([CategoryType.INCOME, CategoryType.EXPENSE], {
  message: `Category type must be either ${CategoryType.INCOME} or ${CategoryType.EXPENSE}`,
});

/**
 * Zod schemas for input validation
 */
const createCategoryInputSchema = z.object({
  name: nameSchema,
  type: typeSchema,
});

const updateCategoryInputSchema = z.object({
  id: z.uuid({ message: "Category ID must be a valid UUID" }),
  name: nameSchema.optional(),
  type: typeSchema.optional(),
});

export const categoryResolvers = {
  Query: {
    categories: async (
      _parent: unknown,
      args: { type?: CategoryType },
      context: GraphQLContext,
    ) => {
      try {
        const user = await getAuthenticatedUser(context);

        // If type filter is provided, use the filtered method
        if (args.type) {
          const categories =
            await context.categoryRepository.findActiveByUserIdAndType(
              user.id,
              args.type,
            );
          return categories;
        }

        // Otherwise, return all active categories
        const categories = await context.categoryRepository.findActiveByUserId(
          user.id,
        );
        return categories;
      } catch (error) {
        handleResolverError(error, "Failed to fetch categories");
      }
    },
  },
  Mutation: {
    createCategory: async (
      _parent: unknown,
      args: {
        input: { name: string; type: CategoryType };
      },
      context: GraphQLContext,
    ) => {
      try {
        // Validate and normalize input
        const validatedInput = createCategoryInputSchema.parse(args.input);
        const user = await getAuthenticatedUser(context);

        const category = await context.categoryRepository.create({
          userId: user.id,
          name: validatedInput.name,
          type: validatedInput.type,
        });
        return category;
      } catch (error) {
        if (error instanceof z.ZodError) {
          const firstError = error.issues[0];
          throw new GraphQLError(firstError.message, {
            extensions: { code: "BAD_USER_INPUT" },
          });
        }
        handleResolverError(error, "Failed to create category");
      }
    },
    updateCategory: async (
      _parent: unknown,
      args: { input: unknown },
      context: GraphQLContext,
    ) => {
      try {
        // Validate and normalize input
        const validatedInput = updateCategoryInputSchema.parse(args.input);
        const user = await getAuthenticatedUser(context);
        const { id } = validatedInput;

        const category = await context.categoryRepository.update(
          id,
          user.id,
          validatedInput,
        );
        return category;
      } catch (error) {
        if (error instanceof z.ZodError) {
          const firstError = error.issues[0];
          throw new GraphQLError(firstError.message, {
            extensions: { code: "BAD_USER_INPUT" },
          });
        }
        handleResolverError(error, "Failed to update category");
      }
    },
    deleteCategory: async (
      _parent: unknown,
      args: { id: string },
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
        const category = await context.categoryRepository.archive(id, user.id);
        return category;
      } catch (error) {
        handleResolverError(error, "Failed to delete category");
      }
    },
  },
};
