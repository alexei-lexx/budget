import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import { describe, expect, it } from "vitest";
import { FrontendCdkStack } from "../lib/frontend-cdk-stack";

describe("FrontendCdkStack", () => {
  it("synthesizes with an S3 bucket and a CloudFront distribution", () => {
    const app = new cdk.App();
    const carrierStack = new cdk.Stack(app, "CarrierStack", {
      env: { account: "111111111111", region: "us-east-1" },
    });
    const httpApi = apigatewayv2.HttpApi.fromHttpApiAttributes(
      carrierStack,
      "ImportedHttpApi",
      { httpApiId: "test-http-api-id" },
    );

    const stack = new FrontendCdkStack(app, "TestFrontendCdkStack", {
      env: { account: "111111111111", region: "us-east-1" },
      httpApi,
      nodeEnv: "test",
    });

    const template = Template.fromStack(stack);
    template.resourceCountIs("AWS::S3::Bucket", 2);
    template.resourceCountIs("AWS::CloudFront::Distribution", 1);
    expect(stack).toBeDefined();
  });
});
