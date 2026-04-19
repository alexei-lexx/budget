import {
  CfnOutput,
  CustomResource,
  RemovalPolicy,
  Stack,
  StackProps,
} from "aws-cdk-lib";
import { IDistribution } from "aws-cdk-lib/aws-cloudfront";
import { IUserPool, IUserPoolClient } from "aws-cdk-lib/aws-cognito";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { Provider } from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";
import { defaultLambdaOptions } from "./default-lambda-options";
import { CustomResourceProperties } from "./update-callback-urls-handler";

/**
 * CDK Stack for configuring authentication callback URLs.
 *
 * This stack runs after Auth and Frontend stacks
 * to configure callback/logout URLs
 * with the CloudFront distribution URL.
 *
 * It uses a custom Lambda function
 * to call the updateUserPoolClient API
 * with only the callback/logout URLs,
 * preserving all other settings configured in the Auth stack.
 *
 * Purpose:
 * - Solves circular dependency: Auth creates User Pool before CloudFront exists
 * - Prevents configuration drift: Updates managed by CDK instead of manual CLI
 * - Single source of truth: Auth stack owns OAuth config, this only sets URLs
 *
 * Props:
 * - userPool: The User Pool construct from Auth stack
 * - userPoolClient: The User Pool Client construct from Auth stack
 * - distribution: The CloudFront distribution from Frontend stack
 */
export interface AuthCallbackConfigStackProps extends StackProps {
  distribution: IDistribution;
  lambdaMemorySizeMb?: number;
  lambdaTimeoutSeconds?: number;
  userPool: IUserPool;
  userPoolClient: IUserPoolClient;
  // Optional custom domain URL (e.g. 'https://example.com').
  // When provided, it is added alongside the CloudFront URL in CallbackURLs and LogoutURLs.
  customDomainUrl?: string;
}

export class AuthCallbackConfigStack extends Stack {
  constructor(
    scope: Construct,
    id: string,
    props: AuthCallbackConfigStackProps,
  ) {
    super(scope, id, props);

    const {
      distribution,
      lambdaMemorySizeMb,
      lambdaTimeoutSeconds,
      customDomainUrl,
    } = props;

    const distributionUrl = `https://${distribution.distributionDomainName}`;

    // Include the custom domain URL in allowed callback/logout URLs when configured.
    // Both URLs must be present so auth works regardless of which URL the user accesses.
    const callbackUrls = customDomainUrl
      ? [distributionUrl, customDomainUrl]
      : [distributionUrl];

    // Log group for callback URL updater Lambda
    const updateCallbackUrlsLogGroup = new LogGroup(
      this,
      "UpdateCallbackUrlsLogs",
      {
        retention: RetentionDays.ONE_WEEK,
        removalPolicy: RemovalPolicy.DESTROY,
      },
    );

    // Lambda function to update callback and logout URLs
    // Uses NodejsFunction with bundled SDK dependencies for reliability
    const updateCallbackUrlsFunction = new NodejsFunction(
      this,
      "UpdateCallbackUrlsFunction",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        entry: "lib/update-callback-urls-handler.ts",
        handler: "handler",
        logGroup: updateCallbackUrlsLogGroup,
        ...defaultLambdaOptions({ lambdaMemorySizeMb, lambdaTimeoutSeconds }),
      },
    );

    // Grant permissions to describe and update User Pool Client
    updateCallbackUrlsFunction.addToRolePolicy(
      new PolicyStatement({
        actions: [
          "cognito-idp:DescribeUserPoolClient",
          "cognito-idp:UpdateUserPoolClient",
        ],
        resources: [props.userPool.userPoolArn],
      }),
    );

    // Custom resource provider that invokes our Lambda
    const provider = new Provider(this, "Provider", {
      onEventHandler: updateCallbackUrlsFunction,
    });

    // Custom resource to trigger the Lambda on create/update
    // The updateUserPoolClient API preserves existing settings for parameters not provided
    // This ensures OAuth flows, scopes, and other config from Auth stack remain unchanged
    new CustomResource(this, "UpdateCallbackUrls", {
      serviceToken: provider.serviceToken,
      properties: {
        UserPoolId: props.userPool.userPoolId,
        ClientId: props.userPoolClient.userPoolClientId,
        CallbackURLs: callbackUrls,
        LogoutURLs: callbackUrls,
        Version: "1", // Increment to force re-run
      } satisfies CustomResourceProperties,
    });

    // Output for verification
    new CfnOutput(this, "ConfiguredCallbackUrl", {
      value: callbackUrls.join(", "),
      description: "Distribution URL(s) configured as callback/logout URLs",
    });
  }
}
