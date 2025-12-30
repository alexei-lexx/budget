export interface User {
  id: string; // UUID v4 primary key
  email: string; // Normalized lowercase email
  transactionPatternsLimit?: number; // Maximum number of transaction patterns
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export interface CreateUserInput {
  email: string;
}

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  create(input: CreateUserInput): Promise<User>;
  ensureUser(email: string): Promise<User>;
}
