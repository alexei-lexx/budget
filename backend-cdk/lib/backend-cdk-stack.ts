import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as logs from "aws-cdk-lib/aws-logs";

export class BackendCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const usersTable = new dynamodb.Table(this, "UsersTable", {
      tableName: process.env.USERS_TABLE_NAME || "",
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    usersTable.addGlobalSecondaryIndex({
      indexName: "Auth0UserIdIndex",
      partitionKey: {
        name: "auth0UserId",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const accountsTable = new dynamodb.Table(this, "AccountsTable", {
      tableName: process.env.ACCOUNTS_TABLE_NAME || "",
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const categoriesTable = new dynamodb.Table(this, "CategoriesTable", {
      tableName: process.env.CATEGORIES_TABLE_NAME || "",
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const functionConfig: lambda.FunctionProps = {
      runtime: lambda.Runtime.NODEJS_22_X,
      code: lambda.Code.fromAsset("../backend/dist"),
      handler: "lambda.handler",
      environment: {
        AUTH0_AUDIENCE: process.env.AUTH0_AUDIENCE || "",
        AUTH0_DOMAIN: process.env.AUTH0_DOMAIN || "",
        NODE_ENV: process.env.NODE_ENV || "",
        ACCOUNTS_TABLE_NAME: accountsTable.tableName,
        CATEGORIES_TABLE_NAME: categoriesTable.tableName,
        USERS_TABLE_NAME: usersTable.tableName,
      },
      tracing: lambda.Tracing.ACTIVE,
      ...(process.env.LAMBDA_TIMEOUT_SECONDS && {
        timeout: cdk.Duration.seconds(
          parseInt(process.env.LAMBDA_TIMEOUT_SECONDS, 10),
        ),
      }),
      ...(process.env.LAMBDA_MEMORY_SIZE && {
        memorySize: parseInt(process.env.LAMBDA_MEMORY_SIZE, 10),
      }),
    };

    const graphqlFunction = new lambda.Function(
      this,
      "GraphqlEndpoint",
      functionConfig,
    );

    accountsTable.grantReadWriteData(graphqlFunction);
    categoriesTable.grantReadWriteData(graphqlFunction);
    usersTable.grantReadWriteData(graphqlFunction);

    const lambdaIntegration = new integrations.HttpLambdaIntegration(
      "GraphqlIntegration",
      graphqlFunction,
    );

    const accessLogGroup = new logs.LogGroup(this, "GraphqlApiAccessLogs", {
      logGroupName: `/aws/apigateway/${this.stackName}-graphql-api`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const httpApi = new apigatewayv2.HttpApi(this, "GraphqlHttpApi", {
      defaultIntegration: lambdaIntegration,
    });

    const stage = httpApi.defaultStage?.node
      .defaultChild as apigatewayv2.CfnStage;
    if (stage) {
      stage.accessLogSettings = {
        destinationArn: accessLogGroup.logGroupArn,
        format: JSON.stringify({
          requestId: "$context.requestId",
          ip: "$context.identity.sourceIp",
          requestTime: "$context.requestTime",
          httpMethod: "$context.httpMethod",
          routeKey: "$context.routeKey",
          status: "$context.status",
          protocol: "$context.protocol",
          responseLength: "$context.responseLength",
          responseLatency: "$context.responseLatency",
          integrationLatency: "$context.integrationLatency",
          error: {
            message: "$context.error.message",
            messageString: "$context.error.messageString",
          },
        }),
      };
    }

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
