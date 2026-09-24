import { LangChainMatchers, langchainMatchers } from "@langchain/core/testing";
import { expect } from "vitest";

expect.extend(langchainMatchers);

declare module "vitest" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars
  interface Matchers<R, T> extends LangChainMatchers<T> {}
}
