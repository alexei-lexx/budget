set -e

echo "Building backend..."
cd backend
npm install
npm run build

echo "Deploying backend..."
cd ../backend-cdk
npm install
npm run deploy

echo "Done!"
