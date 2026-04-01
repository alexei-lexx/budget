set -euo pipefail

# Use ENV from environment variable, default to production
if [ -z "${ENV:-}" ]; then
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

# Fetch an AWS SSM Parameter Store value safely with strict error handling and tracing.
#
# Behavior:
#   - Returns the parameter value if it exists and is non-empty
#   - Returns the provided default if:
#       • the parameter does not exist (ParameterNotFound)
#       • the parameter exists but is empty (or AWS returns "None")
#   - Fails hard on real AWS problems:
#       • AWS CLI not configured
#       • permission denied
#       • network/API errors
#
# Designed for: set -euo pipefail
#
# Usage:
#   VALUE=$(ssm_get_or_default "/path/to/param" "fallback") || exit $?

ssm_get_or_default() {
  # First argument: full SSM parameter name
  local name="$1"

  # Second argument: default value (optional)
  local def="${2-}"

  # Will capture either:
  #   - the parameter value (stdout)
  #   - or AWS error message (stderr redirected to stdout)
  local out

  # Will store the exit status of the aws command
  # (0 = success, non-zero = failure)
  local rc

  # Log what we are about to fetch (stderr keeps stdout clean for command substitution)
  echo "[ssm] fetching: $name" >&2

  # Call AWS SSM.
  #
  # --query 'Parameter.Value' extracts only the value
  # --output text avoids JSON formatting
  # 2>&1 merges stderr into stdout so we can inspect error messages
  out=$(aws ssm get-parameter \
          --name "$name" \
          --query 'Parameter.Value' \
          --output text 2>&1)

  # Immediately save the exit code of the aws command.
  # $? always refers to the most recently executed command.
  rc=$?

  # Show raw AWS result for debugging
  echo "[ssm] aws exit code: $rc" >&2
  echo "[ssm] raw output: $out" >&2

  # ------------------------------------------------------------------
  # SUCCESS PATH — AWS returned without error
  # ------------------------------------------------------------------
  if [[ $rc -eq 0 ]]; then
    # out now contains the parameter value (may be empty)

    # Use the value only if:
    #   - it is non-empty
    #   - and not the AWS placeholder string "None"
    if [[ -n "$out" && "$out" != "None" ]]; then
      echo "[ssm] value found → returning value" >&2
      printf '%s' "$out"
    else
      # Parameter exists but is empty → fall back to default
      echo "[ssm] value empty → using default" >&2
      printf '%s' "$def"
    fi
    return 0
  fi

  # ------------------------------------------------------------------
  # MISSING PARAMETER PATH — not a real failure
  # ------------------------------------------------------------------

  # If AWS explicitly reports ParameterNotFound,
  # treat this as expected and return the default.
  if grep -q 'ParameterNotFound' <<<"$out"; then
    echo "[ssm] parameter not found → using default" >&2
    printf '%s' "$def"
    return 0
  fi

  # ------------------------------------------------------------------
  # REAL ERROR PATH — must stop the script
  # ------------------------------------------------------------------

  # Any other error means something is genuinely wrong:
  # credentials missing, IAM denied, network issues, etc.
  echo "[ssm] fatal AWS error:" >&2
  echo "$out" >&2

  # Propagate the original AWS exit code
  return "$rc"
}

DEFAULT_AUTH_ALLOW_USER_REGISTRATION="true"
DEFAULT_AUTH_CLAIM_NAMESPACE="https://personal-budget-tracker"
DEFAULT_AUTH_DOMAIN_PREFIX="$ENV-budget-auth"
DEFAULT_AUTH_SCOPE="openid profile email"
DEFAULT_AWS_BEDROCK_CONNECTION_TIMEOUT="5000"
DEFAULT_AWS_BEDROCK_MAX_TOKENS="2000"
DEFAULT_AWS_BEDROCK_MODEL_ID="openai.gpt-oss-120b-1:0"
DEFAULT_AWS_BEDROCK_REQUEST_TIMEOUT="30000"
DEFAULT_AWS_BEDROCK_TEMPERATURE="0.2"
DEFAULT_AWS_LAMBDA_MEMORY_SIZE="512"
DEFAULT_AWS_LAMBDA_TIMEOUT_SECONDS="30"

AUTH_ALLOW_USER_REGISTRATION=$(ssm_get_or_default "/manual/budget/$ENV/auth/allow-user-registration" "$DEFAULT_AUTH_ALLOW_USER_REGISTRATION") || exit $?
echo "AUTH_ALLOW_USER_REGISTRATION=$AUTH_ALLOW_USER_REGISTRATION"

AUTH_CLAIM_NAMESPACE=$(ssm_get_or_default "/manual/budget/$ENV/auth/claim-namespace" "$DEFAULT_AUTH_CLAIM_NAMESPACE") || exit $?
echo "AUTH_CLAIM_NAMESPACE=$AUTH_CLAIM_NAMESPACE"

AUTH_DOMAIN_PREFIX=$(ssm_get_or_default "/manual/budget/$ENV/auth/domain-prefix" "$DEFAULT_AUTH_DOMAIN_PREFIX") || exit $?
echo "AUTH_DOMAIN_PREFIX=$AUTH_DOMAIN_PREFIX"

AUTH_SCOPE=$(ssm_get_or_default "/manual/budget/$ENV/auth/scope" "$DEFAULT_AUTH_SCOPE") || exit $?
echo "AUTH_SCOPE=$AUTH_SCOPE"

