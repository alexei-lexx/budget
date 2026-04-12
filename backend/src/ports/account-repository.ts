import { Account } from "../models/account";

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
  findOneById(selector: {
    id: string;
    userId: string;
  }): Promise<Account | null>;
  findManyByUserId(userId: string): Promise<Account[]>;
  findManyWithArchivedByIds(selector: {
    ids: readonly string[];
    userId: string;
  }): Promise<Account[]>;
  findManyWithArchivedByUserId(userId: string): Promise<Account[]>;
  create(input: CreateAccountInput): Promise<Account>;
  update(
    selector: { id: string; userId: string },
    input: UpdateAccountInput,
  ): Promise<Account>;
  archive(selector: { id: string; userId: string }): Promise<Account>;
}
