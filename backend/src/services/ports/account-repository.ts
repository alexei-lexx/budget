import { Account } from "../../models/account";

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

export interface AccountRepository {
  findOneActiveById(id: string, userId: string): Promise<Account | null>;
  findManyActiveByUserId(userId: string): Promise<Account[]>;
  findManyByIds(ids: readonly string[], userId: string): Promise<Account[]>;
  findManyByUserId(userId: string): Promise<Account[]>;
  create(input: CreateAccountInput): Promise<Account>;
  update(
    id: string,
    userId: string,
    input: UpdateAccountInput,
  ): Promise<Account>;
  archive(id: string, userId: string): Promise<Account>;
}
