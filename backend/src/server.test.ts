import { ApolloServer } from "@apollo/server";
import { describe, expect, it } from "vitest";
import { server } from "./server";

describe("server", () => {
  // Happy path

  it("exports ApolloServer instance", () => {
    // Act & Assert
    expect(server).toBeInstanceOf(ApolloServer);
  });
});
