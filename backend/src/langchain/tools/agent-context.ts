import { z } from "zod";

export const agentContextSchema = z.object({
  userId: z.uuid(),
});

export type AgentContext = z.infer<typeof agentContextSchema>;
