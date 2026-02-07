#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { AuthCdkStack } from "../lib/auth-cdk-stack";
import { BackendCdkStack } from "../lib/backend-cdk-stack";
import { FrontendCdkStack } from "../lib/frontend-cdk-stack";

const app = new cdk.App();

const nodeEnv = process.env.NODE_ENV;
if (!nodeEnv) {
  throw new Error("NODE_ENV environment variable must be configured");
}

// Auth stack for Cognito User Pool
const authStack = new AuthCdkStack(app, "AuthCdkStack", {
  stackName: `${nodeEnv}-BudgetAuth`,
});

const backendStack = new BackendCdkStack(app, "BackendCdkStack", {
  stackName: `${nodeEnv}-BudgetBackend`,
  authIssuer: authStack.userPool.userPoolProviderUrl,
  authClientId: authStack.userPoolClient.userPoolClientId,
  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */
  /* Uncomment the next line to specialize this stack for the AWS Account
   * and Region that are implied by the current CLI configuration. */
  // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
  /* Uncomment the next line if you know exactly what Account and Region you
   * want to deploy the stack to. */
  // env: { account: '123456789012', region: 'us-east-1' },
  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});

new FrontendCdkStack(app, "FrontendCdkStack", {
  stackName: `${nodeEnv}-BudgetFrontend`,
  httpApi: backendStack.httpApi,
  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */
  /* Uncomment the next line to specialize this stack for the AWS Account
   * and Region that are implied by the current CLI configuration. */
  // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
  /* Uncomment the next line if you know exactly what Account and Region you
   * want to deploy the stack to. */
  // env: { account: '123456789012', region: 'us-east-1' },
  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});
