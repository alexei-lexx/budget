import { Duration } from "aws-cdk-lib";
import { Tracing } from "aws-cdk-lib/aws-lambda";

export interface DefaultLambdaOptions {
  lambdaMemorySizeMb?: number;
  lambdaTimeoutSeconds?: number;
}

export function defaultLambdaOptions({
  lambdaMemorySizeMb,
  lambdaTimeoutSeconds,
}: DefaultLambdaOptions) {
  return {
    tracing: Tracing.ACTIVE,
    ...(lambdaMemorySizeMb !== undefined && {
      memorySize: lambdaMemorySizeMb,
    }),
    ...(lambdaTimeoutSeconds !== undefined && {
      timeout: Duration.seconds(lambdaTimeoutSeconds),
    }),
  };
}
