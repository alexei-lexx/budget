import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { UserPool } from "aws-cdk-lib/aws-cognito";
import { describe, expect, it } from "vitest";
import { BackendCdkStack } from "../lib/backend-cdk-stack";

describe("BackendCdkStack", () => {
  it("synthesizes with the expected DynamoDB tables and Lambda functions", () => {
    const app = new cdk.App();
    const authStack = new cdk.Stack(app, "AuthStack");
    const userPool = new UserPool(authStack, "UserPool");
    const userPoolClient = userPool.addClient("Client");

    const stack = new BackendCdkStack(app, "TestBackendCdkStack", {
      authClaimNamespace: "https://test",
      nodeEnv: "test",
      userPool,
      userPoolClient,
    });

    const template = Template.fromStack(stack);
    template.resourceCountIs("AWS::DynamoDB::Table", 7);
    template.resourceCountIs("AWS::Lambda::Function", 3);
    expect(stack).toBeDefined();
  });
});
