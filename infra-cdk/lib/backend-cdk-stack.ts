import * as cdk from "aws-cdk-lib";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { IUserPoolClient, UserPool } from "aws-cdk-lib/aws-cognito";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import { requireEnv } from "./require-env";
import { defaultLambdaOptions } from "./utils";

export interface BackendCdkStackProps extends cdk.StackProps {
  userPool: UserPool; // IUserPool doesn't have the userPoolProviderUrl property
  userPoolClient: IUserPoolClient;
}

export class BackendCdkStack extends cdk.Stack {
  public readonly httpApi: apigatewayv2.IHttpApi;

  constructor(scope: Construct, id: string, props: BackendCdkStackProps) {
    super(scope, id, props);

    const nodeEnv = requireEnv("NODE_ENV");

    // Add tags to all resources in this stack
    cdk.Tags.of(this).add("environment", nodeEnv);

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

    const telegramBotsTable = new dynamodb.Table(this, "TelegramBotsTable", {
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "id", type: dynamodb.AttributeType.STRING },
      ...commonTableOptions,
    });

    telegramBotsTable.addGlobalSecondaryIndex({
      indexName: "WebhookSecretIndex",
      partitionKey: {
        name: "webhookSecret",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const functionConfig: Omit<lambda.FunctionProps, "handler"> = {
      runtime: lambda.Runtime.NODEJS_24_X,
      code: lambda.Code.fromAsset("../backend/dist"),
      environment: {
        AUTH_CLAIM_NAMESPACE: process.env.AUTH_CLAIM_NAMESPACE || "",
        AUTH_CLIENT_ID: props.userPoolClient.userPoolClientId,
        AUTH_ISSUER: props.userPool.userPoolProviderUrl,
        AWS_BEDROCK_MAX_TOKENS: process.env.AWS_BEDROCK_MAX_TOKENS || "",
        AWS_BEDROCK_MODEL_ID: process.env.AWS_BEDROCK_MODEL_ID || "",
        AWS_BEDROCK_TEMPERATURE: process.env.AWS_BEDROCK_TEMPERATURE || "",
        NODE_ENV: process.env.NODE_ENV || "",
        ACCOUNTS_TABLE_NAME: accountsTable.tableName,
        CATEGORIES_TABLE_NAME: categoriesTable.tableName,
        MIGRATIONS_TABLE_NAME: migrationsTable.tableName,
        TELEGRAM_BOTS_TABLE_NAME: telegramBotsTable.tableName,
        TRANSACTIONS_TABLE_NAME: transactionsTable.tableName,
        USERS_TABLE_NAME: usersTable.tableName,
      },
      ...defaultLambdaOptions(),
    };

    const backgroundJobLogGroup = new logs.LogGroup(
      this,
      "BackgroundJobFunctionLogs",
      {
        retention: logRetention,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      },
    );

    const backgroundJobRole = new iam.Role(this, "BackgroundJobFunctionRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      description: "Custom role for Background Job Lambda function",
    });

    const backgroundJobFunction = new lambda.Function(
      this,
      "BackgroundJobFunction",
      {
        ...functionConfig,
        handler: "background-job-lambda.handler",
        timeout: cdk.Duration.minutes(5),
        logGroup: backgroundJobLogGroup,
        role: backgroundJobRole,
      },
    );

    // Grant permissions explicitly since we're using a custom role, to avoid managed policy warnings
    backgroundJobLogGroup.grantWrite(backgroundJobFunction);

    accountsTable.grantReadWriteData(backgroundJobFunction);
    categoriesTable.grantReadWriteData(backgroundJobFunction);
    telegramBotsTable.grantReadWriteData(backgroundJobFunction);
    transactionsTable.grantReadWriteData(backgroundJobFunction);
    usersTable.grantReadWriteData(backgroundJobFunction);

    // Allow Background Job Lambda to invoke Bedrock models
    backgroundJobFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["bedrock:InvokeModel"],
        resources: ["*"],
      }),
    );

    const webLogGroup = new logs.LogGroup(this, "WebFunctionLogs", {
      retention: logRetention,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create custom role with explicit permissions to avoid managed policy warnings
    const webRole = new iam.Role(this, "WebFunctionRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      description: "Custom role for Web Lambda function (GraphQL)",
    });

    const webFunction = new lambda.Function(this, "WebEndpoint", {
      ...functionConfig,
      handler: "web-lambda.handler",
      logGroup: webLogGroup,
      role: webRole,
      environment: {
        ...functionConfig.environment,
        BACKGROUND_JOB_FUNCTION_NAME: backgroundJobFunction.functionName,
      },
    });

    // Grant permissions explicitly since we're using a custom role
    webLogGroup.grantWrite(webFunction);

    accountsTable.grantReadWriteData(webFunction);
    categoriesTable.grantReadWriteData(webFunction);
    telegramBotsTable.grantReadWriteData(webFunction);
    transactionsTable.grantReadWriteData(webFunction);
    usersTable.grantReadWriteData(webFunction);

    // Allow the Web Lambda to invoke Bedrock models
    webFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["bedrock:InvokeModel"],
        resources: ["*"],
      }),
    );

    // Allow the Web Lambda to asynchronously invoke the Background Job Lambda
    webFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["lambda:InvokeFunction"],
        resources: [backgroundJobFunction.functionArn],
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
      handler: "migrate-lambda.handler",
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
      "WebFunctionIntegration",
      webFunction,
    );

    const accessLogGroup = new logs.LogGroup(this, "WebAccessLogs", {
      retention: logRetention,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // TODO: Rename to WebHttpApi
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

    // Pass the API Gateway URL as the webhook base URL for Telegram
    webFunction.addEnvironment("WEBHOOK_BASE_URL", httpApi.apiEndpoint);

    this.httpApi = httpApi;
  }
}
