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

    if (typeof result.score !== "boolean") {
      throw new Error(
        `toEvaluateTrue requires a boolean score, got ${typeof result.score}: ${JSON.stringify(result.score)}`,
      );
    }

    const pass = result.score;

    return {
      pass,
      message: () => {
        const summary = `expected evaluator score to${pass ? " not" : ""} be true, got ${JSON.stringify(result.score)}`;

        if (pass) {
          return summary;
        }

        return `${summary}\n\noutputs:\n${inspect(params.outputs)}${result.comment ? `\n\ncomment:\n${result.comment}` : ""}`;
      },
    };
  },

  async toEvaluateAtLeast<Params extends EvaluatorParams>(
    evaluator: Evaluator<Params>,
    params: Params,
    threshold: number,
  ) {
    const result = await evaluator(params);

    if (typeof result.score !== "number") {
      throw new Error(
        `toEvaluateAtLeast requires a numeric score, got ${typeof result.score}: ${JSON.stringify(result.score)}`,
      );
    }

    const score = result.score;
    const pass = score >= threshold;

    return {
      pass,
      message: () => {
        const summary = `expected evaluator score to${pass ? " not" : ""} be at least ${threshold}, got ${score}`;

        if (pass) {
          return summary;
        }

        return `${summary}\n\noutputs:\n${inspect(params.outputs)}${result.comment ? `\n\ncomment:\n${result.comment}` : ""}`;
      },
    };
  },
});

declare module "vitest" {
  interface Matchers<R, T> {
    toEvaluateTrue: T extends Evaluator<infer Params>
      ? (params: Params) => Promise<R>
      : never;
    toEvaluateAtLeast: T extends Evaluator<infer Params>
      ? (params: Params, threshold: number) => Promise<R>
      : never;
  }
}
