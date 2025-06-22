import { useMutation, useQuery } from "@vue/apollo-composable";
import { ref, watch, type Ref } from "vue";
import { GET_ACTIVE_CATEGORIES } from "@/graphql/queries";
import { CREATE_CATEGORY, UPDATE_CATEGORY, ARCHIVE_CATEGORY } from "@/graphql/mutations";
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
  name?: string;
  type?: CategoryType;
}

interface GetActiveCategoriesResponse {
  activeCategories: Category[];
}

interface CreateCategoryResponse {
  createCategory: Category;
}

interface UpdateCategoryResponse {
  updateCategory: Category;
}

interface ArchiveCategoryResponse {
  archiveCategory: Category;
}

export function useCategories(type?: CategoryType | Ref<CategoryType>) {
  const categoriesError = ref<string | null>(null);

  // Query for active categories (optionally filtered by type)
  const {
    result: categoriesResult,
    loading: categoriesLoading,
    error: categoriesQueryError,
    refetch: refetchCategories,
  } = useQuery<GetActiveCategoriesResponse>(GET_ACTIVE_CATEGORIES, () => ({
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
  } = useMutation<UpdateCategoryResponse, { id: string; input: UpdateCategoryInput }>(
    UPDATE_CATEGORY,
  );

  // Archive category mutation
  const {
    mutate: archiveCategoryMutation,
    loading: archiveCategoryLoading,
    error: archiveCategoryError,
  } = useMutation<ArchiveCategoryResponse, { id: string }>(ARCHIVE_CATEGORY);

  // Watch for query errors
  watch(categoriesQueryError, (error: ApolloError | null) => {
    if (error) {
      console.error("Categories query failed:", error);
      categoriesError.value = error.message || "Failed to fetch categories";
    }
  });

  // Watch for mutation errors
  watch(
    [createCategoryError, updateCategoryError, archiveCategoryError],
    ([createError, updateError, archiveError]) => {
      const error = createError || updateError || archiveError;
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
    input: UpdateCategoryInput,
  ): Promise<Category | null> => {
    try {
      categoriesError.value = null;
      const result = await updateCategoryMutation({ id, input });
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

  // Archive category function
  const archiveCategory = async (id: string): Promise<Category | null> => {
    try {
      categoriesError.value = null;
      const result = await archiveCategoryMutation({ id });
      if (result?.data?.archiveCategory) {
        await refetchCategories();
        return result.data.archiveCategory;
      }
      return null;
    } catch (error) {
      console.error("Error archiving category:", error);
      categoriesError.value = error instanceof Error ? error.message : "Failed to archive category";
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
    archiveCategoryLoading,

    // Error states
    categoriesError,
    categoriesQueryError,
    createCategoryError,
    updateCategoryError,
    archiveCategoryError,

    // Functions
    createCategory,
    updateCategory,
    archiveCategory,
    refetchCategories,
  };
}
