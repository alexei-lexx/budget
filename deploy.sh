set -e

# Use ENV from environment variable, default to production
if [ -z "$ENV" ]; then
  ENV="production"
fi

# Validate ENV to avoid invalid stack names, SSM paths, and filenames
case "$ENV" in
  ''|*[!A-Za-z0-9-]*)
    echo "ERROR: ENV value '$ENV' is invalid. ENV must match: ^[A-Za-z0-9-]+$"
    exit 1
    ;;
esac
echo "Deploying to environment: $ENV"

NODE_ENV="$ENV"

echo "Fetching AUTH_CLAIM_NAMESPACE from /manual/budget/$ENV/auth/claim-namespace in AWS SSM Parameter Store..."
AUTH_CLAIM_NAMESPACE=$(aws ssm get-parameter --name "/manual/budget/$ENV/auth/claim-namespace" --query 'Parameter.Value' --output text)
if [ -z "$AUTH_CLAIM_NAMESPACE" ] || [ "$AUTH_CLAIM_NAMESPACE" = "null" ]; then
  echo "ERROR: Parameter /manual/budget/$ENV/auth/claim-namespace must be configured in AWS SSM Parameter Store"
  exit 1
fi
echo "AUTH_CLAIM_NAMESPACE=$AUTH_CLAIM_NAMESPACE"

echo "Fetching AUTH_DOMAIN_PREFIX from /manual/budget/$ENV/auth/domain-prefix in AWS SSM Parameter Store..."
AUTH_DOMAIN_PREFIX=$(aws ssm get-parameter --name "/manual/budget/$ENV/auth/domain-prefix" --query 'Parameter.Value' --output text)
if [ -z "$AUTH_DOMAIN_PREFIX" ] || [ "$AUTH_DOMAIN_PREFIX" = "null" ]; then
  echo "ERROR: Parameter /manual/budget/$ENV/auth/domain-prefix must be configured in AWS SSM Parameter Store"
  exit 1
fi
echo "AUTH_DOMAIN_PREFIX=$AUTH_DOMAIN_PREFIX"

echo "Fetching AUTH_SCOPE from /manual/budget/$ENV/auth/scope in AWS SSM Parameter Store..."
AUTH_SCOPE=$(aws ssm get-parameter --name "/manual/budget/$ENV/auth/scope" --query 'Parameter.Value' --output text)
if [ -z "$AUTH_SCOPE" ] || [ "$AUTH_SCOPE" = "null" ]; then
  echo "ERROR: Parameter /manual/budget/$ENV/auth/scope must be configured in AWS SSM Parameter Store"
  exit 1
fi
echo "AUTH_SCOPE=$AUTH_SCOPE"

echo "Fetching LAMBDA_MEMORY_SIZE from /manual/budget/$ENV/lambda/memory-size in AWS SSM Parameter Store..."
LAMBDA_MEMORY_SIZE=$(aws ssm get-parameter --name "/manual/budget/$ENV/lambda/memory-size" --query 'Parameter.Value' --output text)
if [ -z "$LAMBDA_MEMORY_SIZE" ] || [ "$LAMBDA_MEMORY_SIZE" = "null" ]; then
  echo "ERROR: Parameter /manual/budget/$ENV/lambda/memory-size must be configured in AWS SSM Parameter Store"
  exit 1
fi
echo "LAMBDA_MEMORY_SIZE=$LAMBDA_MEMORY_SIZE"

echo "Fetching LAMBDA_TIMEOUT_SECONDS from /manual/budget/$ENV/lambda/timeout-seconds in AWS SSM Parameter Store..."
LAMBDA_TIMEOUT_SECONDS=$(aws ssm get-parameter --name "/manual/budget/$ENV/lambda/timeout-seconds" --query 'Parameter.Value' --output text)
if [ -z "$LAMBDA_TIMEOUT_SECONDS" ] || [ "$LAMBDA_TIMEOUT_SECONDS" = "null" ]; then
  echo "ERROR: Parameter /manual/budget/$ENV/lambda/timeout-seconds must be configured in AWS SSM Parameter Store"
  exit 1
fi
echo "LAMBDA_TIMEOUT_SECONDS=$LAMBDA_TIMEOUT_SECONDS"

echo "Fetching AWS_BEDROCK_MODEL_ID from /manual/budget/$ENV/bedrock/model-id in AWS SSM Parameter Store..."
AWS_BEDROCK_MODEL_ID=$(aws ssm get-parameter --name "/manual/budget/$ENV/bedrock/model-id" --query 'Parameter.Value' --output text)
if [ -z "$AWS_BEDROCK_MODEL_ID" ] || [ "$AWS_BEDROCK_MODEL_ID" = "null" ]; then
  echo "ERROR: Parameter /manual/budget/$ENV/bedrock/model-id must be configured in AWS SSM Parameter Store"
  exit 1
fi
echo "AWS_BEDROCK_MODEL_ID=$AWS_BEDROCK_MODEL_ID"

