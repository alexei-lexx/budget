import { LangChainMatchers, langchainMatchers } from "@langchain/core/testing";
import { expect } from "vitest";

expect.extend(langchainMatchers);

declare module "vitest" {
  // LangChainMatchers is generic over the assertion return type; in Vitest the
  // chainable type is `Assertion<T>`, so we map it through.
  // Vitest's own Assertion default is `any`; align with it so chained
  // matchers from langchainMatchers retain their typing.
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any
  interface Assertion<T = any> extends LangChainMatchers<Assertion<T>> {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends LangChainMatchers<unknown> {}
}
