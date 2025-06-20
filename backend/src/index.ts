import { startStandaloneServer } from "@apollo/server/standalone";
import { server, createContext } from "./server";

(async () => {
  const { url } = await startStandaloneServer(server, {
    listen: { port: 4000 },
    context: async ({ req }) => createContext(req),
  });

  console.log(`ACCOUNTS_TABLE_NAME: ${process.env.ACCOUNTS_TABLE_NAME}`);
  console.log(`AUTH0_AUDIENCE: ${process.env.AUTH0_AUDIENCE}`);
  console.log(`AUTH0_DOMAIN: ${process.env.AUTH0_DOMAIN}`);
  console.log(`AWS_ACCESS_KEY_ID: ${process.env.AWS_ACCESS_KEY_ID}`);
  console.log(`AWS_REGION: ${process.env.AWS_REGION}`);
  console.log(`DYNAMODB_ENDPOINT: ${process.env.DYNAMODB_ENDPOINT}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`USERS_TABLE_NAME: ${process.env.USERS_TABLE_NAME}`);

  console.log(`Server ready at: ${url}`);
})();
