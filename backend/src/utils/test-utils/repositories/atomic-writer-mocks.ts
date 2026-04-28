import { jest } from "@jest/globals";
import { AtomicWriter } from "../../../ports/atomic-writer";

export const createMockAtomicWriter = (): jest.Mocked<AtomicWriter> => ({
  commit: jest.fn(),
});
