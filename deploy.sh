set -e

echo "Switching to backend directory..."
cd backend

echo "Building backend..."
npm install
npm run build

echo "Switching to backend-cdk directory..."
cd ../backend-cdk

echo "Deploying backend..."
npm install
npm run deploy

echo "Switching to frontend-cdk directory..."
cd ../frontend-cdk

echo "Preparing frontend infrastructure..."
npm install
npm run deploy
S3_BUCKET=$(cat cdk-outputs.json | jq -r '.FrontendCdkStack.S3BucketName')
CLOUDFRONT_DISTRIBUTION_ID=$(cat cdk-outputs.json | jq -r '.FrontendCdkStack.CloudFrontDistributionId // empty')

echo "Switching to frontend directory..."
cd ../frontend

echo "Building frontend..."
npm install
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
