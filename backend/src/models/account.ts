export interface Account {
  id: string; // UUID v4 primary key
  userId: string; // Foreign key to User
  name: string; // Account name (e.g., "Cash", "Bank Account")
  currency: string; // ISO currency code (USD, EUR, etc.)
  initialBalance: number; // Starting balance
  isArchived: boolean; // Soft delete flag
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}
