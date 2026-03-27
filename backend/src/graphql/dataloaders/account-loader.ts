import DataLoader from "dataloader";
import { Account } from "../../models/account";
import { AccountRepository } from "../../services/ports/account-repository";
import { TransactionEmbeddedAccount } from "../embedded-types";

export type { TransactionEmbeddedAccount };

const createStubAccount = (id: string): TransactionEmbeddedAccount => ({
  id,
  name: "Unknown",
  isArchived: false,
});

/**
 * Batch load accounts by their IDs
 * Deduplicates IDs and returns results in the same order as input
 * Always returns account data (either real or stub with name "Unknown")
 *
 * @param accountIds - Array of account IDs to batch load
 * @param accountRepository - Repository instance for account lookups
 * @param userId - Authenticated user ID for authorization scoping
 * @returns Array of accounts or stub data, in same order as input IDs
 */
export async function batchLoadAccounts(
  accountIds: readonly string[],
  accountRepository: AccountRepository,
  userId: string,
): Promise<TransactionEmbeddedAccount[]> {
  if (accountIds.length === 0) {
    return [];
  }

  // Deduplicate IDs while preserving original order mapping
  const uniqueIds = Array.from(new Set(accountIds));

  try {
    // Fetch all accounts in a single batch operation (including archived items)
    const accounts = await accountRepository.findManyByIds(uniqueIds, userId);

    // Create a map of ID to account (repository returns arbitrary order)
    const accountMap = new Map<string, Account>();
    accounts.forEach((account) => {
      accountMap.set(account.id, account);
    });

    // Return results in original order, converting to embedded type
    return accountIds.map((id) => {
      const account = accountMap.get(id);

      if (!account) {
        // Log warning for missing accounts (data consistency edge case)
        console.warn(`Missing account ${id} for transaction context`);
        // Return stub data instead of null
        return createStubAccount(id);
      }

      return {
        id: account.id,
        name: account.name,
        isArchived: account.isArchived,
      };
    });
  } catch (error) {
    console.error("Error batch loading accounts:", error);
    throw error;
  }
}

/**
 * Create a DataLoader instance for accounts
 * Scoped per GraphQL request to ensure fresh data on each request
 *
 * @param accountRepository - Repository instance for account lookups
 * @param getUserId - Function that returns the authenticated user ID (called during batch operations)
 * @returns DataLoader instance configured for account batching
 */
export function createAccountLoader(
  accountRepository: AccountRepository,
  getUserId: () => Promise<string>,
): DataLoader<string, TransactionEmbeddedAccount> {
  return new DataLoader(async (accountIds) => {
    const userId = await getUserId();
    return batchLoadAccounts(accountIds, accountRepository, userId);
  });
}
