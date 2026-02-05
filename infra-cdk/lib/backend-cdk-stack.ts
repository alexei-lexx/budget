import * as cdk from "aws-cdk-lib";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

export class BackendCdkStack extends cdk.Stack {
  public readonly httpApi: apigatewayv2.HttpApi;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const logRetention = logs.RetentionDays.ONE_WEEK;

    const commonTableOptions: Partial<dynamodb.TableProps> = {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      deletionProtection: true,
    };

    const usersTable = new dynamodb.Table(this, "UsersTable", {
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      ...commonTableOptions,
    });

    usersTable.addGlobalSecondaryIndex({
      indexName: "EmailIndex",
      partitionKey: {
        name: "email",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const accountsTable = new dynamodb.Table(this, "AccountsTable", {
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "id", type: dynamodb.AttributeType.STRING },
      ...commonTableOptions,
    });

    const categoriesTable = new dynamodb.Table(this, "CategoriesTable", {
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "id", type: dynamodb.AttributeType.STRING },
      ...commonTableOptions,
    });

    const transactionsTable = new dynamodb.Table(this, "TransactionsTable", {
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "id", type: dynamodb.AttributeType.STRING },
      ...commonTableOptions,
    });

    transactionsTable.addGlobalSecondaryIndex({
      indexName: "UserCreatedAtSortableIndex",
      partitionKey: {
        name: "userId",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "createdAtSortable",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    transactionsTable.addGlobalSecondaryIndex({
      indexName: "UserDateIndex",
      partitionKey: {
        name: "userId",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "date",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const migrationsTable = new dynamodb.Table(this, "MigrationsTable", {
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      ...commonTableOptions,
    });

    const functionConfig: Omit<lambda.FunctionProps, "handler"> = {
      runtime: lambda.Runtime.NODEJS_24_X,
      code: lambda.Code.fromAsset("../backend/dist"),
      environment: {
        AUTH_AUDIENCE: process.env.AUTH_AUDIENCE || "",
        AUTH_ISSUER: process.env.AUTH_ISSUER || "",
        AUTH_CLAIM_NAMESPACE: process.env.AUTH_CLAIM_NAMESPACE || "",
        AWS_BEDROCK_MAX_TOKENS: process.env.AWS_BEDROCK_MAX_TOKENS || "",
        AWS_BEDROCK_MODEL_ID: process.env.AWS_BEDROCK_MODEL_ID || "",
        AWS_BEDROCK_TEMPERATURE: process.env.AWS_BEDROCK_TEMPERATURE || "",
        NODE_ENV: process.env.NODE_ENV || "",
        ACCOUNTS_TABLE_NAME: accountsTable.tableName,
        CATEGORIES_TABLE_NAME: categoriesTable.tableName,
        MIGRATIONS_TABLE_NAME: migrationsTable.tableName,
        TRANSACTIONS_TABLE_NAME: transactionsTable.tableName,
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

    const graphqlLogGroup = new logs.LogGroup(this, "GraphqlFunctionLogs", {
      retention: logRetention,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create custom role with explicit permissions to avoid managed policy warnings
    const graphqlRole = new iam.Role(this, "GraphqlFunctionRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      description: "Custom role for GraphQL Lambda function",
    });

    const graphqlFunction = new lambda.Function(this, "GraphqlEndpoint", {
      ...functionConfig,
      handler: "graphql.handler",
      logGroup: graphqlLogGroup,
      role: graphqlRole,
    });

    // Grant permissions explicitly since we're using a custom role
    graphqlLogGroup.grantWrite(graphqlFunction);

    accountsTable.grantReadWriteData(graphqlFunction);
    categoriesTable.grantReadWriteData(graphqlFunction);
    transactionsTable.grantReadWriteData(graphqlFunction);
    usersTable.grantReadWriteData(graphqlFunction);

    // Allow the GraphQL Lambda to invoke Bedrock models
    graphqlFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["bedrock:InvokeModel"],
        resources: ["*"],
      }),
    );

    const migrationLogGroup = new logs.LogGroup(this, "MigrationFunctionLogs", {
      retention: logRetention,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create custom role with explicit permissions to avoid managed policy warnings
    const migrationRole = new iam.Role(this, "MigrationFunctionRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      description: "Custom role for Migration Lambda function",
    });

    const migrationFunction = new lambda.Function(this, "MigrationRunner", {
      ...functionConfig,
      handler: "migrate.handler",
      timeout: cdk.Duration.minutes(15),
      logGroup: migrationLogGroup,
      role: migrationRole,
    });

    // Grant permissions explicitly since we're using a custom role
    migrationLogGroup.grantWrite(migrationFunction);

    migrationsTable.grantReadWriteData(migrationFunction);
    accountsTable.grantReadWriteData(migrationFunction);
    categoriesTable.grantReadWriteData(migrationFunction);
    transactionsTable.grantReadWriteData(migrationFunction);
    usersTable.grantReadWriteData(migrationFunction);

    // Used by deploy.sh to invoke the migration Lambda after deploy.
    new cdk.CfnOutput(this, "MigrationFunctionName", {
      value: migrationFunction.functionName,
      description:
        "Migration Lambda function name used by deploy.sh for migration invocation",
      exportName: `${this.stackName}-MigrationFunctionName`,
    });

    const lambdaIntegration = new integrations.HttpLambdaIntegration(
      "GraphqlIntegration",
      graphqlFunction,
    );

    const accessLogGroup = new logs.LogGroup(this, "GraphqlApiAccessLogs", {
      retention: logRetention,
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

    this.httpApi = httpApi;
  }
}
