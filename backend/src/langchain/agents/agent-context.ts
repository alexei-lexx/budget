import { z } from "zod";

export const agentContextSchema = z.object({
  isVoiceInput: z.boolean().default(false),
  today: z.iso.date(),
  userId: z.uuid(),
});

export type AgentContext = z.infer<typeof agentContextSchema>;