AWS_BEDROCK_CONNECTION_TIMEOUT=$(ssm_get_or_default "/manual/budget/$ENV/bedrock/connection-timeout" "$DEFAULT_AWS_BEDROCK_CONNECTION_TIMEOUT") || exit $?
echo "AWS_BEDROCK_CONNECTION_TIMEOUT=$AWS_BEDROCK_CONNECTION_TIMEOUT"

AWS_BEDROCK_MAX_TOKENS=$(ssm_get_or_default "/manual/budget/$ENV/bedrock/max-tokens" "$DEFAULT_AWS_BEDROCK_MAX_TOKENS") || exit $?
echo "AWS_BEDROCK_MAX_TOKENS=$AWS_BEDROCK_MAX_TOKENS"

AWS_BEDROCK_MODEL_ID=$(ssm_get_or_default "/manual/budget/$ENV/bedrock/model-id" "$DEFAULT_AWS_BEDROCK_MODEL_ID") || exit $?
echo "AWS_BEDROCK_MODEL_ID=$AWS_BEDROCK_MODEL_ID"

AWS_BEDROCK_REQUEST_TIMEOUT=$(ssm_get_or_default "/manual/budget/$ENV/bedrock/request-timeout" "$DEFAULT_AWS_BEDROCK_REQUEST_TIMEOUT") || exit $?
echo "AWS_BEDROCK_REQUEST_TIMEOUT=$AWS_BEDROCK_REQUEST_TIMEOUT"

AWS_BEDROCK_TEMPERATURE=$(ssm_get_or_default "/manual/budget/$ENV/bedrock/temperature" "$DEFAULT_AWS_BEDROCK_TEMPERATURE") || exit $?
echo "AWS_BEDROCK_TEMPERATURE=$AWS_BEDROCK_TEMPERATURE"

AWS_LAMBDA_MEMORY_SIZE=$(ssm_get_or_default "/manual/budget/$ENV/lambda/memory-size" "$DEFAULT_AWS_LAMBDA_MEMORY_SIZE") || exit $?
echo "AWS_LAMBDA_MEMORY_SIZE=$AWS_LAMBDA_MEMORY_SIZE"

AWS_LAMBDA_TIMEOUT_SECONDS=$(ssm_get_or_default "/manual/budget/$ENV/lambda/timeout-seconds" "$DEFAULT_AWS_LAMBDA_TIMEOUT_SECONDS") || exit $?
echo "AWS_LAMBDA_TIMEOUT_SECONDS=$AWS_LAMBDA_TIMEOUT_SECONDS"

echo "Switching to backend directory..."
cd backend

echo "Building backend..."
npm install
npm run build

echo "Switching to infra-cdk directory..."
cd ../infra-cdk

echo "Installing infra-cdk dependencies..."
npm install

CDK_OUTPUT_FILE="cdk-outputs.$ENV.json"

echo "Deploying infrastructure..."
env AUTH_ALLOW_USER_REGISTRATION="$AUTH_ALLOW_USER_REGISTRATION" \
    AUTH_CLAIM_NAMESPACE="$AUTH_CLAIM_NAMESPACE" \
    AUTH_DOMAIN_PREFIX="$AUTH_DOMAIN_PREFIX" \
    AWS_BEDROCK_CONNECTION_TIMEOUT="$AWS_BEDROCK_CONNECTION_TIMEOUT" \
    AWS_BEDROCK_MAX_TOKENS="$AWS_BEDROCK_MAX_TOKENS" \
    AWS_BEDROCK_MODEL_ID="$AWS_BEDROCK_MODEL_ID" \
    AWS_BEDROCK_REQUEST_TIMEOUT="$AWS_BEDROCK_REQUEST_TIMEOUT" \
    AWS_BEDROCK_TEMPERATURE="$AWS_BEDROCK_TEMPERATURE" \
    AWS_LAMBDA_MEMORY_SIZE="$AWS_LAMBDA_MEMORY_SIZE" \
    AWS_LAMBDA_TIMEOUT_SECONDS="$AWS_LAMBDA_TIMEOUT_SECONDS" \
    NODE_ENV="$NODE_ENV" \
  npm run deploy -- --outputs-file "$CDK_OUTPUT_FILE"

echo "Extracting auth configuration from CDK outputs..."
AUTH_ISSUER=$(cat "$CDK_OUTPUT_FILE" | jq -r '."'"$ENV"'-BudgetAuth".AuthIssuer // empty')
AUTH_CLIENT_ID=$(cat "$CDK_OUTPUT_FILE" | jq -r '."'"$ENV"'-BudgetAuth".UserPoolClientId // empty')
AUTH_UI_URL=$(cat "$CDK_OUTPUT_FILE" | jq -r '."'"$ENV"'-BudgetAuth".UserPoolDomainUrl // empty')

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

if [ -z "$AUTH_UI_URL" ] || [ "$AUTH_UI_URL" = "null" ]; then
  echo "ERROR: UserPoolDomainUrl not found in CDK outputs from auth stack"
  echo "Auth stack deployment may have failed or outputs are misconfigured"
  exit 1
fi
echo "AUTH_UI_URL=$AUTH_UI_URL"

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
    VITE_AUTH_UI_URL="$AUTH_UI_URL" \
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
