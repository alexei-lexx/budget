import { Account } from "../models/account";

export interface AccountRepository {
  findOneById(selector: {
    id: string;
    userId: string;
  }): Promise<Account | null>;
  findOneWithArchivedById(selector: {
    id: string;
    userId: string;
  }): Promise<Account | null>;
  findManyByUserId(userId: string): Promise<Account[]>;
  findManyWithArchivedByIds(selector: {
    ids: readonly string[];
    userId: string;
  }): Promise<Account[]>;
  findManyWithArchivedByUserId(userId: string): Promise<Account[]>;
  create(account: Readonly<Account>): Promise<void>;
  update(account: Readonly<Account>): Promise<Account>;
}
