#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { AuthCallbackConfigStack } from "../lib/auth-callback-config-stack";
import { AuthCdkStack } from "../lib/auth-cdk-stack";
import { BackendCdkStack } from "../lib/backend-cdk-stack";
import { FrontendCdkStack } from "../lib/frontend-cdk-stack";
import { requireEnv } from "../lib/require-env";

const app = new cdk.App();
const nodeEnv = requireEnv("NODE_ENV");

// Add tags to all resources in app
cdk.Tags.of(app).add("environment", nodeEnv);

// CDK_DEFAULT_ACCOUNT and CDK_DEFAULT_REGION are set automatically
// by the CDK CLI based on the active AWS profile.
// FrontendCdkStack requires env for SSM/Route53 context lookups.
// Once one stack has env, all stacks sharing cross-stack references must also have env.
const env = {
  account: requireEnv("CDK_DEFAULT_ACCOUNT"),
  region: requireEnv("CDK_DEFAULT_REGION"),
};

// Auth stack for Cognito User Pool
const authStack = new AuthCdkStack(app, "AuthCdkStack", {
  env,
  stackName: `${nodeEnv}-BudgetAuth`,
});

const backendStack = new BackendCdkStack(app, "BackendCdkStack", {
  env,
  stackName: `${nodeEnv}-BudgetBackend`,
  userPool: authStack.userPool,
  userPoolClient: authStack.userPoolClient,
});

const frontendStack = new FrontendCdkStack(app, "FrontendCdkStack", {
  env,
  httpApi: backendStack.httpApi,
  stackName: `${nodeEnv}-BudgetFrontend`,
});

// Auth callback configuration stack - runs after Frontend to configure callback URLs
// This solves the circular dependency: Auth creates User Pool before CloudFront URL exists
new AuthCallbackConfigStack(app, "AuthCallbackConfigStack", {
  customDomainUrl: frontendStack.customDomainUrl,
  distribution: frontendStack.distribution,
  env,
  stackName: `${nodeEnv}-BudgetAuthCallbackConfig`,
  userPool: authStack.userPool,
  userPoolClient: authStack.userPoolClient,
});
