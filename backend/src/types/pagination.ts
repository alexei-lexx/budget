/**
 * Pagination constants and types following Relay Connection specification
 */

/**
 * Default number of items to return per page
 */
export const DEFAULT_PAGE_SIZE = 10;

/**
 * Maximum number of items allowed per page
 */
export const MAX_PAGE_SIZE = 100;

/**
 * Minimum number of items allowed per page
 */
export const MIN_PAGE_SIZE = 1;

/**
 * Input parameters for cursor-based pagination
 */
export interface PaginationInput {
  first?: number;
  after?: string;
}

/**
 * Information about pagination state
 */
export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string;
  endCursor?: string;
}

/**
 * Generic edge type for paginated results
 */
export interface Edge<T> {
  node: T;
  cursor: string;
}

/**
 * Generic connection type for paginated results
 */
export interface Connection<T> {
  edges: Edge<T>[];
  pageInfo: PageInfo;
  totalCount: number;
}
