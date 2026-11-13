import { bedrock } from "@ai-sdk/amazon-bedrock";
import * as px from "@arizeai/phoenix-client/vitest";
import {
  createClassificationEvaluator,
  createEvaluator,
} from "@arizeai/phoenix-evals";
import { faker } from "@faker-js/faker";
import { getBufferString } from "@langchain/core/messages";
import { createTrajectoryMatchEvaluator } from "agentevals";
import { createProviderRegistry } from "ai";
import { AIMessage, BaseMessage, HumanMessage } from "langchain";
import { v5 as uuidv5 } from "uuid";
import { expect } from "vitest";
import { z } from "zod";
import {
  resolveAccountRepository,
  resolveCategoryRepository,
  resolveTransactionRepository,
} from "../../dependencies";
import { agentContextSchema } from "../../langchain/agents/agent-context";
import { DEFAULT_LANGCHAIN_MODEL_ID } from "../../langchain/settings";
import { CREATE_TRANSACTION_TOOL_NAME } from "../../langchain/tools/create-transaction";
import { AccountData } from "../../models/account";
import { CategoryData } from "../../models/category";
import { TransactionData } from "../../models/transaction";
import { requireEnv } from "../require-env";
import { fakeAccount } from "./models/account-fakes";
import { fakeCategory } from "./models/category-fakes";
import { fakeTransaction } from "./models/transaction-fakes";

export const agentModelId = requireEnv(
  "LANGCHAIN_MODEL_ID",
  DEFAULT_LANGCHAIN_MODEL_ID,
);

// Separate judge keeps scores comparable when LANGCHAIN_MODEL_ID changes
// Judge supports only Bedrock models
export const judgeModelId = z
  .templateLiteral(["bedrock:", z.string()], {
    error: `EVAL_JUDGE_MODEL_ID must start with "bedrock:"`,
  })
  .parse(requireEnv("EVAL_JUDGE_MODEL_ID", DEFAULT_LANGCHAIN_MODEL_ID));

// Optional, random name when not set, e.g. "dolores-illo-est".
// The name must be unique for each run.
// experimentName comes from patches/@arizeai+phoenix-client+7.18.2.patch.
export const experimentName =
  process.env["EVAL_EXPERIMENT_NAME"] ?? faker.lorem.slug();

// Type aliases, not interfaces: Phoenix types need index signature (KVMap).
// Only type aliases get it implicitly.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type TestInput = {
  message: string;
  accounts: Partial<AccountData>[];
  categories?: Partial<CategoryData>[];
  transactions?: Partial<TransactionData>[];
  isVoiceInput?: boolean;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type TestExpectedToolCalls = {
  toolCalls: {
    name: string;
    args: Record<string, unknown>;
  }[];
};

// Records trajectory match as named Phoenix score with evaluator trace.
// Phoenix score is number, so boolean match becomes 1 or 0.
const toolCallsEvaluator = createEvaluator<{
  output: BaseMessage[];
  expected: TestExpectedToolCalls;
}>(
  async ({
    output,
    expected,
  }: {
    output: BaseMessage[];
    expected: TestExpectedToolCalls;
  }) => {
    // Agent may call tools with more args than reference lists.
    // Compares only args listed in reference tool calls.
    const toolArgsToCompare: Record<string, string[]> = {};
    for (const toolCall of expected.toolCalls) {
      toolArgsToCompare[toolCall.name] = Object.keys(toolCall.args);
    }

    const evaluator = createTrajectoryMatchEvaluator({
      trajectoryMatchMode: "superset",
      toolArgsMatchOverrides: toolArgsToCompare,
    });

    const result = await evaluator({
      outputs: output,
      referenceOutputs: [
        new AIMessage({
          tool_calls: expected.toolCalls.map((toolCall) => ({
            ...toolCall,
            id: "required-dummy-id",
          })),
        }),
      ],
    });

    return result.score === true ? 1 : 0;
  },
  { name: "tool_calls_match", kind: "CODE" },
);

// Gives 1 when agent does not call create transaction tool, otherwise 0
const noTransactionEvaluator = createEvaluator<{ output: BaseMessage[] }>(
  ({ output }: { output: BaseMessage[] }) => {
    const toolNames = output
      .filter(AIMessage.isInstance)
      .flatMap((message) => message.tool_calls ?? [])
      .map((toolCall) => toolCall.name);

    return toolNames.includes(CREATE_TRANSACTION_TOOL_NAME) ? 0 : 1;
  },
  { name: "no_transaction_created", kind: "CODE" },
);

// Registry splits model ID at first ":" into provider and model.
const judgeModel = createProviderRegistry({ bedrock }).languageModel(
  judgeModelId,
);

