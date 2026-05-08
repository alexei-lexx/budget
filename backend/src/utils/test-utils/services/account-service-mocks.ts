import { vi, type Mocked } from "vitest";
import { AccountService } from "../../../services/account-service";

export const createMockAccountService = (): Mocked<AccountService> => ({
  getAccountsByUser: vi.fn(),
  createAccount: vi.fn(),
  updateAccount: vi.fn(),
  deleteAccount: vi.fn(),
});
