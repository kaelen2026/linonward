import { z } from "zod";

/**
 * The wire contract for the website's contact form. Lives beside the module it
 * serves, so a field is added in one place and validated at the edge.
 */
export const inquiryInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.email().max(254),
  company: z.string().trim().max(120).optional(),
  message: z.string().trim().min(10).max(2000),
  // The website ships zh and en; anything else has no template to reply with.
  locale: z.enum(["zh", "en"]).default("zh"),
});

export type InquiryInput = z.infer<typeof inquiryInputSchema>;
