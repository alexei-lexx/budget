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
S3_BUCKET=$(cat outputs.json | jq -r '.FrontendCdkStack.S3BucketName')

echo "Switching to frontend directory..."
cd ../frontend

echo "Building frontend..."
npm install
npm run build

echo "Deploying frontend..."
aws s3 sync dist/ s3://"$S3_BUCKET" --delete

echo "Done!"
