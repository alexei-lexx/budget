import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { UserPool } from "aws-cdk-lib/aws-cognito";
import { beforeAll, beforeEach, describe, it } from "vitest";
import { BackendCdkStack } from "../lib/backend-cdk-stack";

describe("BackendCdkStack", () => {
  beforeAll(() => {
    // The stack uses `lambda.Code.fromAsset("../backend/dist")`.
    // Synthesis requires the directory to exist on disk.
    // In CI the backend has not been built,
    // so we materialize an empty placeholder.
    mkdirSync(resolve(__dirname, "../../backend/dist"), { recursive: true });
  });

  // Happy path

  it("synthesizes with HTTP API", () => {
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
    template.resourceCountIs("AWS::ApiGatewayV2::Api", 1);
  });

  describe("backup", () => {
    let stack: BackendCdkStack;
    let template: Template;

    beforeEach(() => {
      const app = new cdk.App();
      const authStack = new cdk.Stack(app, "AuthStack");
      const userPool = new UserPool(authStack, "UserPool");
      const userPoolClient = userPool.addClient("Client");

      stack = new BackendCdkStack(app, "TestBackendCdkStack", {
        authClaimNamespace: "https://test",
        nodeEnv: "test",
        userPool,
        userPoolClient,
      });
      template = Template.fromStack(stack);
    });

    it("synthesizes exactly one backup vault, plan, and selection", () => {
      // Assert
      template.resourceCountIs("AWS::Backup::BackupVault", 1);
      template.resourceCountIs("AWS::Backup::BackupPlan", 1);
      template.resourceCountIs("AWS::Backup::BackupSelection", 1);
    });

    it("schedules backup plan rule daily", () => {
      // Assert
      template.hasResourceProperties("AWS::Backup::BackupPlan", {
        BackupPlan: Match.objectLike({
          BackupPlanRule: Match.arrayWith([
            Match.objectLike({
              ScheduleExpression: "cron(0 3 * * ? *)",
              Lifecycle: { DeleteAfterDays: 30 },
              StartWindowMinutes: 60,
              CompletionWindowMinutes: 120,
            }),
          ]),
        }),
      });
    });

    it("selects backup targets by backup tag matching stack name", () => {
      // Assert
      template.hasResourceProperties("AWS::Backup::BackupSelection", {
        BackupSelection: Match.objectLike({
          ListOfTags: Match.arrayWith([
            Match.objectLike({
              ConditionKey: "backup",
              ConditionValue: stack.stackName,
            }),
          ]),
        }),
      });
    });

    it("tags DynamoDB tables with backup key set to stack name", () => {
      // Assert
      template.resourceCountIs("AWS::DynamoDB::Table", 8);
      template.allResourcesProperties("AWS::DynamoDB::Table", {
        Tags: Match.arrayWith([{ Key: "backup", Value: stack.stackName }]),
      });
    });
  });
});
