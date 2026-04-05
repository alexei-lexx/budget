import { User } from "../../models/user";

export interface CreateUserInput {
  email: string;
}

export interface UpdateUserInput {
  transactionPatternsLimit?: number;
  voiceInputLanguage?: string;
}

export interface UserRepository {
  findOneByEmail(email: string): Promise<User | null>;
  findOneById(id: string): Promise<User | null>;
  findMany(): Promise<User[]>;
  create(input: CreateUserInput): Promise<User>;
  ensureUser(email: string): Promise<User>;
  update(id: string, input: UpdateUserInput): Promise<User>;
}
