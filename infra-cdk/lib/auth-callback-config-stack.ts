import {
  CfnOutput,
  CustomResource,
  RemovalPolicy,
  Stack,
  StackProps,
  Tags,
} from "aws-cdk-lib";
import { IDistribution } from "aws-cdk-lib/aws-cloudfront";
import { IUserPool, IUserPoolClient } from "aws-cdk-lib/aws-cognito";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { Provider } from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";
import { requireEnv } from "./require-env";
import { CustomResourceProperties } from "./update-callback-urls-handler";
import { defaultLambdaOptions } from "./utils";

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
  userPool: IUserPool;
  userPoolClient: IUserPoolClient;
  distribution: IDistribution;
}

export class AuthCallbackConfigStack extends Stack {
  constructor(
    scope: Construct,
    id: string,
    props: AuthCallbackConfigStackProps,
  ) {
    super(scope, id, props);

    const nodeEnv = requireEnv("NODE_ENV");

    // Add tags to all resources in this stack
    Tags.of(this).add("environment", nodeEnv);

    const distributionUrl = `https://${props.distribution.distributionDomainName}`;

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
        runtime: Runtime.NODEJS_20_X,
        entry: "lib/update-callback-urls-handler.ts",
        handler: "handler",
        logGroup: updateCallbackUrlsLogGroup,
        ...defaultLambdaOptions(),
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
        CallbackURLs: [distributionUrl],
        LogoutURLs: [distributionUrl],
        Version: "2", // Increment to force re-run
      } satisfies CustomResourceProperties,
    });

    // Output for verification
    new CfnOutput(this, "ConfiguredCallbackUrl", {
      value: distributionUrl,
      description: "Distribution URL configured as callback/logout URL",
    });
  }
}
