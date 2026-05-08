import { type Mocked, vi } from "vitest";
import { TransactionService } from "../../../services/transaction-service";

export const createMockTransactionService = (): Mocked<TransactionService> => ({
  getTransactionById: vi.fn(),
  getTransactionsByUser: vi.fn(),
  getTransactionPatterns: vi.fn(),
  getDescriptionSuggestions: vi.fn(),
  createTransaction: vi.fn(),
  updateTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
});
