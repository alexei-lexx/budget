import { jest } from "@jest/globals";
import { TransactionService } from "../../../services/transaction-service";

export const createMockTransactionService =
  (): jest.Mocked<TransactionService> => ({
    getTransactionById: jest.fn(),
    getTransactionsByUser: jest.fn(),
    getTransactionPatterns: jest.fn(),
    getDescriptionSuggestions: jest.fn(),
    createTransaction: jest.fn(),
    updateTransaction: jest.fn(),
    deleteTransaction: jest.fn(),
  });
