import { Account } from "../../models/account";

export interface AccountDto {
  currency: string;
  id: string;
  isArchived: boolean;
  name: string;
}

export const toAccountDto = (account: Account): AccountDto => ({
  currency: account.currency,
  id: account.id,
  isArchived: account.isArchived,
  name: account.name,
});
