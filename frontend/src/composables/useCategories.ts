import { ref, watch, type Ref } from "vue";
import type { ApolloError } from "@apollo/client/core";
import {
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  type CategoryType,
  type Category,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from "@/__generated__/vue-apollo";

// Re-export types for backward compatibility
export type { CategoryType, Category, CreateCategoryInput, UpdateCategoryInput };

export function useCategories(type?: CategoryType | Ref<CategoryType>) {
  const categoriesError = ref<string | null>(null);

  // Query for active categories (optionally filtered by type)
  const {
    result: categoriesResult,
    loading: categoriesLoading,
    error: categoriesQueryError,
    refetch: refetchCategories,
  } = useGetCategoriesQuery(() => ({
    type: typeof type === "object" && "value" in type ? type.value : type || undefined,
  }));

  // Create category mutation
  const {
    mutate: createCategoryMutation,
    loading: createCategoryLoading,
    error: createCategoryError,
  } = useCreateCategoryMutation();

  // Update category mutation
  const {
    mutate: updateCategoryMutation,
    loading: updateCategoryLoading,
    error: updateCategoryError,
  } = useUpdateCategoryMutation();

  // Delete category mutation
  const {
    mutate: deleteCategoryMutation,
    loading: deleteCategoryLoading,
    error: deleteCategoryError,
  } = useDeleteCategoryMutation();

  // Watch for query errors
  watch(categoriesQueryError, (error: ApolloError | null) => {
    if (error) {
      console.error("Categories query failed:", error);
      categoriesError.value = error.message || "Failed to fetch categories";
    }
  });

  // Watch for mutation errors
  watch(
    [createCategoryError, updateCategoryError, deleteCategoryError],
    ([createError, updateError, deleteError]) => {
      const error = createError || updateError || deleteError;
      if (error) {
        console.error("Category mutation failed:", error);
        categoriesError.value = error.message || "Category operation failed";
      }
    },
  );

  // Create category function
  const createCategory = async (input: CreateCategoryInput): Promise<Category | null> => {
    try {
      categoriesError.value = null;
      const result = await createCategoryMutation({ input });
      if (result?.data?.createCategory) {
        await refetchCategories();
        return result.data.createCategory;
      }
      return null;
    } catch (error) {
      console.error("Error creating category:", error);
      categoriesError.value = error instanceof Error ? error.message : "Failed to create category";
      return null;
    }
  };

  // Update category function
  const updateCategory = async (
    id: string,
    input: Omit<UpdateCategoryInput, "id">,
  ): Promise<Category | null> => {
    try {
      categoriesError.value = null;
      const result = await updateCategoryMutation({ input: { id, ...input } });
      if (result?.data?.updateCategory) {
        await refetchCategories();
        return result.data.updateCategory;
      }
      return null;
    } catch (error) {
      console.error("Error updating category:", error);
      categoriesError.value = error instanceof Error ? error.message : "Failed to update category";
      return null;
    }
  };

  // Delete category function
  const deleteCategory = async (id: string): Promise<Category | null> => {
    try {
      categoriesError.value = null;
      const result = await deleteCategoryMutation({ id });
      if (result?.data?.deleteCategory) {
        await refetchCategories();
        return result.data.deleteCategory;
      }
      return null;
    } catch (error) {
      console.error("Error deleting category:", error);
      categoriesError.value = error instanceof Error ? error.message : "Failed to delete category";
      return null;
    }
  };

  return {
    // Data
    categories: categoriesResult,

    // Loading states
    categoriesLoading,
    createCategoryLoading,
    updateCategoryLoading,
    deleteCategoryLoading,

    // Error states
    categoriesError,
    categoriesQueryError,
    createCategoryError,
    updateCategoryError,
    deleteCategoryError,

    // Functions
    createCategory,
    updateCategory,
    deleteCategory,
    refetchCategories,
  };
}
