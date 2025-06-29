import { ref, computed } from "vue";
import { useAccounts, type Account } from "./useAccounts";
import { useCategories, type Category, type CategoryType } from "./useCategories";

export type TransactionType = CategoryType;

export interface Transaction {
  id: string;
  accountId: string;
  categoryId?: string;
  type: TransactionType;
  amount: number;
  currency: string;
  date: string; // YYYY-MM-DD format
  description?: string;
}

export interface CreateTransactionInput {
  accountId: string;
  categoryId?: string;
  type: TransactionType;
  amount: number;
  date: string;
  description?: string;
}

export interface UpdateTransactionInput {
  accountId?: string;
  categoryId?: string;
  type?: TransactionType;
  amount?: number;
  date?: string;
  description?: string;
}

// Internal interface for mock service (includes fields not exposed to users)
interface InternalTransaction extends Transaction {
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

// Mock transaction service using localStorage for persistence
class MockTransactionService {
  private storageKey = "mock_transactions";

  private loadTransactions(): InternalTransaction[] {
    const stored = localStorage.getItem(this.storageKey);
    return stored ? JSON.parse(stored) : [];
  }

  private saveTransactions(transactions: InternalTransaction[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(transactions));
  }

  private generateId(): string {
    return crypto.randomUUID();
  }

  private validateTransaction(
    input: CreateTransactionInput | UpdateTransactionInput,
    accounts: Account[],
    categories: Category[],
  ): string | null {
    // Validate amount
    if (input.amount !== undefined && input.amount < 0) {
      return "Amount cannot be negative";
    }

    // Validate account exists
    if (input.accountId !== undefined) {
      const account = accounts.find((a) => a.id === input.accountId);
      if (!account) {
        return "Invalid account selected";
      }
    }

    // Validate category exists if provided
    if (input.categoryId !== undefined && input.categoryId !== "") {
      const category = categories.find((c) => c.id === input.categoryId);
      if (!category) {
        return "Invalid category selected";
      }

      // Validate category type matches transaction type
      if (input.type !== undefined && category.type !== input.type) {
        return `Category type (${category.type}) must match transaction type (${input.type})`;
      }
    }

    // Validate date format
    if (input.date !== undefined) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(input.date)) {
        return "Date must be in YYYY-MM-DD format";
      }
    }

