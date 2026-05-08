import { vi, type Mocked } from "vitest";
import { AtomicWriter } from "../../../ports/atomic-writer";

export const createMockAtomicWriter = (): Mocked<AtomicWriter> => ({
  commit: vi.fn(),
});
