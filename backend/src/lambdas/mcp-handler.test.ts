import { McpServer } from "@modelcontextprotocol/server";
import { APIGatewayProxyEventV2 } from "aws-lambda";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAuthenticatedMcpServer } from "../mcp/server";
import { mcpHandler } from "./mcp-handler";

vi.mock("../mcp/server");

function buildEvent(
  overrides: Partial<APIGatewayProxyEventV2> = {},
): APIGatewayProxyEventV2 {
  return {
    version: "2.0",
    routeKey: "POST /mcp",
    rawPath: "/mcp",
    rawQueryString: "",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
    },
    isBase64Encoded: false,
    requestContext: {
      accountId: "123456789012",
      apiId: "api-id",
      domainName: "mcp.internal",
      domainPrefix: "mcp",
      http: {
        method: "POST",
        path: "/mcp",
        protocol: "HTTP/1.1",
        sourceIp: "127.0.0.1",
        userAgent: "vitest",
      },
      requestId: "request-id",
      routeKey: "POST /mcp",
      stage: "$default",
      time: "27/Jul/2026:00:00:00 +0000",
      timeEpoch: 1785110400000,
    },
    ...overrides,
  };
}

const initializeRequestBody = JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "test-client", version: "1.0.0" },
  },
});

describe("mcpHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Happy path

  it.each([
    { isBase64Encoded: false, body: initializeRequestBody },
    {
      isBase64Encoded: true,
      body: Buffer.from(initializeRequestBody, "utf-8").toString("base64"),
    },
  ])(
    "proxies MCP request to authenticated server (isBase64Encoded: $isBase64Encoded)",
    async ({ isBase64Encoded, body }) => {
      // Arrange
      // Authenticated server returned for valid token
      vi.mocked(createAuthenticatedMcpServer).mockResolvedValue(
        new McpServer({ name: "test-mcp-server", version: "0.0.0" }),
      );

      const event = buildEvent({
        queryStringParameters: { token: "valid-token" },
        body,
        isBase64Encoded,
      });

      // Act
      const result = await mcpHandler(event);

      // Assert
      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body ?? "");
      expect(responseBody.result.serverInfo).toEqual({
        name: "test-mcp-server",
        version: "0.0.0",
      });
      expect(createAuthenticatedMcpServer).toHaveBeenCalledWith("valid-token");
    },
  );

  // Validation failures

  it("returns 401 when no authenticated server is returned", async () => {
    // Arrange
    vi.mocked(createAuthenticatedMcpServer).mockResolvedValue(null);

    const event = buildEvent({ body: initializeRequestBody });

    // Act
    const result = await mcpHandler(event);

    // Assert
    expect(result).toEqual({ statusCode: 401, body: "Unauthorized" });
    expect(createAuthenticatedMcpServer).toHaveBeenCalledWith(null);
  });
});
