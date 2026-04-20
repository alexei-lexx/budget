import * as cdk from "aws-cdk-lib";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { IUserPoolClient, UserPool } from "aws-cdk-lib/aws-cognito";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import { defaultLambdaOptions } from "./default-lambda-options";

export interface BackendCdkStackProps extends cdk.StackProps {
  authClaimNamespace: string;
  bedrockConnectionTimeout: number;
  bedrockMaxTokens: number;
  bedrockModelId: string;
  bedrockRequestTimeout: number;
  bedrockTemperature: number;
  lambdaMemorySizeMb?: number;
  lambdaTimeoutSeconds?: number;
  nodeEnv: string;
  userPool: UserPool; // IUserPool doesn't have the userPoolProviderUrl property
  userPoolClient: IUserPoolClient;
}

export class BackendCdkStack extends cdk.Stack {
  public readonly httpApi: apigatewayv2.IHttpApi;

  constructor(scope: Construct, id: string, props: BackendCdkStackProps) {
    super(scope, id, props);

    const {
      authClaimNamespace,
      bedrockConnectionTimeout,
      bedrockMaxTokens,
      bedrockModelId,
      bedrockRequestTimeout,
      bedrockTemperature,
      lambdaMemorySizeMb,
      lambdaTimeoutSeconds,
      nodeEnv,
      userPool,
      userPoolClient,
    } = props;

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

    const chatMessagesTable = new dynamodb.Table(this, "ChatMessagesTable", {
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      sortKey: {
        name: "sessionSortKey",
        type: dynamodb.AttributeType.STRING,
      },
      timeToLiveAttribute: "expiresAt",
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
        AUTH_CLAIM_NAMESPACE: authClaimNamespace,
        AUTH_CLIENT_ID: userPoolClient.userPoolClientId,
        AUTH_ISSUER: userPool.userPoolProviderUrl,
        AWS_BEDROCK_CONNECTION_TIMEOUT: bedrockConnectionTimeout.toString(),
        AWS_BEDROCK_MAX_TOKENS: bedrockMaxTokens.toString(),
        AWS_BEDROCK_MODEL_ID: bedrockModelId,
        AWS_BEDROCK_REQUEST_TIMEOUT: bedrockRequestTimeout.toString(),
        AWS_BEDROCK_TEMPERATURE: bedrockTemperature.toString(),
        NODE_ENV: nodeEnv,
        ACCOUNTS_TABLE_NAME: accountsTable.tableName,
        CATEGORIES_TABLE_NAME: categoriesTable.tableName,
        CHAT_MESSAGES_TABLE_NAME: chatMessagesTable.tableName,
        MIGRATIONS_TABLE_NAME: migrationsTable.tableName,
        TELEGRAM_BOTS_TABLE_NAME: telegramBotsTable.tableName,
        TRANSACTIONS_TABLE_NAME: transactionsTable.tableName,
        USERS_TABLE_NAME: usersTable.tableName,
      },
      ...defaultLambdaOptions({ lambdaMemorySizeMb, lambdaTimeoutSeconds }),
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
    chatMessagesTable.grantReadWriteData(backgroundJobFunction);
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
    chatMessagesTable.grantReadWriteData(webFunction);
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

    // Allow all Lambdas to read runtime config from SSM Parameter Store at cold start.
    // The bootstrap module resolves explicit paths under this prefix.
    const appConfigParameterArn = cdk.Arn.format(
      {
        service: "ssm",
        resource: "parameter",
        resourceName: `manual/budget/${nodeEnv}/*`,
      },
      this,
    );

    const readAppConfigPolicy = new iam.PolicyStatement({
      actions: ["ssm:GetParameters"],
      resources: [appConfigParameterArn],
    });

    webFunction.addToRolePolicy(readAppConfigPolicy);
    backgroundJobFunction.addToRolePolicy(readAppConfigPolicy);
    migrationFunction.addToRolePolicy(readAppConfigPolicy);

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
