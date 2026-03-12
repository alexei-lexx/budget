export enum CategoryType {
  INCOME = "INCOME",
  EXPENSE = "EXPENSE",
}

export interface Category {
  userId: string; // Partition key (same pattern as Accounts)
  id: string; // Sort key - UUID v4
  name: string; // Category name (e.g., "Groceries", "Salary")
  type: CategoryType; // Category type (INCOME, EXPENSE)
  excludeFromReports: boolean; // Whether to exclude from monthly reports
  isArchived: boolean; // Soft delete flag
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}
