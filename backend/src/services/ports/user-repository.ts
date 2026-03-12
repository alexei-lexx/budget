import { User } from "../../models/user";

export interface CreateUserInput {
  email: string;
}

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  create(input: CreateUserInput): Promise<User>;
  ensureUser(email: string): Promise<User>;
}
