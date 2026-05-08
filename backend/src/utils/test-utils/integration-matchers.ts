import { LangChainMatchers, langchainMatchers } from "@langchain/core/testing";
import { expect } from "vitest";

expect.extend(langchainMatchers);

// Custom matcher augmentation pattern — see https://vitest.dev/guide/extending-matchers
declare module "vitest" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any
  interface Matchers<T = any> extends LangChainMatchers<T> {}
}
