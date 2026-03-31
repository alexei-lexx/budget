import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { requireIntEnv } from "./require-env";

export const defaultLambdaOptions = () => ({
  tracing: lambda.Tracing.ACTIVE,
  ...(process.env.AWS_LAMBDA_TIMEOUT_SECONDS && {
    timeout: cdk.Duration.seconds(requireIntEnv("AWS_LAMBDA_TIMEOUT_SECONDS")),
  }),
  ...(process.env.AWS_LAMBDA_MEMORY_SIZE && {
    memorySize: requireIntEnv("AWS_LAMBDA_MEMORY_SIZE"),
  }),
});
