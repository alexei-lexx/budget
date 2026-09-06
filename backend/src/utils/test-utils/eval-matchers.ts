import { inspect } from "node:util";
import type {
  EvaluatorResult,
  createTrajectoryLLMAsJudge,
  createTrajectoryMatchEvaluator,
} from "agentevals";
import { expect } from "vitest";

type EvaluatorParams =
  | Parameters<ReturnType<typeof createTrajectoryMatchEvaluator>>[0]
  | Parameters<ReturnType<typeof createTrajectoryLLMAsJudge>>[0];

type Evaluator<Params extends EvaluatorParams = EvaluatorParams> = (
  params: Params,
) => Promise<EvaluatorResult>;

expect.extend({
  async toEvaluateTrue<Params extends EvaluatorParams>(
    evaluator: Evaluator<Params>,
    params: Params,
  ) {
    const result = await evaluator(params);
    const pass = result.score === true;

    return {
      pass,
      message: () => {
        const summary = `expected evaluator score to${pass ? " not" : ""} be true, got ${JSON.stringify(result.score)}`;
        if (pass) {
          return summary;
        }
        return `${summary}\n\noutputs:\n${inspect(params.outputs)}`;
      },
    };
  },

  async toEvaluateAtLeast<Params extends EvaluatorParams>(
    evaluator: Evaluator<Params>,
    params: Params,
    threshold: number,
  ) {
    const result = await evaluator(params);
    const score = result.score as number;
    const pass = score >= threshold;

    return {
      pass,
      message: () => {
        const summary = `expected evaluator score to${pass ? " not" : ""} be at least ${threshold}, got ${score}`;
        if (pass) {
          return summary;
        }
        return `${summary}\n\noutputs:\n${inspect(params.outputs)}`;
      },
    };
  },
});

// Custom matcher augmentation pattern — see https://vitest.dev/guide/extending-matchers
declare module "vitest" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Matchers<T = any> {
    toEvaluateTrue: T extends Evaluator<infer Params>
      ? (params: Params) => Promise<void>
      : never;
    toEvaluateAtLeast: T extends Evaluator<infer Params>
      ? (params: Params, threshold: number) => Promise<void>
      : never;
  }
}
