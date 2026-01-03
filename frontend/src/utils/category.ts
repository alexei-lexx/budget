import type { CategoryType } from "@/composables/useCategories";

// Helper functions for category icons
export const getCategoryIcon = (type: CategoryType) => {
  return type === "INCOME" ? "mdi-cash-plus" : "mdi-cash-minus";
};

export const getCategoryIconColor = (type: CategoryType) => {
  return type === "INCOME" ? "success" : "error";
};
