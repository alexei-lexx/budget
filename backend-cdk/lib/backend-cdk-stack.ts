import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";

export class BackendCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const graphqlFunction = new lambda.Function(this, "GraphqlEndpoint", {
      runtime: lambda.Runtime.NODEJS_22_X,
      code: lambda.Code.fromAsset("../backend/dist"),
      handler: "lambda.handler",
    });

    const graphqlFunctionUrl = graphqlFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    });

    new cdk.CfnOutput(this, "graphqlFunctionUrlOutput", {
      value: graphqlFunctionUrl.url,
    });
  }
}
