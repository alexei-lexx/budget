#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { AuthCallbackConfigStack } from "../lib/auth-callback-config-stack";
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
});

const frontendStack = new FrontendCdkStack(app, "FrontendCdkStack", {
  stackName: `${nodeEnv}-BudgetFrontend`,
  httpApi: backendStack.httpApi,
});

// Auth callback configuration stack - runs after Frontend to configure callback URLs
// This solves the circular dependency: Auth creates User Pool before CloudFront URL exists
new AuthCallbackConfigStack(app, "AuthCallbackConfigStack", {
  stackName: `${nodeEnv}-BudgetAuthCallbackConfig`,
  userPoolId: authStack.userPool.userPoolId,
  userPoolClientId: authStack.userPoolClient.userPoolClientId,
  distributionUrl: frontendStack.distributionUrl,
});
