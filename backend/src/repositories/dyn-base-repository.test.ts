import {
  DynamoDBDocumentClient,
  QueryCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { describe, expect, it, jest } from "@jest/globals";
import { ZodError, z } from "zod";
import { DynBaseRepository, QueryResult } from "./dyn-base-repository";

const testSchema = z.object({
  id: z.string(),
  name: z.string(),
});

type TestItem = z.infer<typeof testSchema>;

class TestRepo extends DynBaseRepository {
  constructor(documentClient: DynamoDBDocumentClient) {
    super("test-table", documentClient);
  }

  async run<T>(args: {
    params: QueryCommandInput;
    pageSize?: number;
    schema: z.ZodType<T>;
  }): Promise<QueryResult<T>> {
    return this.paginateQuery<T>(args);
  }
}

describe("DynBaseRepository", () => {
  describe("paginateQuery", () => {
    // Happy path

    it("returns hydrated items when DynamoDB returns valid records", async () => {
      // Arrange
      // Single page of two valid records, no continuation key
      const mockClient = {
        send: jest.fn<() => Promise<unknown>>().mockResolvedValue({
          Items: [
            { id: "1", name: "Test" },
            { id: "2", name: "Test2" },
          ],
        }),
      } as unknown as DynamoDBDocumentClient;

      const repo = new TestRepo(mockClient);

      // Act
      const result = await repo.run({
        params: { TableName: "test" },
        schema: testSchema,
      });

      // Assert
      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toEqual({ id: "1", name: "Test" });
      expect(result.items[1]).toEqual({ id: "2", name: "Test2" });
      expect(result.hasNextPage).toBe(false);
    });

    it("returns hydrated items when paginating with pageSize", async () => {
      // Arrange
      // Single page returns exactly pageSize items, no continuation key
      const mockClient = {
        send: jest.fn<() => Promise<unknown>>().mockResolvedValue({
          Items: [
            { id: "1", name: "Test1" },
            { id: "2", name: "Test2" },
          ],
        }),
      } as unknown as DynamoDBDocumentClient;

      const repo = new TestRepo(mockClient);

      // Act
      const result = await repo.run<TestItem>({
        params: { TableName: "test" },
        pageSize: 2,
        schema: testSchema,
      });

      // Assert
      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toEqual({ id: "1", name: "Test1" });
      expect(result.items[1]).toEqual({ id: "2", name: "Test2" });
    });

    it("returns empty array when DynamoDB returns no items", async () => {
      // Arrange
      // Empty result set
      const mockClient = {
        send: jest.fn<() => Promise<unknown>>().mockResolvedValue({
          Items: [],
        }),
      } as unknown as DynamoDBDocumentClient;

      const repo = new TestRepo(mockClient);

      // Act
      const result = await repo.run({
        params: { TableName: "test" },
        schema: testSchema,
      });

      // Assert
      expect(result.items).toHaveLength(0);
      expect(result.hasNextPage).toBe(false);
    });

    // Validation failures

    it("throws ZodError on first invalid item and stops processing", async () => {
      // Arrange
      // First item missing required `name`; second would pass but must not be reached
      const mockClient = {
        send: jest.fn<() => Promise<unknown>>().mockResolvedValue({
          Items: [{ id: "1" }, { id: "2", name: "Test" }],
        }),
      } as unknown as DynamoDBDocumentClient;

      const repo = new TestRepo(mockClient);

      // Act & Assert
      await expect(
        repo.run({ params: { TableName: "test" }, schema: testSchema }),
      ).rejects.toThrow(ZodError);
    });

    it("includes Zod issue path when required field is missing", async () => {
      // Arrange
      // Single record missing required `name`
      const mockClient = {
        send: jest.fn<() => Promise<unknown>>().mockResolvedValue({
          Items: [{ id: "1" }],
        }),
      } as unknown as DynamoDBDocumentClient;

      const repo = new TestRepo(mockClient);

      // Act
      const promise = repo.run({
        params: { TableName: "test" },
        schema: testSchema,
      });

      // Assert
      await expect(promise).rejects.toBeInstanceOf(ZodError);
      await promise.catch((error: unknown) => {
        const zodError = error as ZodError;
        expect(zodError.issues).toContainEqual(
          expect.objectContaining({
            path: ["name"],
            code: expect.any(String),
          }),
        );
      });
    });

    it("includes Zod issue path when field type mismatches", async () => {
      // Arrange
      // Record where `name` has wrong type (number instead of string)
      const mockClient = {
        send: jest.fn<() => Promise<unknown>>().mockResolvedValue({
          Items: [{ id: "1", name: 123 }],
        }),
      } as unknown as DynamoDBDocumentClient;

      const repo = new TestRepo(mockClient);

      // Act
      const promise = repo.run({
        params: { TableName: "test" },
        schema: testSchema,
      });

      // Assert
      await expect(promise).rejects.toBeInstanceOf(ZodError);
      await promise.catch((error: unknown) => {
        const zodError = error as ZodError;
        expect(zodError.issues).toContainEqual(
          expect.objectContaining({
            path: ["name"],
            code: "invalid_type",
          }),
        );
      });
    });

    it("throws ZodError when invalid item appears in later page during recursion", async () => {
      // Arrange
      // First page returns valid item with continuation key, second page returns invalid item
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

      // Act & Assert
      await expect(
        repo.run({ params: { TableName: "test" }, schema: testSchema }),
      ).rejects.toThrow(ZodError);
    });
  });
});
