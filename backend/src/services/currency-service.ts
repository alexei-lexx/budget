import { AccountRepository } from "../ports/account-repository";
import { SUPPORTED_CURRENCIES } from "../types/currency";

export interface CurrencyService {
  getSupportedCurrencies(params: { userId: string }): Promise<string[]>;
}

export class CurrencyServiceImpl implements CurrencyService {
  constructor(private accountRepository: AccountRepository) {}

  async getSupportedCurrencies({
    userId,
  }: {
    userId: string;
  }): Promise<string[]> {
    const accounts = await this.accountRepository.findManyByUserId(userId);

    const userCurrencies = [
      ...new Set(accounts.map((account) => account.currency)),
    ].sort();

    const userCurrencySet = new Set(userCurrencies);
    const tail = SUPPORTED_CURRENCIES.filter(
      (code) => !userCurrencySet.has(code),
    );

    return [...userCurrencies, ...tail];
  }
}