// Judge rates trajectory against criteria on 1 to 5 scale.
// Scores are 0 to 1, like scores of other evaluators.
const judgeEvaluator = createClassificationEvaluator<{
  criteria: string;
  trajectory: string;
}>({
  name: "judge_rating",
  // Type assertion: phoenix-evals pins ai 7.0.152 with @ai-sdk/provider 4.0.33.
  // Registry gives model of @ai-sdk/provider 4.0.37.
  // Only stream part types differ, and judge does not stream.
  model: judgeModel as unknown as Parameters<
    typeof createClassificationEvaluator
  >[0]["model"],
  choices: { "1": 0, "2": 0.25, "3": 0.5, "4": 0.75, "5": 1 },
  promptTemplate: `
Rate how well the agent trajectory meets the criteria.

Use one of these labels:
- 5: fully meets the criteria
- 4: meets the criteria with a minor issue
- 3: partly meets the criteria
- 2: mostly fails the criteria
- 1: fails the criteria

<criteria>
{{criteria}}
</criteria>

<trajectory>
{{trajectory}}
</trajectory>
`.trim(),
});

// Agent and state of eval suite
interface EvalSuite {
  agent: {
    invoke(
      state: { messages: BaseMessage[] },
      config: { context: z.input<typeof agentContextSchema> },
    ): Promise<{ messages: BaseMessage[] }>;
  };
  context: { userId: string; today: string };
  userId: string;
}

// Case data from px.test
interface EvalCase<TExpected> {
  input: TestInput;
  expected?: TExpected;
}

// Seeds database, runs agent, and scores tool calls against expected ones
export async function testAgentToolCalls(
  { agent, context, userId }: EvalSuite,
  { input, expected }: EvalCase<TestExpectedToolCalls>,
) {
  // Arrange
  await seedDatabase(input, userId);

  // Act
  const response = await agent.invoke(
    { messages: [new HumanMessage(input.message)] },
    { context: { ...context, isVoiceInput: input.isVoiceInput } },
  );
  px.logOutput({ answer: response.messages.at(-1)?.text });

  // Assert
  const { score } = await px.evaluate(toolCallsEvaluator, {
    output: response.messages,
    expected: expected ?? { toolCalls: [] },
  });

  expect(score).toBe(1);
}

// Seeds database, runs agent, and lets judge rate trajectory against criteria
export async function testAgentWithJudge(
  { agent, context, userId }: EvalSuite,
  {
    input,
    expected,
  }: EvalCase<{
    criteria: string;
  }>,
) {
  // Arrange
  await seedDatabase(input, userId);

  // Act
  const response = await agent.invoke(
    { messages: [new HumanMessage(input.message)] },
    { context },
  );
  px.logOutput({ answer: response.messages.at(-1)?.text });

  // Assert
  const { score } = await px.evaluate(judgeEvaluator, {
    criteria: expected?.criteria,
    trajectory: getBufferString(response.messages),
  });

  expect(score).toBe(1);
}

// Seeds database, runs agent, and checks that agent creates no transaction
export async function testAgentNoTransactionCreated(
  { agent, context, userId }: EvalSuite,
  { input }: EvalCase<unknown>,
) {
  // Arrange
  await seedDatabase(input, userId);

  // Act
  const response = await agent.invoke(
    { messages: [new HumanMessage(input.message)] },
    { context: { ...context, isVoiceInput: input.isVoiceInput } },
  );
  px.logOutput({ answer: response.messages.at(-1)?.text });

  // Assert
  const { score } = await px.evaluate(noTransactionEvaluator, {
    output: response.messages,
  });

  expect(score).toBe(1);
}

// Generates stable UUID from readable name, e.g. testId("groceries").
// Schemas require UUID, and stable IDs keep Phoenix dataset examples stable.
// UUID v5 hashes name + fixed UUID below, so same name always gives same UUID.
// Do not change fixed UUID: all IDs and dataset examples will change.
export function testId(name: string) {
  return uuidv5(name, "fc0c6d23-9478-4607-a85c-2b32b5b6d8c8");
}

// Creates accounts, categories and transactions for given user.
async function seedDatabase(
  { accounts, categories = [], transactions = [] }: TestInput,
  userId: string,
) {
  const accountRepository = resolveAccountRepository();
  const categoryRepository = resolveCategoryRepository();
  const transactionRepository = resolveTransactionRepository();

  for (const accountData of accounts) {
    await accountRepository.create(fakeAccount({ ...accountData, userId }));
  }

  for (const categoryData of categories) {
    await categoryRepository.create(fakeCategory({ ...categoryData, userId }));
  }

  for (const transactionData of transactions) {
    await transactionRepository.create(
      fakeTransaction({ ...transactionData, userId }),
    );
  }
}
