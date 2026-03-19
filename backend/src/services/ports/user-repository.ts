import { User } from "../../models/user";

export interface CreateUserInput {
  email: string;
}

export interface UpdateUserInput {
  voiceInputLanguage?: string;
  transactionPatternsLimit?: number;
}

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  create(input: CreateUserInput): Promise<User>;
  ensureUser(email: string): Promise<User>;
  update(id: string, input: UpdateUserInput): Promise<User>;
}
