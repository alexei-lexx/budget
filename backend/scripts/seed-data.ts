#!/usr/bin/env ts-node

import { DeleteCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { CategoryType } from "../src/models/Category";
import { TransactionType } from "../src/models/Transaction";
import { AccountRepository } from "../src/repositories/AccountRepository";
import { CategoryRepository } from "../src/repositories/CategoryRepository";
import { TransactionRepository } from "../src/repositories/TransactionRepository";
import { UserRepository } from "../src/repositories/UserRepository";
import { createDynamoDBDocumentClient } from "../src/repositories/utils/dynamoClient";
import { TransactionService } from "../src/services/TransactionService";

// Initialize DynamoDB client
const dynamoClient = createDynamoDBDocumentClient();

// Initialize repositories
const userRepository = new UserRepository();
const accountRepository = new AccountRepository();
const categoryRepository = new CategoryRepository();
const transactionRepository = new TransactionRepository();

// Initialize services
const transactionService = new TransactionService(
  accountRepository,
  categoryRepository,
  transactionRepository,
);

/**
 * Truncate all tables to clear existing data
 */
async function truncateTables(): Promise<void> {
  console.log("Clearing existing data...\n");

  const tables = [
    process.env.TRANSACTIONS_TABLE_NAME,
    process.env.CATEGORIES_TABLE_NAME,
    process.env.ACCOUNTS_TABLE_NAME,
  ];

  for (const tableName of tables) {
    if (!tableName) continue;

    try {
      const scanCommand = new ScanCommand({ TableName: tableName });
      const result = await dynamoClient.send(scanCommand);

      if (result.Items && result.Items.length > 0) {
        for (const item of result.Items) {
          // Get primary keys from item based on table structure
          let deleteCommand;
          if (tableName === process.env.USERS_TABLE_NAME) {
            deleteCommand = new DeleteCommand({
              TableName: tableName,
              Key: { id: item.id },
            });
          } else {
            // Accounts, Categories, Transactions all use userId + id
            deleteCommand = new DeleteCommand({
              TableName: tableName,
              Key: { userId: item.userId, id: item.id },
            });
          }
          await dynamoClient.send(deleteCommand);
        }
        console.log(`✓ Cleared ${tableName}`);
      }
    } catch (error) {
      console.error(`Failed to clear ${tableName}:`, error);
    }
  }

  console.log();
}

/**
 * Create 2 sample accounts (EUR)
 */
async function createAccounts(userId: string): Promise<string[]> {
  console.log("Creating 2 sample accounts (EUR)...");

  const accountsConfig = [
    {
      name: "Cash",
      currency: "EUR",
      initialBalance: 5000,
    },
    {
      name: "Bank",
      currency: "EUR",
      initialBalance: 15000,
    },
  ];

  const accountIds: string[] = [];
  for (const config of accountsConfig) {
    const account = await accountRepository.create({
      userId,
      name: config.name,
      currency: config.currency,
      initialBalance: config.initialBalance,
    });
    accountIds.push(account.id);
    console.log(`✓ Created account: ${account.name} (${account.currency})`);
  }

  return accountIds;
}

/**
 * Create 3 income and 3 expense categories
 */
async function createCategories(userId: string): Promise<{
  income: string[];
  expense: string[];
}> {
  console.log("Creating 6 sample categories (3 income, 3 expense)...");

  const incomeNames = ["Salary", "Freelance Work", "Investment Returns"];
  const expenseNames = ["Groceries", "Utilities", "Entertainment"];

  const categoryIds = {
    income: [] as string[],
    expense: [] as string[],
  };

  // Create income categories
  for (const name of incomeNames) {
    const category = await categoryRepository.create({
      userId,
      name,
      type: CategoryType.INCOME,
    });
    categoryIds.income.push(category.id);
    console.log(`✓ Created income category: ${name}`);
  }

  // Create expense categories
  for (const name of expenseNames) {
    const category = await categoryRepository.create({
      userId,
      name,
      type: CategoryType.EXPENSE,
    });
    categoryIds.expense.push(category.id);
    console.log(`✓ Created expense category: ${name}`);
  }

  return categoryIds;
}

/**
 * Create transactions for each month (2 income, 18 expense)
 */
async function createTransactions(
  userId: string,
  accountIds: string[],
  categoryIds: { income: string[]; expense: string[] },
): Promise<void> {
  console.log("Creating sample transactions for current and previous month...");

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const months = [
    { year: previousYear, month: previousMonth, label: "previous" },
    { year: currentYear, month: currentMonth, label: "current" },
  ];

  // Expense category descriptions - descriptions match the category name
  const expenseDescriptions = {
    Groceries: [
      "Carrefour",
      "Local market fresh produce and weekly groceries",
      "Boulangerie",
      "Supermarket shopping",
    ],
    Utilities: [
      "Electricity bill",
      "Water and gas utilities monthly payment",
      "Internet provider",
    ],
    Entertainment: [
      "Cinema tickets",
      "Streaming service subscription Netflix annual",
      "Restaurant dinner",
      "Drinks at bar",
    ],
  };

  // Map expense category IDs to their names
  const expenseNames = ["Groceries", "Utilities", "Entertainment"];
  const categoryIdToName: Record<string, string> = {};
  categoryIds.expense.forEach((id, index) => {
    categoryIdToName[id] = expenseNames[index];
  });

  for (const monthData of months) {
    console.log(
      `\nCreating transactions for ${monthData.label} month (${monthData.month + 1}/${monthData.year})...`,
    );

    // Create 2 income transactions
    for (let i = 0; i < 2; i++) {
      const categoryId =
        categoryIds.income[
          Math.floor(Math.random() * categoryIds.income.length)
        ];
      const accountId =
        accountIds[Math.floor(Math.random() * accountIds.length)];

      // Generate random date within the month
      const daysInMonth = new Date(
        monthData.year,
        monthData.month + 1,
        0,
      ).getDate();
      const day = Math.floor(Math.random() * daysInMonth) + 1;
      const date = new Date(monthData.year, monthData.month, day);
      const dateString = date.toISOString().split("T")[0];

      // Generate random income amount
      const amount = Math.round((Math.random() * 4000 + 500) * 100) / 100; // €500-€4500

      await transactionService.createTransaction(
        {
          accountId,
          categoryId,
          type: TransactionType.INCOME,
          amount,
          date: dateString,
        },
        userId,
      );
    }

    // Create 18 expense transactions
    for (let i = 0; i < 18; i++) {
      const categoryIndex = Math.floor(
        Math.random() * categoryIds.expense.length,
      );
      const categoryId = categoryIds.expense[categoryIndex];
      const accountId =
        accountIds[Math.floor(Math.random() * accountIds.length)];

      // Generate random date within the month
      const daysInMonth = new Date(
        monthData.year,
        monthData.month + 1,
        0,
      ).getDate();
      const day = Math.floor(Math.random() * daysInMonth) + 1;
      const date = new Date(monthData.year, monthData.month, day);
      const dateString = date.toISOString().split("T")[0];

      // Generate random expense amount
      const amount = Math.round((Math.random() * 300 + 10) * 100) / 100; // €10-€310

      // Get description based on the specific category
      const categoryName = categoryIdToName[categoryId];
      const categoryDescriptions =
        expenseDescriptions[categoryName as keyof typeof expenseDescriptions];
      const description =
        Math.random() < 0.45
          ? categoryDescriptions[
              Math.floor(Math.random() * categoryDescriptions.length)
            ]
          : undefined;

      await transactionService.createTransaction(
        {
          accountId,
          categoryId,
          type: TransactionType.EXPENSE,
          amount,
          date: dateString,
          ...(description && { description }),
        },
        userId,
      );
    }

    console.log(
      `✓ Created 20 transactions for ${monthData.label} month (2 income, 18 expense)`,
    );
  }
}

/**
 * Main seed function
 */
async function main() {
  try {
    // Validate environment
    if (process.env.NODE_ENV !== "development") {
      console.error(
        "❌ Error: Database seeding is only allowed in development mode",
      );
      console.error(
        `Current environment: ${process.env.NODE_ENV || "unknown"}`,
      );
      console.error("Set NODE_ENV=development to run this script");
      process.exit(1);
    }

    console.log("Starting database seed...\n");

    // Truncate existing data
    await truncateTables();

    // Get existing users
    console.log("Fetching existing users from database...\n");
    const users = await userRepository.findAll();

    if (users.length === 0) {
      console.warn("⚠️  No users found in the database");
      console.warn("Please create users through Auth0 login first.\n");
      console.log("ℹ️  To seed data, please:");
      console.log("  1. Start the backend: npm run dev");
      console.log("  2. Log in with Auth0 at the frontend");
      console.log("  3. Run: npm run db:seed");
      process.exit(0);
    }

    console.log(`Found ${users.length} user(s) in the database:\n`);
    users.forEach((user) => {
      console.log(`  • ${user.email || user.auth0UserId} (ID: ${user.id})`);
    });
    console.log();

    // Create sample data for each user
    for (const user of users) {
      console.log(
        `\n📊 Creating sample data for user: ${user.email || user.auth0UserId}`,
      );
      console.log("─".repeat(60));

      const accountIds = await createAccounts(user.id);
      const categoryIds = await createCategories(user.id);
      await createTransactions(user.id, accountIds, categoryIds);

      console.log(`✓ Completed for user: ${user.email || user.auth0UserId}\n`);
    }

    console.log("✓ Database seeding completed successfully!");
    console.log(`\n✓ Created sample data for ${users.length} user(s)`);
  } catch (error: unknown) {
    console.error("❌ Error seeding database:", error);
    if (typeof error === "object" && error !== null && "message" in error) {
      console.error("Details:", (error as Error).message);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
