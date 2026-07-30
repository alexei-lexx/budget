import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveUserRepository } from "../dependencies";
import { fakeUser } from "../utils/test-utils/models/user-fakes";
import { createMockUserRepository } from "../utils/test-utils/repositories/user-repository-mocks";
import { createAuthenticatedMcpServer } from "./server";

vi.mock("../dependencies");

// McpServer has no public accessor for its registered tools.
// Ask over the real protocol instead, the same way a real client would.
async function listToolNames(server: McpServer): Promise<string[]> {
  // In-process transport pair: writes on one side arrive directly on the other.
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();

  const client = new Client({ name: "test-client", version: "1.0.0" });

  // Connecting performs the real MCP initialize handshake over the transport.
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);

  // Sends a real tools/list request.
  // The server answers with its registered tools.
  const { tools } = await client.listTools();

  return tools.map((tool) => tool.name);
}

describe("createAuthenticatedMcpServer", () => {
  const mockUserRepository = createMockUserRepository();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(resolveUserRepository).mockReturnValue(mockUserRepository);
  });

  // Happy path

  it("returns server exposing all tools when token matches user", async () => {
    // Arrange
    const user = fakeUser();
    // Token matches user's stored mcpToken
    mockUserRepository.findOneByMcpToken.mockResolvedValue(user);

    // Act
    const server = await createAuthenticatedMcpServer(user.mcpToken);

    // Assert
    if (!server) throw new Error("expected server to be created");

    const toolNames = await listToolNames(server);
    expect(toolNames).toHaveLength(8);
    expect(toolNames).toEqual(
      expect.arrayContaining([
        "create_account",
        "create_category",
        "create_transaction",
        "get_accounts",
        "get_categories",
        "get_transactions",
        "update_account",
        "update_category",
      ]),
    );
  });

  // Validation failures

  it("returns null when token is missing", async () => {
    // Act
    const server = await createAuthenticatedMcpServer(null);

    // Assert
    expect(server).toBeNull();
    expect(mockUserRepository.findOneByMcpToken).not.toHaveBeenCalled();
  });

  it("returns null when token does not match any user", async () => {
    // Arrange
    mockUserRepository.findOneByMcpToken.mockResolvedValue(null);

    // Act
    const server = await createAuthenticatedMcpServer("unmatched-token");

    // Assert
    expect(server).toBeNull();
  });
});
