import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { AuthCdkStack } from "../lib/auth-cdk-stack";

describe("AuthCdkStack", () => {
  let app: cdk.App;
  let stack: AuthCdkStack;
  let template: Template;

  beforeEach(() => {
    process.env.AUTH_CALLBACK_URLS = "http://localhost:5173";
    process.env.AUTH_CLAIM_NAMESPACE = "https://personal-budget-tracker";
    process.env.AUTH_DOMAIN_PREFIX = "test-budget-auth";
    process.env.AUTH_LOGOUT_URLS = "http://localhost:5173";
    process.env.NODE_ENV = "test";

    app = new cdk.App();
    stack = new AuthCdkStack(app, "TestAuthCdkStack");
    template = Template.fromStack(stack);
  });

  afterEach(() => {
    delete process.env.AUTH_CALLBACK_URLS;
    delete process.env.AUTH_CLAIM_NAMESPACE;
    delete process.env.AUTH_DOMAIN_PREFIX;
    delete process.env.AUTH_LOGOUT_URLS;
    delete process.env.NODE_ENV;
  });

  it("should create the stack", () => {
    expect(stack).toBeDefined();

    // Verify User Pool configuration (CloudFormation properties)
    template.hasResourceProperties("AWS::Cognito::UserPool", {
      AdminCreateUserConfig: {
        AllowAdminCreateUserOnly: true,
      },
    });

    // Verify User Pool Client configuration
    template.hasResourceProperties("AWS::Cognito::UserPoolClient", {
      GenerateSecret: false,
      AllowedOAuthFlows: ["code"],
    });

    // Verify ExplicitAuthFlows contains required flows (order may vary)
    const resources = template.findResources("AWS::Cognito::UserPoolClient");
    const clientResource = Object.values(resources)[0];
    const authFlows = clientResource.Properties.ExplicitAuthFlows as string[];
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
