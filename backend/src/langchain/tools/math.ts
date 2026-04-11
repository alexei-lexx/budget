import { tool } from "langchain";
import { evaluate, mean, sum } from "mathjs";
import { z } from "zod";
import { Failure, Success } from "../../types/result";

export const sumTool = tool(({ numbers }) => Success(sum(numbers)), {
  name: "sum",
  description:
    "Calculate the sum of an array of numbers. Use this to add up transaction amounts. Input should be a JSON string with a 'numbers' array. Example: {\"numbers\": [10.5, 20.3, 15.0]}",
  schema: z.object({ numbers: z.array(z.number()) }),
});

export const avgTool = tool(
  ({ numbers }) => {
    if (numbers.length === 0) {
      return Failure("Cannot calculate average of an empty array");
    }

    return Success(mean(numbers));
  },
  {
    name: "avg",
    description:
      "Calculate the average of an array of numbers. Input should be a JSON string with a 'numbers' array. Example: {\"numbers\": [10.5, 20.3, 15.0]}",
    schema: z.object({ numbers: z.array(z.number()) }),
  },
);

export const calculateTool = tool(
  ({ expression }) => {
    const result = evaluate(expression);
    return typeof result === "number"
      ? Success(result)
      : Failure(`Invalid calculation result: ${result}`);
  },
  {
    name: "calculate",
    description:
      'Evaluate a mathematical expression and return the result. Use this for percentages, division, or complex calculations. Input should be a JSON string with an \'expression\' field. Example: {"expression": "(45.8 / 200) * 100"}',
    schema: z.object({ expression: z.string() }),
  },
);
