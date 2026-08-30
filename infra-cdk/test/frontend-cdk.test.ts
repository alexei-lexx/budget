import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import { describe, it } from "vitest";
import { FrontendCdkStack } from "../lib/frontend-cdk-stack";

describe("FrontendCdkStack", () => {
  // Happy path

  it("synthesizes with CloudFront distribution", () => {
    // Arrange
    const app = new cdk.App();
    const fakeBackendStack = new cdk.Stack(app, "FakeBackendStack");
    const httpApi = apigatewayv2.HttpApi.fromHttpApiAttributes(
      fakeBackendStack,
      "ImportedHttpApi",
      { httpApiId: "test-http-api-id" },
    );

    // Act
    const stack = new FrontendCdkStack(app, "TestFrontendCdkStack", {
      env: { account: "111111111111", region: "us-east-1" },
      httpApi,
      nodeEnv: "test",
    });
    const template = Template.fromStack(stack);

    // Assert
    template.resourceCountIs("AWS::CloudFront::Distribution", 1);
    template.hasResourceProperties("AWS::CloudFront::Distribution", {
      DistributionConfig: {
        CacheBehaviors: Match.arrayWith([
          Match.objectLike({ PathPattern: "/graphql*" }),
          Match.objectLike({ PathPattern: "/mcp*" }),
        ]),
      },
    });
  });
});
