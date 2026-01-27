set -e

NODE_ENV=production

echo "Fetching AUTH_AUDIENCE from /manual/budget/production/auth/audience in AWS SSM Parameter Store..."
AUTH_AUDIENCE=$(aws ssm get-parameter --name /manual/budget/production/auth/audience --query 'Parameter.Value' --output text)
if [ -z "$AUTH_AUDIENCE" ] || [ "$AUTH_AUDIENCE" = "null" ]; then
  echo "ERROR: Parameter /manual/budget/production/auth/audience must be configured in AWS SSM Parameter Store"
  exit 1
fi
echo "AUTH_AUDIENCE=$AUTH_AUDIENCE"

echo "Fetching AUTH_CLAIM_NAMESPACE from /manual/budget/production/auth/claim-namespace in AWS SSM Parameter Store..."
AUTH_CLAIM_NAMESPACE=$(aws ssm get-parameter --name /manual/budget/production/auth/claim-namespace --query 'Parameter.Value' --output text)
if [ -z "$AUTH_CLAIM_NAMESPACE" ] || [ "$AUTH_CLAIM_NAMESPACE" = "null" ]; then
  echo "ERROR: Parameter /manual/budget/production/auth/claim-namespace must be configured in AWS SSM Parameter Store"
  exit 1
fi
echo "AUTH_CLAIM_NAMESPACE=$AUTH_CLAIM_NAMESPACE"

echo "Fetching AUTH_CLIENT_ID from /manual/budget/production/auth/client-id in AWS SSM Parameter Store..."
AUTH_CLIENT_ID=$(aws ssm get-parameter --name /manual/budget/production/auth/client-id --query 'Parameter.Value' --output text)
if [ -z "$AUTH_CLIENT_ID" ] || [ "$AUTH_CLIENT_ID" = "null" ]; then
  echo "ERROR: Parameter /manual/budget/production/auth/client-id must be configured in AWS SSM Parameter Store"
  exit 1
fi
echo "AUTH_CLIENT_ID=$AUTH_CLIENT_ID"

echo "Fetching AUTH_ISSUER from /manual/budget/production/auth/issuer in AWS SSM Parameter Store..."
AUTH_ISSUER=$(aws ssm get-parameter --name /manual/budget/production/auth/issuer --query 'Parameter.Value' --output text)
if [ -z "$AUTH_ISSUER" ] || [ "$AUTH_ISSUER" = "null" ]; then
  echo "ERROR: Parameter /manual/budget/production/auth/issuer must be configured in AWS SSM Parameter Store"
  exit 1
fi
echo "AUTH_ISSUER=$AUTH_ISSUER"

echo "Fetching AUTH_SCOPE from /manual/budget/production/auth/scope in AWS SSM Parameter Store..."
AUTH_SCOPE=$(aws ssm get-parameter --name /manual/budget/production/auth/scope --query 'Parameter.Value' --output text)
if [ -z "$AUTH_SCOPE" ] || [ "$AUTH_SCOPE" = "null" ]; then
  echo "ERROR: Parameter /manual/budget/production/auth/scope must be configured in AWS SSM Parameter Store"
  exit 1
fi
echo "AUTH_SCOPE=$AUTH_SCOPE"

echo "Fetching LAMBDA_MEMORY_SIZE from /manual/budget/production/lambda/memory-size in AWS SSM Parameter Store..."
LAMBDA_MEMORY_SIZE=$(aws ssm get-parameter --name /manual/budget/production/lambda/memory-size --query 'Parameter.Value' --output text)
if [ -z "$LAMBDA_MEMORY_SIZE" ] || [ "$LAMBDA_MEMORY_SIZE" = "null" ]; then
  echo "ERROR: Parameter /manual/budget/production/lambda/memory-size must be configured in AWS SSM Parameter Store"
  exit 1
fi
echo "LAMBDA_MEMORY_SIZE=$LAMBDA_MEMORY_SIZE"

echo "Fetching LAMBDA_TIMEOUT_SECONDS from /manual/budget/production/lambda/timeout-seconds in AWS SSM Parameter Store..."
LAMBDA_TIMEOUT_SECONDS=$(aws ssm get-parameter --name /manual/budget/production/lambda/timeout-seconds --query 'Parameter.Value' --output text)
if [ -z "$LAMBDA_TIMEOUT_SECONDS" ] || [ "$LAMBDA_TIMEOUT_SECONDS" = "null" ]; then
  echo "ERROR: Parameter /manual/budget/production/lambda/timeout-seconds must be configured in AWS SSM Parameter Store"
  exit 1
fi
echo "LAMBDA_TIMEOUT_SECONDS=$LAMBDA_TIMEOUT_SECONDS"

echo "Switching to backend directory..."
cd backend

echo "Building backend..."
npm install
npm run build

echo "Switching to infra-cdk directory..."
cd ../infra-cdk

echo "Installing infra-cdk dependencies..."
npm install

echo "Deploying infrastructure (backend and frontend)..."
env AUTH_AUDIENCE="$AUTH_AUDIENCE" \
    AUTH_CLAIM_NAMESPACE="$AUTH_CLAIM_NAMESPACE" \
    AUTH_ISSUER="$AUTH_ISSUER" \
    LAMBDA_MEMORY_SIZE="$LAMBDA_MEMORY_SIZE" \
    LAMBDA_TIMEOUT_SECONDS="$LAMBDA_TIMEOUT_SECONDS" \
    NODE_ENV="$NODE_ENV" \
  npm run deploy

echo "Running migrations..."
MIGRATION_FUNCTION_NAME=$(cat cdk-outputs.json | jq -r '."production-BudgetBackend".MigrationFunctionName // empty')

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
S3_BUCKET=$(cat cdk-outputs.json | jq -r '."production-BudgetFrontend".S3BucketName')
CLOUDFRONT_DISTRIBUTION_ID=$(cat cdk-outputs.json | jq -r '."production-BudgetFrontend".CloudFrontDistributionId // empty')

echo "Switching to frontend directory..."
cd ../frontend

echo "Building frontend..."
npm install
env VITE_AUTH_AUDIENCE="$AUTH_AUDIENCE" \
    VITE_AUTH_CLIENT_ID="$AUTH_CLIENT_ID" \
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
