import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { UserPool } from "aws-cdk-lib/aws-cognito";
import { beforeAll, describe, it } from "vitest";
import { BackendCdkStack } from "../lib/backend-cdk-stack";

describe("BackendCdkStack", () => {
  beforeAll(() => {
    // The stack uses `lambda.Code.fromAsset("../backend/dist")`.
    // Synthesis requires the directory to exist on disk.
    // In CI the backend has not been built,
    // so we materialize an empty placeholder.
    mkdirSync(resolve(__dirname, "../../backend/dist"), { recursive: true });
  });

  it("synthesizes with expected DynamoDB tables and Lambda functions", () => {
    // Arrange
    const app = new cdk.App();
    const authStack = new cdk.Stack(app, "AuthStack");
    const userPool = new UserPool(authStack, "UserPool");
    const userPoolClient = userPool.addClient("Client");

    // Act
    const stack = new BackendCdkStack(app, "TestBackendCdkStack", {
      authClaimNamespace: "https://test",
      nodeEnv: "test",
      userPool,
      userPoolClient,
    });
    const template = Template.fromStack(stack);

    // Assert
    template.resourceCountIs("AWS::DynamoDB::Table", 7);
    template.resourceCountIs("AWS::Lambda::Function", 3);
  });
});
