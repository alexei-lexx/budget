import { expect } from "@jest/globals";
import { LangChainMatchers, langchainMatchers } from "@langchain/core/testing";

expect.extend(langchainMatchers);

declare module "expect" {
  // Merging generics with the upstream `Matchers` interface requires the same
  // signature; the second parameter is unused here but must be preserved.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-object-type
  interface Matchers<R extends void | Promise<void>, T = unknown>
    extends LangChainMatchers<R> {}
}
