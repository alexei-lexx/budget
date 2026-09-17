import { ref, watch, type Ref } from "vue";
import { i18n } from "@/plugins/i18n";
import { isInternalServerError, resolveErrorMessage } from "@/utils/graphqlError";
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
  const { t } = i18n.global;
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
  const { mutate: createCategoryMutation, loading: createCategoryLoading } =
    useCreateCategoryMutation();

  // Update category mutation
  const { mutate: updateCategoryMutation, loading: updateCategoryLoading } =
    useUpdateCategoryMutation();

  // Delete category mutation
  const { mutate: deleteCategoryMutation, loading: deleteCategoryLoading } =
    useDeleteCategoryMutation();

  // Watch for query errors
  watch(categoriesQueryError, (error) => {
    if (error) {
      console.error("Categories query failed:", error);

      categoriesError.value = isInternalServerError(error)
        ? t("categories.errors.fetchFailed")
        : error.message;
    }
  });

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

      categoriesError.value = resolveErrorMessage(error, t("categories.errors.createFailed"));

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

      categoriesError.value = resolveErrorMessage(error, t("categories.errors.updateFailed"));

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

      categoriesError.value = resolveErrorMessage(error, t("categories.errors.deleteFailed"));

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

    // Error state
    categoriesError,

    // Functions
    createCategory,
    updateCategory,
    deleteCategory,
    refetchCategories,
  };
}
