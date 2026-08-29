import { z } from "zod";

export const webSessionSchema = z.object({
  user: z
    .object({
      email: z.email(),
      id: z.string().min(1),
      name: z.string(),
    })
    .transform((user) => ({
      ...user,
      name: user.name.trim() || user.email,
    })),
});

export type WebSession = z.infer<typeof webSessionSchema>;
