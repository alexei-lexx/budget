import { jest } from "@jest/globals";
import { AccountService } from "../../../services/account-service";

export const createMockAccountService = (): jest.Mocked<AccountService> => ({
  getAccountsByUser: jest.fn(),
  calculateBalance: jest.fn(),
  createAccount: jest.fn(),
  updateAccount: jest.fn(),
  deleteAccount: jest.fn(),
});
