/**
 * GraphQL embedded relationship types
 * These types represent partial entity data embedded in GraphQL responses
 * Used when related entities are fetched via DataLoaders to prevent N+1 queries
 */

export interface TransactionEmbeddedAccount {
  id: string;
  name: string;
  isArchived: boolean;
}

export interface TransactionEmbeddedCategory {
  id: string;
  name: string;
  isArchived: boolean;
}
