import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { createAuthenticatedMcpServer } from "../mcp/server";

export async function mcpHandler(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> {
  const mcpServer = await createAuthenticatedMcpServer(
    event.queryStringParameters?.token ?? null,
  );

  if (!mcpServer) {
    return { statusCode: 401, body: "Unauthorized" };
  }

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  await mcpServer.connect(transport);

  const response = await transport.handleRequest(
    convertApiGatewayEventToNodeRequest(event),
  );

  return convertNodeResponseToApiGatewayResult(response);
}

function convertApiGatewayEventToNodeRequest(
  event: APIGatewayProxyEventV2,
): Request {
  const url = new URL(
    event.rawPath + (event.rawQueryString ? `?${event.rawQueryString}` : ""),
    "https://mcp.internal",
  );

  const method = event.requestContext.http.method;

  const headers = new Headers();
  for (const [key, value] of Object.entries(event.headers ?? {})) {
    if (value !== undefined) headers.set(key, value);
  }

  const body = event.body
    ? event.isBase64Encoded
      ? Buffer.from(event.body, "base64").toString("utf-8")
      : event.body
    : undefined;

  return new Request(url, {
    method,
    headers,
    body,
  });
}

async function convertNodeResponseToApiGatewayResult(
  response: Response,
): Promise<APIGatewayProxyStructuredResultV2> {
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return {
    statusCode: response.status,
    headers,
    body: await response.text(),
  };
}
