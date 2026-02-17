import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";

export const defaultLambdaOptions = () => ({
  tracing: lambda.Tracing.ACTIVE,
  ...(process.env.AWS_LAMBDA_TIMEOUT_SECONDS && {
    timeout: cdk.Duration.seconds(
      parseInt(process.env.AWS_LAMBDA_TIMEOUT_SECONDS, 10),
    ),
  }),
  ...(process.env.AWS_LAMBDA_MEMORY_SIZE && {
    memorySize: parseInt(process.env.AWS_LAMBDA_MEMORY_SIZE, 10),
  }),
});
