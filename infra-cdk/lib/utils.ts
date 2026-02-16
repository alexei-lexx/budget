import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";

export const defaultLambdaOptions = () => ({
  tracing: lambda.Tracing.ACTIVE,
  ...(process.env.LAMBDA_TIMEOUT_SECONDS && {
    timeout: cdk.Duration.seconds(
      parseInt(process.env.LAMBDA_TIMEOUT_SECONDS, 10),
    ),
  }),
  ...(process.env.LAMBDA_MEMORY_SIZE && {
    memorySize: parseInt(process.env.LAMBDA_MEMORY_SIZE, 10),
  }),
});