echo "Fetching AWS_BEDROCK_MAX_TOKENS from /manual/budget/$ENV/bedrock/max-tokens in AWS SSM Parameter Store..."
AWS_BEDROCK_MAX_TOKENS=$(aws ssm get-parameter --name "/manual/budget/$ENV/bedrock/max-tokens" --query 'Parameter.Value' --output text)
if [ -z "$AWS_BEDROCK_MAX_TOKENS" ] || [ "$AWS_BEDROCK_MAX_TOKENS" = "null" ]; then
  echo "ERROR: Parameter /manual/budget/$ENV/bedrock/max-tokens must be configured in AWS SSM Parameter Store"
  exit 1
fi
echo "AWS_BEDROCK_MAX_TOKENS=$AWS_BEDROCK_MAX_TOKENS"

echo "Fetching AWS_BEDROCK_TEMPERATURE from /manual/budget/$ENV/bedrock/temperature in AWS SSM Parameter Store..."
AWS_BEDROCK_TEMPERATURE=$(aws ssm get-parameter --name "/manual/budget/$ENV/bedrock/temperature" --query 'Parameter.Value' --output text)
if [ -z "$AWS_BEDROCK_TEMPERATURE" ] || [ "$AWS_BEDROCK_TEMPERATURE" = "null" ]; then
  echo "ERROR: Parameter /manual/budget/$ENV/bedrock/temperature must be configured in AWS SSM Parameter Store"
  exit 1
fi
echo "AWS_BEDROCK_TEMPERATURE=$AWS_BEDROCK_TEMPERATURE"

echo "Switching to backend directory..."
cd backend

echo "Building backend..."
npm install
npm run build

echo "Switching to infra-cdk directory..."
cd ../infra-cdk

echo "Installing infra-cdk dependencies..."
npm install

# ============================================================================
# Two-Phase Deployment
# ============================================================================
# Problem (chicken-and-egg):
#   - Cognito callback/logout URLs must point to CloudFront URL (frontend)
#   - CloudFront URL doesn't exist until after frontend deployment
#
# Solution (two-phase deployment):
#   Phase 1: Deploy all infrastructure without callback/logout URLs
#            - Cognito allows creation without URLs (they're optional)
#            - All stacks deploy successfully
#            - CloudFront URL is now known from CDK outputs
#   Phase 2: Set Cognito callback/logout URLs with CloudFront URL via AWS CLI
#            - CloudFormation won't overwrite URLs set externally
#            - URLs persist across subsequent CDK deployments
# ============================================================================

# Phase 1: Deploy infrastructure without callback/logout URLs
CDK_OUTPUT_FILE="cdk-outputs.$ENV.json"

echo "Deploying infrastructure (Phase 1)..."
env AUTH_CLAIM_NAMESPACE="$AUTH_CLAIM_NAMESPACE" \
    AUTH_DOMAIN_PREFIX="$AUTH_DOMAIN_PREFIX" \
    AWS_BEDROCK_MAX_TOKENS="$AWS_BEDROCK_MAX_TOKENS" \
    AWS_BEDROCK_MODEL_ID="$AWS_BEDROCK_MODEL_ID" \
    AWS_BEDROCK_TEMPERATURE="$AWS_BEDROCK_TEMPERATURE" \
    LAMBDA_MEMORY_SIZE="$LAMBDA_MEMORY_SIZE" \
    LAMBDA_TIMEOUT_SECONDS="$LAMBDA_TIMEOUT_SECONDS" \
    NODE_ENV="$NODE_ENV" \
  npm run deploy -- --outputs-file "$CDK_OUTPUT_FILE"

echo "Extracting auth configuration from CDK outputs..."
AUTH_ISSUER=$(cat "$CDK_OUTPUT_FILE" | jq -r '."'"$ENV"'-BudgetAuth".AuthIssuer // empty')
AUTH_CLIENT_ID=$(cat "$CDK_OUTPUT_FILE" | jq -r '."'"$ENV"'-BudgetAuth".UserPoolClientId // empty')

if [ -z "$AUTH_ISSUER" ] || [ "$AUTH_ISSUER" = "null" ]; then
  echo "ERROR: AuthIssuer not found in CDK outputs from auth stack"
  echo "Auth stack deployment may have failed or outputs are misconfigured"
  exit 1
fi
echo "AUTH_ISSUER=$AUTH_ISSUER"

if [ -z "$AUTH_CLIENT_ID" ] || [ "$AUTH_CLIENT_ID" = "null" ]; then
  echo "ERROR: UserPoolClientId not found in CDK outputs from auth stack"
  echo "Auth stack deployment may have failed or outputs are misconfigured"
  exit 1
fi
echo "AUTH_CLIENT_ID=$AUTH_CLIENT_ID"

# ============================================================================
# Phase 2: Set Cognito callback/logout URLs
# ============================================================================
# Now that frontend is deployed, we know the CloudFront URL.
# Set Cognito callback/logout URLs via AWS CLI.
# Note: CloudFormation won't overwrite these URLs on subsequent deployments.
# ============================================================================
CLOUDFRONT_URL=$(cat "$CDK_OUTPUT_FILE" | jq -r '."'"$ENV"'-BudgetFrontend".CloudFrontFullURL // empty')

