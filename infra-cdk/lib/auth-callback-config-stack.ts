import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as customResources from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";
import { requireEnv } from "./require-env";

/**
 * CDK Stack for configuring authentication callback URLs.
 *
 * This stack runs after Auth and Frontend stacks to configure callback/logout URLs
 * with the CloudFront distribution URL. It uses AwsCustomResource to call the
 * updateUserPoolClient API with only the callback/logout URLs, preserving all other
 * settings configured in the Auth stack.
 *
 * Purpose:
 * - Solves circular dependency: Auth creates User Pool before CloudFront exists
 * - Prevents configuration drift: Updates managed by CDK instead of manual CLI
 * - Single source of truth: Auth stack owns OAuth config, this only sets URLs
 *
 * Props:
 * - userPoolId: The User Pool ID from Auth stack
 * - userPoolClientId: The User Pool Client ID from Auth stack
 * - distributionUrl: The CloudFront distribution URL from Frontend stack
 */
export interface AuthCallbackConfigStackProps extends cdk.StackProps {
  userPoolId: string;
  userPoolClientId: string;
  distributionUrl: string;
}

export class AuthCallbackConfigStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props: AuthCallbackConfigStackProps,
  ) {
    super(scope, id, props);

    const nodeEnv = requireEnv("NODE_ENV");

    // Add tags to all resources in this stack
    cdk.Tags.of(this).add("environment", nodeEnv);

    // Custom resource to update ONLY callback and logout URLs
    // The updateUserPoolClient API preserves existing settings for parameters not provided
    // This ensures OAuth flows, scopes, and other config from Auth stack remain unchanged
    const awsSdkCall: customResources.AwsSdkCall = {
      service: "CognitoIdentityProvider",
      action: "updateUserPoolClient",
      parameters: {
        UserPoolId: props.userPoolId,
        ClientId: props.userPoolClientId,
        CallbackURLs: [props.distributionUrl],
        LogoutURLs: [props.distributionUrl],
      },
      physicalResourceId: customResources.PhysicalResourceId.of(
        `cognito-callback-${props.userPoolClientId}`,
      ),
    };

    new customResources.AwsCustomResource(this, "UpdateCallbackUrls", {
      onCreate: awsSdkCall,
      onUpdate: awsSdkCall,
      policy: customResources.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: ["cognito-idp:UpdateUserPoolClient"],
          resources: [
            `arn:aws:cognito-idp:${this.region}:${this.account}:userpool/${props.userPoolId}`,
          ],
        }),
      ]),
    });

    // Output for verification
    new cdk.CfnOutput(this, "ConfiguredCallbackUrl", {
      value: props.distributionUrl,
      description: "Distribution URL configured as callback/logout URL",
    });
  }
}
