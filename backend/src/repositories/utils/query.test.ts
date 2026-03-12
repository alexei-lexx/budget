import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { ZodError, z } from "zod";
import { paginateQuery } from "./query";

describe("paginateQuery", () => {
  const testSchema = z.object({
    id: z.string(),
    name: z.string(),
  });

  type TestItem = z.infer<typeof testSchema>;

  it("validates and returns valid items successfully", async () => {
    const mockClient = {
      send: jest.fn().mockResolvedValue({
        Items: [
          { id: "1", name: "Test" },
          { id: "2", name: "Test2" },
        ],
      }),
    } as unknown as DynamoDBDocumentClient;

    const result = await paginateQuery({
      client: mockClient,
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
      send: jest.fn().mockResolvedValue({
        Items: [
          { id: "1" }, // Invalid (missing name) - should fail here
          { id: "2", name: "Test" }, // Would be valid but shouldn't be processed
        ],
      }),
    } as unknown as DynamoDBDocumentClient;

    await expect(
      paginateQuery({
        client: mockClient,
        params: { TableName: "test" },
        schema: testSchema,
      }),
    ).rejects.toThrow(ZodError);
  });

  it("includes validation error details for missing required fields", async () => {
    const mockClient = {
      send: jest.fn().mockResolvedValue({
        Items: [
          { id: "1" }, // Missing 'name'
        ],
      }),
    } as unknown as DynamoDBDocumentClient;

    try {
      await paginateQuery({
        client: mockClient,
        params: { TableName: "test" },
        schema: testSchema,
      });

      fail("Expected ZodError to be thrown");
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
      send: jest.fn().mockResolvedValue({
        Items: [
          { id: "1", name: 123 }, // Type mismatch: number instead of string
        ],
      }),
    } as unknown as DynamoDBDocumentClient;

    try {
      await paginateQuery({
        client: mockClient,
        params: { TableName: "test" },
        schema: testSchema,
      });

      fail("Expected ZodError to be thrown");
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
      send: jest.fn().mockResolvedValue({
        Items: [
          { id: "1", name: "Test1" },
          { id: "2", name: "Test2" },
        ],
      }),
    } as unknown as DynamoDBDocumentClient;

    const result = await paginateQuery<TestItem>({
      client: mockClient,
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
      send: jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First batch: valid items with LastEvaluatedKey
          return Promise.resolve({
            Items: [{ id: "1", name: "Test1" }],
            LastEvaluatedKey: { id: "1" },
          });
        } else {
          // Second batch: invalid item (should fail)
          return Promise.resolve({
            Items: [{ id: "2" }], // Missing 'name'
          });
        }
      }),
    } as unknown as DynamoDBDocumentClient;

    await expect(
      paginateQuery({
        client: mockClient,
        params: { TableName: "test" },
        schema: testSchema,
      }),
    ).rejects.toThrow(ZodError);
  });

  it("returns empty array for no items", async () => {
    const mockClient = {
      send: jest.fn().mockResolvedValue({
        Items: [],
      }),
    } as unknown as DynamoDBDocumentClient;

    const result = await paginateQuery({
      client: mockClient,
      params: { TableName: "test" },
      schema: testSchema,
    });

    expect(result.items).toHaveLength(0);
    expect(result.hasNextPage).toBe(false);
  });
});
