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

export interface CreateAccountInput {
  userId: string;
  name: string;
  currency: string;
  initialBalance: number;
}

export interface UpdateAccountInput {
  name?: string;
  currency?: string;
  initialBalance?: number;
}

export interface IAccountRepository {
  findActiveByUserId(userId: string): Promise<Account[]>;
  findActiveById(id: string, userId: string): Promise<Account | null>;
  create(input: CreateAccountInput): Promise<Account>;
  update(
    id: string,
    userId: string,
    input: UpdateAccountInput,
  ): Promise<Account>;
  archive(id: string, userId: string): Promise<Account>;
}
