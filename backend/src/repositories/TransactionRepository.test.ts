import { TransactionRepository } from "./TransactionRepository";
import { TransactionType, CreateTransactionInput } from "../models/Transaction";

describe("TransactionRepository", () => {
  let repository: TransactionRepository;

  beforeAll(async () => {
    // Create repository instance
    repository = new TransactionRepository();
  });

  describe("create", () => {
    it("should create a transaction successfully", async () => {
      // Arrange
      const userId = "test-user-123";
      const accountId = "test-account-456";
      const input: CreateTransactionInput = {
        userId,
        accountId,
        type: TransactionType.INCOME,
        amount: 100.5,
        currency: "USD",
        date: "2024-01-15",
        description: "Test transaction",
        categoryId: "test-category-789",
      };

      // Act
      const result = await repository.create(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.userId).toBe(userId);
      expect(result.accountId).toBe(accountId);
      expect(result.type).toBe(TransactionType.INCOME);
      expect(result.amount).toBe(100.5);
      expect(result.currency).toBe("USD");
      expect(result.date).toBe("2024-01-15");
      expect(result.description).toBe("Test transaction");
      expect(result.categoryId).toBe("test-category-789");
      expect(result.isArchived).toBe(false);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
      expect(result.createdAt).toBe(result.updatedAt);

      // Verify UUID format
      expect(result.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );

      // Verify ISO timestamp format
      expect(result.createdAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );

      // Refetch from database to verify stored data
      const stored = await repository.findById(result.id, userId);
      expect(stored).toBeDefined();
      expect(stored?.id).toBe(result.id);
      expect(stored?.userId).toBe(userId);
      expect(stored?.accountId).toBe(accountId);
      expect(stored?.type).toBe(TransactionType.INCOME);
      expect(stored?.amount).toBe(100.5);
      expect(stored?.currency).toBe("USD");
      expect(stored?.date).toBe("2024-01-15");
      expect(stored?.description).toBe("Test transaction");
      expect(stored?.categoryId).toBe("test-category-789");
      expect(stored?.isArchived).toBe(false);
    });

    it("should create transaction without optional fields", async () => {
      // Arrange
      const userId = "test-user-456";
      const accountId = "test-account-789";
      const input: CreateTransactionInput = {
        userId,
        accountId,
        type: TransactionType.EXPENSE,
        amount: 50.25,
        currency: "EUR",
        date: "2024-01-16",
      };

      // Act
      const result = await repository.create(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.userId).toBe(userId);
      expect(result.accountId).toBe(accountId);
      expect(result.type).toBe(TransactionType.EXPENSE);
      expect(result.amount).toBe(50.25);
      expect(result.currency).toBe("EUR");
      expect(result.date).toBe("2024-01-16");
      expect(result.description).toBeUndefined();
      expect(result.categoryId).toBeUndefined();
      expect(result.transferId).toBeUndefined();
      expect(result.isArchived).toBe(false);

      // Refetch from database to verify stored data
      const stored = await repository.findById(result.id, userId);
      expect(stored).toBeDefined();
      expect(stored?.id).toBe(result.id);
      expect(stored?.type).toBe(TransactionType.EXPENSE);
      expect(stored?.amount).toBe(50.25);
      expect(stored?.currency).toBe("EUR");
      expect(stored?.description).toBeUndefined();
      expect(stored?.categoryId).toBeUndefined();
    });

    it("should create transfer transaction with transferId", async () => {
      // Arrange
      const userId = "test-user-789";
      const accountId = "test-account-abc";
      const transferId = "transfer-123";
      const input: CreateTransactionInput = {
        userId,
        accountId,
        type: TransactionType.TRANSFER_OUT,
        amount: 200.0,
        currency: "GBP",
        date: "2024-01-17",
        transferId,
        description: "Transfer to savings",
      };

      // Act
      const result = await repository.create(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.transferId).toBe(transferId);
      expect(result.type).toBe(TransactionType.TRANSFER_OUT);
      expect(result.amount).toBe(200.0);
      expect(result.currency).toBe("GBP");

      // Refetch from database to verify stored data
      const stored = await repository.findById(result.id, userId);
      expect(stored).toBeDefined();
      expect(stored?.id).toBe(result.id);
      expect(stored?.transferId).toBe(transferId);
      expect(stored?.type).toBe(TransactionType.TRANSFER_OUT);
      expect(stored?.amount).toBe(200.0);
      expect(stored?.currency).toBe("GBP");
    });
  });
});