    return null;
  }

  getTransactions(): Transaction[] {
    return this.loadTransactions()
      .filter((t) => !t.isArchived)
      .map((t) => ({
        id: t.id,
        accountId: t.accountId,
        categoryId: t.categoryId,
        type: t.type,
        amount: t.amount,
        currency: t.currency,
        date: t.date,
        description: t.description,
      }));
  }

  createTransaction(
    input: CreateTransactionInput,
    accounts: Account[],
    categories: Category[],
  ): { transaction: Transaction | null; error: string | null } {
    const validationError = this.validateTransaction(input, accounts, categories);
    if (validationError) {
      return { transaction: null, error: validationError };
    }

    // Account existence already validated above, safe to find
    const account = accounts.find((a) => a.id === input.accountId)!;

    const now = new Date().toISOString();
    const internalTransaction: InternalTransaction = {
      id: this.generateId(),
      accountId: input.accountId,
      categoryId: input.categoryId || undefined,
      type: input.type,
      amount: input.amount,
      currency: account.currency,
      date: input.date,
      description: input.description || undefined,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    };

    const transactions = this.loadTransactions();
    transactions.push(internalTransaction);
    this.saveTransactions(transactions);

    // Return only public fields
    const publicTransaction: Transaction = {
      id: internalTransaction.id,
      accountId: internalTransaction.accountId,
      categoryId: internalTransaction.categoryId,
      type: internalTransaction.type,
      amount: internalTransaction.amount,
      currency: internalTransaction.currency,
      date: internalTransaction.date,
      description: internalTransaction.description,
    };

    return { transaction: publicTransaction, error: null };
  }

  updateTransaction(
    id: string,
    input: UpdateTransactionInput,
    accounts: Account[],
    categories: Category[],
  ): { transaction: Transaction | null; error: string | null } {
    const transactions = this.loadTransactions();
    const transactionIndex = transactions.findIndex((t) => t.id === id);

    if (transactionIndex === -1) {
      return { transaction: null, error: "Transaction not found" };
    }

    const existingTransaction = transactions[transactionIndex];
    const mergedInput = { ...existingTransaction, ...input };

    const validationError = this.validateTransaction(mergedInput, accounts, categories);
    if (validationError) {
      return { transaction: null, error: validationError };
    }

    // Update currency if account changed
    if (input.accountId) {
      const account = accounts.find((a) => a.id === input.accountId);
      if (account) {
        mergedInput.currency = account.currency;
      }
    }

    const updatedInternalTransaction: InternalTransaction = {
      ...existingTransaction,
      ...input,
      currency: mergedInput.currency,
      updatedAt: new Date().toISOString(),
    };

    transactions[transactionIndex] = updatedInternalTransaction;
    this.saveTransactions(transactions);

    // Return only public fields
    const publicTransaction: Transaction = {
      id: updatedInternalTransaction.id,
      accountId: updatedInternalTransaction.accountId,
      categoryId: updatedInternalTransaction.categoryId,
      type: updatedInternalTransaction.type,
      amount: updatedInternalTransaction.amount,
      currency: updatedInternalTransaction.currency,
      date: updatedInternalTransaction.date,
      description: updatedInternalTransaction.description,
    };

    return { transaction: publicTransaction, error: null };
  }

  archiveTransaction(id: string): { success: boolean; error: string | null } {
    const transactions = this.loadTransactions();
    const transactionIndex = transactions.findIndex((t) => t.id === id);

    if (transactionIndex === -1) {
      return { success: false, error: "Transaction not found" };
    }

    transactions[transactionIndex].isArchived = true;
    transactions[transactionIndex].updatedAt = new Date().toISOString();
    this.saveTransactions(transactions);

    return { success: true, error: null };
  }

  // Helper method to create initial mock data with real account and category IDs
  async createInitialMockData(
    accounts: Account[],
    categories: Category[],
    force = false,
  ): Promise<void> {
    const existingTransactions = this.loadTransactions();
    if (existingTransactions.length > 0 && !force) {
      return; // Already has data
    }

    if (accounts.length === 0 || categories.length === 0) {
      return; // Need accounts and categories first
    }

    const mockTransactions: Omit<InternalTransaction, "id" | "createdAt" | "updatedAt">[] = [];
    const now = new Date();

    // Get first account and some categories for sample data
    const primaryAccount = accounts[0];
    const incomeCategories = categories.filter((c) => c.type === "INCOME");
    const expenseCategories = categories.filter((c) => c.type === "EXPENSE");

    // Recent transactions (last few days - current year)
    mockTransactions.push({
      accountId: primaryAccount.id,
      type: "EXPENSE",
      amount: 25.0,
      currency: primaryAccount.currency,
      date: new Date().toISOString().split("T")[0], // Today
      isArchived: false,
    });

    mockTransactions.push({
      accountId: primaryAccount.id,
      type: "EXPENSE",
      amount: 8.5,
      currency: primaryAccount.currency,
      date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 1 day ago
      isArchived: false,
    });

    mockTransactions.push({
      accountId: primaryAccount.id,
      type: "EXPENSE",
      amount: 42.9,
      currency: primaryAccount.currency,
      date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 2 days ago
      isArchived: false,
    });

    mockTransactions.push({
      accountId: primaryAccount.id,
      type: "EXPENSE",
      amount: 15.75,
      currency: primaryAccount.currency,
      date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 3 days ago
      isArchived: false,
    });

    // Income transactions
    if (incomeCategories.length > 0) {
      mockTransactions.push({
        accountId: primaryAccount.id,
        categoryId: incomeCategories[0].id,
        type: "INCOME",
        amount: 3500.0,
        currency: primaryAccount.currency,
        date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 5 days ago
        isArchived: false,
      });

      if (incomeCategories.length > 1) {
        mockTransactions.push({
          accountId: primaryAccount.id,
          categoryId: incomeCategories[1].id,
          type: "INCOME",
          amount: 500.0,
          currency: primaryAccount.currency,
          date: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 10 days ago
          description: "Freelance project",
          isArchived: false,
        });
      }
    }

    // More recent expenses
    if (expenseCategories.length > 0) {
      mockTransactions.push({
        accountId: primaryAccount.id,
        categoryId: expenseCategories[0].id,
        type: "EXPENSE",
        amount: 127.3,
        currency: primaryAccount.currency,
        date: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 1 week ago
        isArchived: false,
      });

      mockTransactions.push({
        accountId: primaryAccount.id,
        categoryId: expenseCategories[0].id,
        type: "EXPENSE",
        amount: 89.45,
        currency: primaryAccount.currency,
        date: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 12 days ago
        isArchived: false,
      });
    }

    // Current year transactions from earlier months
    if (expenseCategories.length > 0) {
      mockTransactions.push({
        accountId: primaryAccount.id,
        categoryId: expenseCategories[0].id,
        type: "EXPENSE",
        amount: 85.5,
        currency: primaryAccount.currency,
        date: new Date(2024, 10, 15).toISOString().split("T")[0], // Nov 15, 2024
        isArchived: false,
      });

      mockTransactions.push({
        accountId: primaryAccount.id,
        categoryId: expenseCategories[0].id,
        type: "EXPENSE",
        amount: 45.2,
        currency: primaryAccount.currency,
        date: new Date(2024, 9, 8).toISOString().split("T")[0], // Oct 8, 2024
        isArchived: false,
      });

      mockTransactions.push({
        accountId: primaryAccount.id,
        type: "EXPENSE",
        amount: 234.67,
        currency: primaryAccount.currency,
        date: new Date(2024, 8, 22).toISOString().split("T")[0], // Sep 22, 2024
        description: "Online shopping",
        isArchived: false,
      });

      if (expenseCategories.length > 1) {
        mockTransactions.push({
          accountId: primaryAccount.id,
          categoryId: expenseCategories[1].id,
          type: "EXPENSE",
          amount: 1200.0,
          currency: primaryAccount.currency,
          date: new Date(2024, 7, 1).toISOString().split("T")[0], // Aug 1, 2024
          description: "Monthly rent payment",
          isArchived: false,
        });

        mockTransactions.push({
          accountId: primaryAccount.id,
          categoryId: expenseCategories[1].id,
          type: "EXPENSE",
          amount: 78.9,
          currency: primaryAccount.currency,
          date: new Date(2024, 6, 12).toISOString().split("T")[0], // Jul 12, 2024
          isArchived: false,
        });
      }
    }

    // More income transactions
    if (incomeCategories.length > 0) {
      mockTransactions.push({
        accountId: primaryAccount.id,
        categoryId: incomeCategories[0].id,
        type: "INCOME",
        amount: 3200.0,
        currency: primaryAccount.currency,
        date: new Date(2024, 5, 5).toISOString().split("T")[0], // Jun 5, 2024
        isArchived: false,
      });

      mockTransactions.push({
        accountId: primaryAccount.id,
        type: "INCOME",
        amount: 125.5,
        currency: primaryAccount.currency,
        date: new Date(2024, 4, 18).toISOString().split("T")[0], // May 18, 2024
        description: "Tax refund",
        isArchived: false,
      });
    }

    // Previous year transactions (should show year)
    mockTransactions.push({
      accountId: primaryAccount.id,
      type: "EXPENSE",
      amount: 156.78,
      currency: primaryAccount.currency,
      date: new Date(2023, 11, 25).toISOString().split("T")[0], // Dec 25, 2023
      description: "Holiday shopping",
      isArchived: false,
    });

    if (incomeCategories.length > 0) {
      mockTransactions.push({
        accountId: primaryAccount.id,
        categoryId: incomeCategories[0].id,
        type: "INCOME",
        amount: 2800.0,
        currency: primaryAccount.currency,
        date: new Date(2023, 6, 15).toISOString().split("T")[0], // Jul 15, 2023
        isArchived: false,
      });
    }

    if (expenseCategories.length > 0) {
      mockTransactions.push({
        accountId: primaryAccount.id,
        categoryId: expenseCategories[0].id,
        type: "EXPENSE",
        amount: 67.3,
        currency: primaryAccount.currency,
        date: new Date(2022, 2, 10).toISOString().split("T")[0], // Mar 10, 2022
        isArchived: false,
      });

      mockTransactions.push({
        accountId: primaryAccount.id,
        type: "EXPENSE",
        amount: 95.2,
        currency: primaryAccount.currency,
        date: new Date(2023, 3, 22).toISOString().split("T")[0], // Apr 22, 2023
        isArchived: false,
      });

      mockTransactions.push({
        accountId: primaryAccount.id,
        categoryId: expenseCategories[0].id,
        type: "EXPENSE",
        amount: 189.5,
        currency: primaryAccount.currency,
        date: new Date(2021, 8, 14).toISOString().split("T")[0], // Sep 14, 2021
        description: "Annual subscription",
        isArchived: false,
      });
    }

    // Create transactions with IDs and timestamps
    const timestamp = new Date().toISOString();
    const fullTransactions: InternalTransaction[] = mockTransactions.map((tx) => ({
      ...tx,
      id: this.generateId(),
      createdAt: timestamp,
      updatedAt: timestamp,
    }));

    this.saveTransactions(fullTransactions);
  }
}

