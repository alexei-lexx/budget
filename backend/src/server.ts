import { ApolloServer } from "@apollo/server";
import { readFileSync } from "fs";
import { resolvers } from "./resolvers";

const typeDefs = readFileSync("./src/schema.graphql", { encoding: "utf-8" });

export const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true, // Enable introspection for development
});
