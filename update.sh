git pull
cd isifu-cms-admin
npm install
npm run build
cd ../isifu-cms-backend
npm install
npm run prisma:generate
npm run prisma:deploy
npm run build
echo "Update completed successfully!"