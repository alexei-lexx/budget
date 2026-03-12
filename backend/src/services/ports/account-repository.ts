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

export interface IAccountRepository {
  findActiveByUserId(userId: string): Promise<Account[]>;
  findAllByUserId(userId: string): Promise<Account[]>;
  findActiveById(id: string, userId: string): Promise<Account | null>;
  findByIds(ids: readonly string[], userId: string): Promise<Account[]>;
  create(input: CreateAccountInput): Promise<Account>;
  update(
    id: string,
    userId: string,
    input: UpdateAccountInput,
  ): Promise<Account>;
  archive(id: string, userId: string): Promise<Account>;
}
