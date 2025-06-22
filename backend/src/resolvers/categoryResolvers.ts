import { GraphQLError } from "graphql";
import { z } from "zod";
import { GraphQLContext } from "../server";
import { getAuthenticatedUser, handleResolverError } from "./shared";
import { CategoryType } from "../models/Category";

/**
 * Zod schemas for input validation
 */
const createCategoryInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Category name cannot be empty")
    .max(100, "Category name cannot exceed 100 characters"),
  type: z.enum(["INCOME", "EXPENSE"], {
    errorMap: () => ({ message: "Category type must be either INCOME or EXPENSE" }),
  }),
});

const updateCategoryInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Category name cannot be empty")
    .max(100, "Category name cannot exceed 100 characters")
    .optional(),
  type: z
    .enum(["INCOME", "EXPENSE"], {
      errorMap: () => ({ message: "Category type must be either INCOME or EXPENSE" }),
    })
    .optional(),
});

export const categoryResolvers = {
  Query: {
    activeCategories: async (
      _parent: unknown,
      args: { type?: CategoryType },
      context: GraphQLContext,
    ) => {
      try {
        const user = await getAuthenticatedUser(context);
        
        // If type filter is provided, use the filtered method
        if (args.type) {
          const categories = await context.categoryRepository.findActiveByUserIdAndType(
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
        handleResolverError(error, "Failed to fetch active categories");
      }
    },
  },
  Mutation: {
    // Placeholder for mutations - will be implemented in subsequent tasks
  },
};