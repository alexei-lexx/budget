import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { describe, expect, it, jest } from "@jest/globals";
import { ZodError, z } from "zod";
import { DynBaseRepository, QueryResult } from "./dyn-base-repository";

const testSchema = z.object({
  id: z.string(),
  name: z.string(),
});

type TestItem = z.infer<typeof testSchema>;

class TestRepo extends DynBaseRepository {
  constructor(mockClient: DynamoDBDocumentClient) {
    super("test-table");
    // @ts-expect-error - test override of readonly client to inject a mock
    this.client = mockClient;
  }

  async run<T>(args: {
    params: Parameters<TestRepo["paginateQueryProxy"]>[0]["params"];
    pageSize?: number;
    schema: z.ZodType<T>;
  }): Promise<QueryResult<T>> {
    return this.paginateQuery<T>(args);
  }

  // Helper used only to derive the param type above; never called.
  private async paginateQueryProxy(args: {
    params: Parameters<DynBaseRepository["paginateQuery"]>[0]["params"];
  }): Promise<void> {
    void args;
  }
}

describe("DynBaseRepository.paginateQuery", () => {
  it("validates and returns valid items successfully", async () => {
    const mockClient = {
      send: jest.fn<() => Promise<unknown>>().mockResolvedValue({
        Items: [
          { id: "1", name: "Test" },
          { id: "2", name: "Test2" },
        ],
      }),
    } as unknown as DynamoDBDocumentClient;

    const repo = new TestRepo(mockClient);
    const result = await repo.run({
      params: { TableName: "test" },
      schema: testSchema,
    });

    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toEqual({ id: "1", name: "Test" });
    expect(result.items[1]).toEqual({ id: "2", name: "Test2" });
    expect(result.hasNextPage).toBe(false);
  });

  it("fails fast on first invalid item and stops processing", async () => {
    const mockClient = {
      send: jest.fn<() => Promise<unknown>>().mockResolvedValue({
        Items: [{ id: "1" }, { id: "2", name: "Test" }],
      }),
    } as unknown as DynamoDBDocumentClient;

    const repo = new TestRepo(mockClient);

    await expect(
      repo.run({ params: { TableName: "test" }, schema: testSchema }),
    ).rejects.toThrow(ZodError);
  });

  it("includes validation error details for missing required fields", async () => {
    const mockClient = {
      send: jest.fn<() => Promise<unknown>>().mockResolvedValue({
        Items: [{ id: "1" }],
      }),
    } as unknown as DynamoDBDocumentClient;

    const repo = new TestRepo(mockClient);

    try {
      await repo.run({ params: { TableName: "test" }, schema: testSchema });
      throw new Error("Expected ZodError to be thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ZodError);
      const zodError = error as ZodError;
      expect(zodError.issues).toContainEqual(
        expect.objectContaining({
          path: ["name"],
          code: expect.any(String),
        }),
      );
    }
  });

  it("includes validation error details for type mismatches", async () => {
    const mockClient = {
      send: jest.fn<() => Promise<unknown>>().mockResolvedValue({
        Items: [{ id: "1", name: 123 }],
      }),
    } as unknown as DynamoDBDocumentClient;

    const repo = new TestRepo(mockClient);

    try {
      await repo.run({ params: { TableName: "test" }, schema: testSchema });
      throw new Error("Expected ZodError to be thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ZodError);
      const zodError = error as ZodError;
      expect(zodError.issues).toContainEqual(
        expect.objectContaining({
          path: ["name"],
          code: "invalid_type",
        }),
      );
    }
  });

  it("validates all items when paginating with pageSize", async () => {
    const mockClient = {
      send: jest.fn<() => Promise<unknown>>().mockResolvedValue({
        Items: [
          { id: "1", name: "Test1" },
          { id: "2", name: "Test2" },
        ],
      }),
    } as unknown as DynamoDBDocumentClient;

    const repo = new TestRepo(mockClient);
    const result = await repo.run<TestItem>({
      params: { TableName: "test" },
      pageSize: 2,
      schema: testSchema,
    });

    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toEqual({ id: "1", name: "Test1" });
    expect(result.items[1]).toEqual({ id: "2", name: "Test2" });
  });

  it("validates items during recursive pagination", async () => {
    let callCount = 0;
    const mockClient = {
      send: jest.fn<() => Promise<unknown>>().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            Items: [{ id: "1", name: "Test1" }],
            LastEvaluatedKey: { id: "1" },
          });
        } else {
          return Promise.resolve({ Items: [{ id: "2" }] });
        }
      }),
    } as unknown as DynamoDBDocumentClient;

    const repo = new TestRepo(mockClient);

    await expect(
      repo.run({ params: { TableName: "test" }, schema: testSchema }),
    ).rejects.toThrow(ZodError);
  });

  it("returns empty array for no items", async () => {
    const mockClient = {
      send: jest.fn<() => Promise<unknown>>().mockResolvedValue({
        Items: [],
      }),
    } as unknown as DynamoDBDocumentClient;

    const repo = new TestRepo(mockClient);
    const result = await repo.run({
      params: { TableName: "test" },
      schema: testSchema,
    });

    expect(result.items).toHaveLength(0);
    expect(result.hasNextPage).toBe(false);
  });
});
