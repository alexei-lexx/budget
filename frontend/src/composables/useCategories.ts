import { useMutation, useQuery } from "@vue/apollo-composable";
import { ref, watch, type Ref } from "vue";
import { GET_CATEGORIES } from "@/graphql/queries";
import { CREATE_CATEGORY, UPDATE_CATEGORY, DELETE_CATEGORY } from "@/graphql/mutations";
import type { ApolloError } from "@apollo/client/core";

export type CategoryType = "INCOME" | "EXPENSE";

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
}

export interface CreateCategoryInput {
  name: string;
  type: CategoryType;
}

export interface UpdateCategoryInput {
  id: string;
  name?: string;
  type?: CategoryType;
}

interface GetCategoriesResponse {
  categories: Category[];
}

interface CreateCategoryResponse {
  createCategory: Category;
}

interface UpdateCategoryResponse {
  updateCategory: Category;
}

interface DeleteCategoryResponse {
  deleteCategory: Category;
}

export function useCategories(type?: CategoryType | Ref<CategoryType>) {
  const categoriesError = ref<string | null>(null);

  // Query for active categories (optionally filtered by type)
  const {
    result: categoriesResult,
    loading: categoriesLoading,
    error: categoriesQueryError,
    refetch: refetchCategories,
  } = useQuery<GetCategoriesResponse>(GET_CATEGORIES, () => ({
    type: typeof type === "object" && "value" in type ? type.value : type || null,
  }));

  // Create category mutation
  const {
    mutate: createCategoryMutation,
    loading: createCategoryLoading,
    error: createCategoryError,
  } = useMutation<CreateCategoryResponse, { input: CreateCategoryInput }>(CREATE_CATEGORY);

  // Update category mutation
  const {
    mutate: updateCategoryMutation,
    loading: updateCategoryLoading,
    error: updateCategoryError,
  } = useMutation<UpdateCategoryResponse, { input: UpdateCategoryInput }>(UPDATE_CATEGORY);

  // Delete category mutation
  const {
    mutate: deleteCategoryMutation,
    loading: deleteCategoryLoading,
    error: deleteCategoryError,
  } = useMutation<DeleteCategoryResponse, { id: string }>(DELETE_CATEGORY);

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
