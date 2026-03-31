#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { AuthCallbackConfigStack } from "../lib/auth-callback-config-stack";
import { AuthCdkStack } from "../lib/auth-cdk-stack";
import { BackendCdkStack } from "../lib/backend-cdk-stack";
import { FrontendCdkStack } from "../lib/frontend-cdk-stack";
import { requireEnv } from "../lib/require-env";

const app = new cdk.App();
const nodeEnv = requireEnv("NODE_ENV");

// Auth stack for Cognito User Pool
const authStack = new AuthCdkStack(app, "AuthCdkStack", {
  stackName: `${nodeEnv}-BudgetAuth`,
});

const backendStack = new BackendCdkStack(app, "BackendCdkStack", {
  stackName: `${nodeEnv}-BudgetBackend`,
  userPool: authStack.userPool,
  userPoolClient: authStack.userPoolClient,
});

const frontendStack = new FrontendCdkStack(app, "FrontendCdkStack", {
  stackName: `${nodeEnv}-BudgetFrontend`,
  httpApi: backendStack.httpApi,
});

// Auth callback configuration stack - runs after Frontend to configure callback URLs
// This solves the circular dependency: Auth creates User Pool before CloudFront URL exists
new AuthCallbackConfigStack(app, "AuthCallbackConfigStack", {
  stackName: `${nodeEnv}-BudgetAuthCallbackConfig`,
  userPool: authStack.userPool,
  userPoolClient: authStack.userPoolClient,
  distribution: frontendStack.distribution,
});
