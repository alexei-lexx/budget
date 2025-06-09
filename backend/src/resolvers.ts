import { Resolvers } from "./__generated__/resolvers-types";

export const resolvers: Resolvers = {
  Query: {
    health: () => {
      const messages = ["OK", "All systems go", "Healthy"];
      const idx = Math.floor(Math.random() * messages.length);
      return messages[idx];
    },
  },
};
