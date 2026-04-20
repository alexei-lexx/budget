#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { AuthCallbackConfigStack } from "../lib/auth-callback-config-stack";
import { AuthCdkStack } from "../lib/auth-cdk-stack";
import { BackendCdkStack } from "../lib/backend-cdk-stack";
import { FrontendCdkStack } from "../lib/frontend-cdk-stack";
import { requireEnv, requireFloatEnv, requireIntEnv } from "../lib/require-env";

const DEFAULT_AUTH_ALLOW_USER_REGISTRATION = "true";
const DEFAULT_AWS_LAMBDA_MEMORY_SIZE = 512;
const DEFAULT_AWS_LAMBDA_TIMEOUT_SECONDS = 30;

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

const lambdaProps = {
  lambdaMemorySizeMb: requireIntEnv(
    "AWS_LAMBDA_MEMORY_SIZE",
    DEFAULT_AWS_LAMBDA_MEMORY_SIZE,
  ),
  lambdaTimeoutSeconds: requireIntEnv(
    "AWS_LAMBDA_TIMEOUT_SECONDS",
    DEFAULT_AWS_LAMBDA_TIMEOUT_SECONDS,
  ),
};

const authClaimNamespace = requireEnv("AUTH_CLAIM_NAMESPACE");

// Auth stack for Cognito User Pool
const authStack = new AuthCdkStack(app, "AuthCdkStack", {
  ...lambdaProps,
  authClaimNamespace,
  callbackUrls: (process.env.AUTH_CALLBACK_URLS || undefined)?.split(","),
  domainPrefix: requireEnv("AUTH_DOMAIN_PREFIX"),
  env,
  logoutUrls: (process.env.AUTH_LOGOUT_URLS || undefined)?.split(","),
  retainUserPoolOnDestroy: nodeEnv === "production",
  selfSignUpEnabled:
    requireEnv(
      "AUTH_ALLOW_USER_REGISTRATION",
      DEFAULT_AUTH_ALLOW_USER_REGISTRATION,
    ) === "true",
  stackName: `${nodeEnv}-BudgetAuth`,
});

const backendStack = new BackendCdkStack(app, "BackendCdkStack", {
  ...lambdaProps,
  authClaimNamespace,
  bedrockConnectionTimeout: requireIntEnv("AWS_BEDROCK_CONNECTION_TIMEOUT"),
  bedrockMaxTokens: requireIntEnv("AWS_BEDROCK_MAX_TOKENS"),
  bedrockModelId: requireEnv("AWS_BEDROCK_MODEL_ID"),
  bedrockRequestTimeout: requireIntEnv("AWS_BEDROCK_REQUEST_TIMEOUT"),
  bedrockTemperature: requireFloatEnv("AWS_BEDROCK_TEMPERATURE"),
  env,
  nodeEnv,
  stackName: `${nodeEnv}-BudgetBackend`,
  userPool: authStack.userPool,
  userPoolClient: authStack.userPoolClient,
});

const frontendStack = new FrontendCdkStack(app, "FrontendCdkStack", {
  env,
  httpApi: backendStack.httpApi,
  nodeEnv,
  stackName: `${nodeEnv}-BudgetFrontend`,
});

// Auth callback configuration stack - runs after Frontend to configure callback URLs
// This solves the circular dependency: Auth creates User Pool before CloudFront URL exists
new AuthCallbackConfigStack(app, "AuthCallbackConfigStack", {
  ...lambdaProps,
  customDomainUrl: frontendStack.customDomainUrl,
  distribution: frontendStack.distribution,
  env,
  stackName: `${nodeEnv}-BudgetAuthCallbackConfig`,
  userPool: authStack.userPool,
  userPoolClient: authStack.userPoolClient,
});
