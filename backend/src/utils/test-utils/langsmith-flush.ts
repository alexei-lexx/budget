import { awaitAllCallbacks } from "@langchain/core/callbacks/promises";
import { afterAll } from "vitest";

// LangSmith sends trace events in background batches.
// Wait for them before the test worker exits.
// Otherwise the last runs of each test file stay "pending" in LangSmith.
afterAll(async () => {
  await awaitAllCallbacks();
});
