export interface User {
  id: string; // UUID v4 primary key
  email: string; // Normalized lowercase email
  transactionPatternsLimit?: number; // Maximum number of transaction patterns
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}
