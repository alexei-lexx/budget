import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import { requireEnv } from "./require-env";

/**
 * CDK Stack for Cognito User Pool infrastructure.
 *
 * Creates:
 * - User Pool with email sign-in, admin-only user creation
 * - User Pool Client for SPA with authorization code flow
 * - User Pool Domain for Cognito Hosted UI
 * - Pre Token Generation Lambda for adding email to access tokens
 *
 * Environment variables:
 * - NODE_ENV: Environment name (default: "test")
 * - AUTH_DOMAIN_PREFIX: Cognito domain prefix (default: "{NODE_ENV}-budget-auth")
 * - AUTH_CLAIM_NAMESPACE: Namespace for custom claims (required)
 * - AUTH_CALLBACK_URLS: Comma-separated callback URLs (required)
 * - AUTH_LOGOUT_URLS: Comma-separated logout URLs (required)
 *
 * Outputs:
 * - UserPoolClientId: The ID of the User Pool Client
 * - AuthIssuer: The OIDC issuer URL for JWT verification
 */
export class AuthCdkStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const nodeEnv = requireEnv("NODE_ENV");
    const isProduction = nodeEnv === "production";

    // Add tags to all resources in this stack
    cdk.Tags.of(this).add("Environment", nodeEnv);

    const domainPrefix = requireEnv("AUTH_DOMAIN_PREFIX");
    const claimNamespace = requireEnv("AUTH_CLAIM_NAMESPACE");

    const callbackUrls = requireEnv("AUTH_CALLBACK_URLS").split(",");
    const logoutUrls = requireEnv("AUTH_LOGOUT_URLS").split(",");

    this.userPool = new cognito.UserPool(this, "UserPool", {
      // Users sign in with their email address (not username or phone)
      signInAliases: { email: true },

      // Admin-only user creation: users cannot self-register
      // All accounts must be created by an administrator via AWS Console or API
      selfSignUpEnabled: false,

      // Email is required and immutable because it's the user identifier in the app
      // Changing email in Cognito would orphan the user's data in DynamoDB
      standardAttributes: {
        email: {
          required: true,
          mutable: false,
        },
      },

      // Strong password requirements for security
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },

      // Password reset via email verification code
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,

      // MFA disabled for initial migration; can be enabled later
      mfa: cognito.Mfa.OFF,

      // Prevent accidental deletion via AWS Console or API (production only)
      deletionProtection: isProduction,

      // Retain User Pool data if CDK stack is deleted (production only)
      removalPolicy: isProduction
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
    });

    // Pre Token Generation Lambda - customizes JWT claims before token issuance
    // Problem: Cognito access tokens don't include email by default
    // Solution: Use V2_0 trigger to add namespaced email claim to access tokens
    // This allows backend to extract user email without a separate /userinfo call
    const preTokenGenerationLogGroup = new logs.LogGroup(
      this,
      "PreTokenGenerationLogs",
      {
        retention: logs.RetentionDays.ONE_WEEK,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      },
    );

    const preTokenGenerationLambda = new NodejsFunction(
      this,
      "PreTokenGeneration",
      {
        runtime: Runtime.NODEJS_20_X,
        entry: "lib/pre-token-generation.ts",
        handler: "handler",
        logGroup: preTokenGenerationLogGroup,
        environment: {
          AUTH_CLAIM_NAMESPACE: claimNamespace,
        },
      },
    );

    // V2_0 is required - V1_0 only supports ID token customization, not access tokens
    this.userPool.addTrigger(
      cognito.UserPoolOperation.PRE_TOKEN_GENERATION_CONFIG,
      preTokenGenerationLambda,
      cognito.LambdaVersion.V2_0,
    );

    this.userPoolClient = new cognito.UserPoolClient(this, "UserPoolClient", {
      userPool: this.userPool,

      // No client secret - required for SPA/public clients that can't securely store secrets
      generateSecret: false,

      // Direct authentication flows (non-OAuth)
      authFlows: {
        userPassword: true, // Allow username/password auth (ALLOW_USER_PASSWORD_AUTH)
        userSrp: true, // Secure Remote Password protocol - more secure than plain password
        custom: false, // No custom auth challenge/response flow
        adminUserPassword: false, // Server-side admin auth not needed
      },

      // OAuth 2.0 / OIDC configuration for SPA
      oAuth: {
        flows: {
          authorizationCodeGrant: true, // PKCE flow - secure for SPAs
          implicitCodeGrant: false, // Deprecated, less secure
          clientCredentials: false, // Machine-to-machine only, not for users
        },
        // OIDC scopes: openid (required), profile (name), email (email address)
        scopes: [
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PROFILE,
          cognito.OAuthScope.EMAIL,
        ],
        callbackUrls, // Where Cognito redirects after login
        logoutUrls, // Where Cognito redirects after logout
      },

      // Return generic error messages to prevent user enumeration attacks
      preventUserExistenceErrors: true,

      // Token lifetimes
      accessTokenValidity: cdk.Duration.hours(1), // Short-lived for security
      idTokenValidity: cdk.Duration.hours(1), // Match access token
      refreshTokenValidity: cdk.Duration.days(30), // Long-lived for UX

      // Allow tokens to be revoked (logout invalidates refresh tokens)
      enableTokenRevocation: true,

      // Only Cognito users, no federated identity providers (Google, Facebook, etc.)
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.COGNITO,
      ],
    });

    // Cognito Hosted UI domain - provides login/logout/signup pages
    // Uses Amazon-owned domain: {domainPrefix}.auth.{region}.amazoncognito.com
    new cognito.UserPoolDomain(this, "UserPoolDomain", {
      userPool: this.userPool,
      cognitoDomain: {
        domainPrefix, // Must be globally unique across all AWS accounts
      },
    });

    // Stack outputs for configuration
    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: this.userPoolClient.userPoolClientId,
      description: "Cognito User Pool Client ID",
    });

    new cdk.CfnOutput(this, "AuthIssuer", {
      value: this.userPool.userPoolProviderUrl,
      description: "OIDC Issuer URL for JWT verification",
    });
  }
}
