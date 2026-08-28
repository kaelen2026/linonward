import { type InquiryInput, inquiryLimits, inquiryLocales } from "@linonward/contracts/contact";
import { z } from "zod";

/**
 * The wire contract for the website's contact form. Lives beside the module it
 * serves, so a field is added in one place and validated at the edge.
 */
export const inquiryInputSchema = z.object({
  name: z.string().trim().min(1).max(inquiryLimits.name.max),
  email: z.email().max(inquiryLimits.email.max),
  company: z.string().trim().max(inquiryLimits.company.max).optional(),
  message: z.string().trim().min(inquiryLimits.message.min).max(inquiryLimits.message.max),
  // The website ships zh and en; anything else has no template to reply with.
  locale: z.enum(inquiryLocales).default("zh"),
}) satisfies z.ZodType<InquiryInput>;

export type { InquiryInput } from "@linonward/contracts/contact";
