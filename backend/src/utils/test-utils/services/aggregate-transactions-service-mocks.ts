import { type Mocked, vi } from "vitest";
import { AggregateTransactionsService } from "../../../services/aggregate-transactions-service";

export const createMockAggregateTransactionsService =
  (): Mocked<AggregateTransactionsService> => ({
    call: vi.fn(),
  });
