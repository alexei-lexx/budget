import { evaluate, mean, sum } from "mathjs";
import { z } from "zod";
import { Failure, Success } from "../../types/result";
import { ToolSignature } from "../ports/agent";

const sumInputSchema = z.object({
  numbers: z.array(z.number()),
});

type SumInput = z.infer<typeof sumInputSchema>;

export const sumTool: ToolSignature<SumInput, number> = {
  name: "sum",
  description:
    "Calculate the sum of an array of numbers. Use this to add up transaction amounts. Input should be a JSON string with a 'numbers' array. Example: {\"numbers\": [10.5, 20.3, 15.0]}",
  func: async (input: SumInput) => Success(sum(input.numbers)),
  inputSchema: sumInputSchema,
};

const avgInputSchema = z.object({
  numbers: z.array(z.number()),
});

type AvgInput = z.infer<typeof avgInputSchema>;

export const avgTool: ToolSignature<AvgInput, number> = {
  name: "avg",
  description:
    "Calculate the average of an array of numbers. Input should be a JSON string with a 'numbers' array. Example: {\"numbers\": [10.5, 20.3, 15.0]}",
  func: async (input: AvgInput) => {
    if (input.numbers.length === 0) {
      return Failure("Cannot calculate average of an empty array");
    }

    return Success(mean(input.numbers));
  },
  inputSchema: avgInputSchema,
};

const calculateInputSchema = z.object({
  expression: z.string(),
});

type CalculateInput = z.infer<typeof calculateInputSchema>;

export const calculateTool: ToolSignature<CalculateInput, number> = {
  name: "calculate",
  description:
    'Evaluate a mathematical expression and return the result. Use this for percentages, division, or complex calculations. Input should be a JSON string with an \'expression\' field. Example: {"expression": "(45.8 / 200) * 100"}',
  func: async (input: CalculateInput) => {
    const result = evaluate(input.expression);
    return typeof result === "number"
      ? Success(result)
      : Failure(`Invalid calculation result: ${result}`);
  },
  inputSchema: calculateInputSchema,
};
