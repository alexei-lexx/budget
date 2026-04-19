import { beforeEach, describe, expect, it } from "@jest/globals";
import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { AuthCdkStack } from "../lib/auth-cdk-stack";

describe("AuthCdkStack", () => {
  const props = {
    authClaimNamespace: "https://personal-budget-tracker",
    callbackUrls: ["http://localhost:5173"],
    domainPrefix: "test-budget-auth",
    lambdaMemorySizeMb: 128,
    lambdaTimeoutSeconds: 5,
    logoutUrls: ["http://localhost:5173"],
    retainUserPoolOnDestroy: true,
    selfSignUpEnabled: true,
  } as const;

  describe("default configuration", () => {
    let app: cdk.App;
    let stack: AuthCdkStack;
    let template: Template;

    beforeEach(() => {
      app = new cdk.App();
      stack = new AuthCdkStack(app, "TestAuthCdkStack", props);
      template = Template.fromStack(stack);
    });

    it("should create the stack", () => {
      expect(stack).toBeDefined();

      // Verify User Pool is created
      template.resourceCountIs("AWS::Cognito::UserPool", 1);

      // Verify User Pool Client configuration
      template.hasResourceProperties("AWS::Cognito::UserPoolClient", {
        GenerateSecret: false,
        AllowedOAuthFlows: ["code"],
      });

      // Verify ExplicitAuthFlows contains required flows (order may vary)
      const resources = template.findResources("AWS::Cognito::UserPoolClient");
      const clientResource = Object.values(resources)[0];
      const authFlows = clientResource.Properties.ExplicitAuthFlows as string[];
      expect(authFlows).toContain("ALLOW_USER_AUTH");
      expect(authFlows).toContain("ALLOW_USER_PASSWORD_AUTH");
      expect(authFlows).toContain("ALLOW_REFRESH_TOKEN_AUTH");

      // Verify User Pool Domain
      template.hasResourceProperties("AWS::Cognito::UserPoolDomain", {
        Domain: "test-budget-auth",
      });
    });

    it("should create Pre Token Generation Lambda for access token customization", () => {
      const lambdas = template.findResources("AWS::Lambda::Function");
      const lambdaName = Object.keys(lambdas).find((id) =>
        id.startsWith("PreTokenGeneration"),
      );

      expect(lambdaName).toBeDefined();

      const lambda = lambdas[lambdaName || ""];

      // Verify Lambda function is created with Node.js runtime
      expect(lambda.Properties.Runtime).toBe("nodejs20.x");
      expect(lambda.Properties.Handler).toBe("index.handler");

      // Verify User Pool has Lambda trigger configured with V2_0 for access token customization
      template.hasResourceProperties("AWS::Cognito::UserPool", {
        LambdaConfig: {
          PreTokenGenerationConfig: {
            LambdaVersion: "V2_0",
          },
        },
      });
    });
  });

  describe("self sign-up", () => {
    let app: cdk.App;
    let stack: AuthCdkStack;
    let template: Template;

    it("should enable self sign-up when selfSignUpEnabled is true", () => {
      app = new cdk.App();
      stack = new AuthCdkStack(app, "TestAuthCdkStack", {
        ...props,
        selfSignUpEnabled: true,
      });
      template = Template.fromStack(stack);

      template.hasResourceProperties("AWS::Cognito::UserPool", {
        AdminCreateUserConfig: {
          AllowAdminCreateUserOnly: false,
        },
      });
    });

    it("should disable self sign-up when selfSignUpEnabled is false", () => {
      app = new cdk.App();
      stack = new AuthCdkStack(app, "TestAuthCdkStack", {
        ...props,
        selfSignUpEnabled: false,
      });
      template = Template.fromStack(stack);

      template.hasResourceProperties("AWS::Cognito::UserPool", {
        AdminCreateUserConfig: {
          AllowAdminCreateUserOnly: true,
        },
      });
    });
  });
});
