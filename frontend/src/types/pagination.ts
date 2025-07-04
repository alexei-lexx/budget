/**
 * Shared pagination types following Relay Connection specification
 * These types can be reused across different entities (transactions, accounts, categories, etc.)
 */

export interface PaginationInput {
  first?: number;
  after?: string;
}

export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string;
  endCursor?: string;
}

export interface Edge<T> {
  node: T;
  cursor: string;
}

export interface Connection<T> {
  edges: Edge<T>[];
  pageInfo: PageInfo;
  totalCount: number;
}