if [ -n "$CLOUDFRONT_URL" ] && [ "$CLOUDFRONT_URL" != "null" ]; then
  echo "CloudFront URL: $CLOUDFRONT_URL"

  # Extract User Pool ID from CDK outputs
  USER_POOL_ID=$(cat "$CDK_OUTPUT_FILE" | jq -r '."'"$ENV"'-BudgetAuth".UserPoolId // empty')
  if [ -z "$USER_POOL_ID" ] || [ "$USER_POOL_ID" = "null" ]; then
    echo "ERROR: UserPoolId not found in CDK outputs from auth stack"
    exit 1
  fi
  echo "User Pool ID: $USER_POOL_ID"

  echo "Phase 2: Setting Cognito callback/logout URLs..."

  # Set callback/logout URLs with CloudFront URL
  # Note: This update happens outside of CloudFormation, so URLs persist across CDK deployments
  aws cognito-idp update-user-pool-client \
    --user-pool-id "$USER_POOL_ID" \
    --client-id "$AUTH_CLIENT_ID" \
    --callback-urls "$CLOUDFRONT_URL" \
    --logout-urls "$CLOUDFRONT_URL" \
    --allowed-o-auth-flows "code" \
    --allowed-o-auth-scopes $(echo "$AUTH_SCOPE" | tr ' ' '\n') \
    --allowed-o-auth-flows-user-pool-client \
    --supported-identity-providers "COGNITO" \
    --no-cli-pager

  echo "Cognito callback/logout URLs configured successfully"
else
  echo "CloudFront URL not found - skipping Cognito URL update"
fi

echo "Running migrations..."
MIGRATION_FUNCTION_NAME=$(cat "$CDK_OUTPUT_FILE" | jq -r '."'"$ENV"'-BudgetBackend".MigrationFunctionName // empty')

if [ -z "$MIGRATION_FUNCTION_NAME" ] || [ "$MIGRATION_FUNCTION_NAME" = "null" ]; then
  echo "ERROR: Migration function name not found in CDK outputs"
  echo "Backend deployment may have failed or migration function not defined"
  exit 1
fi

echo "Invoking migration Lambda function: $MIGRATION_FUNCTION_NAME"
aws lambda invoke \
  --function-name "$MIGRATION_FUNCTION_NAME" \
  --invocation-type RequestResponse \
  --payload '{}' \
  --cli-binary-format raw-in-base64-out \
  migration-response.json

LAMBDA_EXIT_CODE=$?

if [ $LAMBDA_EXIT_CODE -ne 0 ]; then
  echo "ERROR: Migration Lambda invocation failed (exit code: $LAMBDA_EXIT_CODE)"
  cat migration-response.json
  rm -f migration-response.json
  exit 1
fi

echo "Migration response:"
cat migration-response.json
echo ""

MIGRATION_STATUS=$(cat migration-response.json | jq -r '.statusCode // empty')

if [ "$MIGRATION_STATUS" != "200" ]; then
  echo "ERROR: Migrations failed with status code: $MIGRATION_STATUS"
  cat migration-response.json | jq -r '.body // empty'
  rm -f migration-response.json
  exit 1
fi

echo "Migrations completed successfully!"
rm -f migration-response.json

echo "Extracting frontend deployment outputs..."
S3_BUCKET=$(cat "$CDK_OUTPUT_FILE" | jq -r '."'"$ENV"'-BudgetFrontend".S3BucketName')
CLOUDFRONT_DISTRIBUTION_ID=$(cat "$CDK_OUTPUT_FILE" | jq -r '."'"$ENV"'-BudgetFrontend".CloudFrontDistributionId // empty')

echo "Switching to frontend directory..."
cd ../frontend

echo "Building frontend..."
npm install
env VITE_AUTH_CLIENT_ID="$AUTH_CLIENT_ID" \
    VITE_AUTH_ISSUER="$AUTH_ISSUER" \
    VITE_AUTH_SCOPE="$AUTH_SCOPE" \
    VITE_GRAPHQL_ENDPOINT="/graphql" \
  npm run build

echo "Deploying frontend..."
aws s3 sync dist/ s3://"$S3_BUCKET" --delete

if [ -n "$CLOUDFRONT_DISTRIBUTION_ID" ] && [ "$CLOUDFRONT_DISTRIBUTION_ID" != "null" ]; then
  echo "Invalidating CloudFront cache..."
  INVALIDATION_ID=$(aws cloudfront create-invalidation --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" --paths "/*" --query 'Invalidation.Id' --output text)
  echo "Waiting for cache invalidation to complete..."
  aws cloudfront wait invalidation-completed --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" --id "$INVALIDATION_ID"
  echo "Cache invalidation completed!"
else
  echo "CloudFront distribution ID not found - skipping cache invalidation"
  echo "You may need to redeploy the frontend infrastructure to get the distribution ID"
fi

echo "Done!"
