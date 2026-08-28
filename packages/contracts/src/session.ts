import { z } from "zod";

export const webSessionSchema = z.object({
  user: z.object({
    email: z.email(),
    id: z.string().min(1),
    name: z.string().min(1),
  }),
});

export type WebSession = z.infer<typeof webSessionSchema>;
