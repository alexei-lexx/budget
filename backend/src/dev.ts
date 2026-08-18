import { expressMiddleware } from "@as-integrations/express5";
import { NodeStreamableHTTPServerTransport } from "@modelcontextprotocol/node";
import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import { createAuthenticatedMcpServer } from "./mcp/server";
import { server as apolloServer, createContext } from "./server";

const PORT = 4000;

(async () => {
  await apolloServer.start();

  const app = express();

  app.use(
    "/graphql",
    cors(),
    bodyParser.json(),
    expressMiddleware(apolloServer, {
      context: async ({ req }) => createContext({ headers: req.headers }),
    }),
  );

  app.all("/mcp", bodyParser.json(), async (req, res) => {
    const token = typeof req.query.token === "string" ? req.query.token : null;
    const mcpServer = await createAuthenticatedMcpServer(token);

    if (!mcpServer) {
      res.status(401).send("Unauthorized");
      return;
    }

    const transport = new NodeStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    await mcpServer.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  app.listen(PORT, () => {
    console.log(`Server ready at: http://localhost:${PORT}/`);
  });
})();
