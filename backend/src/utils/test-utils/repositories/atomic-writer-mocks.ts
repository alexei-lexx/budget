import { jest } from "@jest/globals";
import { AtomicWriter } from "../../../ports/atomic-writer";

export const createMockAtomicWriter = (): jest.Mocked<AtomicWriter> => ({
  appendCreateTransaction: jest.fn(),
  appendUpdateTransaction: jest.fn(),
  commit: jest.fn(),
});
