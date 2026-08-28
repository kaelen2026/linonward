import { z } from "zod";

export const healthReportSchema = z.object({
  status: z.literal("ok"),
  version: z.string(),
  uptimeSeconds: z.number().nonnegative(),
  startedAt: z.iso.datetime(),
});

export type HealthReport = z.infer<typeof healthReportSchema>;
