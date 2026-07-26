import { User } from "../models/user";

export interface UserRepository {
  findOneByEmail(email: string): Promise<User | null>;
  findOneById(id: string): Promise<User | null>;
  findMany(): Promise<User[]>;
  create(user: Readonly<User>): Promise<void>;
  update(user: Readonly<User>): Promise<void>;
}