const mockTransactionService = new MockTransactionService();

export function useTransactions() {
  const { accounts } = useAccounts();
  const { categories } = useCategories();

  const transactionsError = ref<string | null>(null);
  const transactionsLoading = ref(false);
  const transactionsRefreshTrigger = ref(0);

  // Get transactions from mock service
  const transactions = computed(() => {
    // Access the trigger to make this computed reactive to manual updates
    transactionsRefreshTrigger.value;
    
    try {
      return mockTransactionService
        .getTransactions()
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
      console.error("Error loading transactions:", error);
      return [];
    }
  });

  // Initialize mock data when accounts and categories are available
  const initializeMockData = async () => {
    if (accounts.value?.activeAccounts && categories.value?.activeCategories) {
      try {
        await mockTransactionService.createInitialMockData(
          accounts.value.activeAccounts,
          categories.value.activeCategories,
        );
      } catch (error) {
        console.error("Error initializing mock data:", error);
      }
    }
  };

  // Force regenerate mock data (clear existing and create new)
  const regenerateMockData = async () => {
    if (accounts.value?.activeAccounts && categories.value?.activeCategories) {
      try {
        await mockTransactionService.createInitialMockData(
          accounts.value.activeAccounts,
          categories.value.activeCategories,
          true, // force regeneration
        );
        // Trigger reactivity update
        transactionsRefreshTrigger.value++;
      } catch (error) {
        console.error("Error regenerating mock data:", error);
      }
    }
  };

  // Create transaction function
  const createTransaction = async (input: CreateTransactionInput): Promise<boolean> => {
    if (!accounts.value?.activeAccounts || !categories.value?.activeCategories) {
      transactionsError.value = "Accounts and categories must be loaded first";
      return false;
    }

    try {
      transactionsError.value = null;
      transactionsLoading.value = true;

      const result = mockTransactionService.createTransaction(
        input,
        accounts.value.activeAccounts,
        categories.value.activeCategories,
      );

      if (result.error) {
        transactionsError.value = result.error;
        return false;
      }

      // Trigger reactivity update
      transactionsRefreshTrigger.value++;
      
      return true;
    } catch (error) {
      console.error("Error creating transaction:", error);
      transactionsError.value =
        error instanceof Error ? error.message : "Failed to create transaction";
      return false;
    } finally {
      transactionsLoading.value = false;
    }
  };

  // Update transaction function
  const updateTransaction = async (
    id: string,
    input: UpdateTransactionInput,
  ): Promise<boolean> => {
    if (!accounts.value?.activeAccounts || !categories.value?.activeCategories) {
      transactionsError.value = "Accounts and categories must be loaded first";
      return false;
    }

    try {
      transactionsError.value = null;
      transactionsLoading.value = true;

      const result = mockTransactionService.updateTransaction(
        id,
        input,
        accounts.value.activeAccounts,
        categories.value.activeCategories,
      );

      if (result.error) {
        transactionsError.value = result.error;
        return false;
      }

      // Trigger reactivity update
      transactionsRefreshTrigger.value++;

      return true;
    } catch (error) {
      console.error("Error updating transaction:", error);
      transactionsError.value =
        error instanceof Error ? error.message : "Failed to update transaction";
      return false;
    } finally {
      transactionsLoading.value = false;
    }
  };

  // Archive transaction function
  const archiveTransaction = async (id: string): Promise<boolean> => {
    try {
      transactionsError.value = null;
      transactionsLoading.value = true;

      const result = mockTransactionService.archiveTransaction(id);

      if (result.error) {
        transactionsError.value = result.error;
        return false;
      }

      // Trigger reactivity update
      transactionsRefreshTrigger.value++;

      return result.success;
    } catch (error) {
      console.error("Error archiving transaction:", error);
      transactionsError.value =
        error instanceof Error ? error.message : "Failed to archive transaction";
      return false;
    } finally {
      transactionsLoading.value = false;
    }
  };

  return {
    // Data
    transactions,

    // Loading states
    transactionsLoading,

    // Error states
    transactionsError,

    // Functions
    createTransaction,
    updateTransaction,
    archiveTransaction,
    initializeMockData,
    regenerateMockData,
  };
}
