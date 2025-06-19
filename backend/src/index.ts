import { startStandaloneServer } from "@apollo/server/standalone";
import { server, createContext } from "./server";

(async () => {
  const { url } = await startStandaloneServer(server, {
    listen: { port: 4000 },
    context: async ({ req }) => createContext(req),
  });

  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`AUTH0_DOMAIN: ${process.env.AUTH0_DOMAIN}`);
  console.log(`Server ready at: ${url}`);
})();
