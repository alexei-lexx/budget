import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";

export class BackendCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const graphqlFunction = new lambda.Function(this, "GraphqlEndpoint", {
      runtime: lambda.Runtime.NODEJS_22_X,
      code: lambda.Code.fromAsset("../backend/dist"),
      handler: "lambda.handler",
    });

    const lambdaIntegration = new integrations.HttpLambdaIntegration(
      "GraphqlIntegration",
      graphqlFunction,
    );

    const httpApi = new apigatewayv2.HttpApi(this, "GraphqlHttpApi", {
      defaultIntegration: lambdaIntegration,
    });

    new cdk.CfnOutput(this, "GraphqlApiUrl", {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      value: httpApi.url!,
      description: "GraphQL HTTP API Gateway URL",
    });

    new cdk.CfnOutput(this, "GraphqlApiDomain", {
      value: `${httpApi.apiId}.execute-api.${this.region}.amazonaws.com`,
      description: "GraphQL API Gateway domain name (for CloudFront origin)",
      exportName: `${this.stackName}-GraphqlApiDomain`,
    });
  }
}
