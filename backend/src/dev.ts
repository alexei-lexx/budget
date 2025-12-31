import { startStandaloneServer } from "@apollo/server/standalone";
import { createContext, server } from "./server";

(async () => {
  const { url } = await startStandaloneServer(server, {
    listen: { port: 4000 },
    context: async ({ req }) => createContext(req),
  });

  console.log(`Server ready at: ${url}`);
})();
