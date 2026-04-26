import { AccountEntity } from "../models/account";

export interface AccountRepository {
  findOneById(selector: {
    id: string;
    userId: string;
  }): Promise<AccountEntity | null>;
  findManyByUserId(userId: string): Promise<AccountEntity[]>;
  findManyWithArchivedByIds(selector: {
    ids: readonly string[];
    userId: string;
  }): Promise<AccountEntity[]>;
  findManyWithArchivedByUserId(userId: string): Promise<AccountEntity[]>;
  create(account: Readonly<AccountEntity>): Promise<void>;
  update(account: Readonly<AccountEntity>): Promise<AccountEntity>;
}
