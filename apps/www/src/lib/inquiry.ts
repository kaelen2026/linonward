import type { Locale } from "@/lib/i18n";

/**
 * The browser half of the contact form's contract with `apps/api`.
 *
 * The limits below mirror `inquiryInputSchema` in
 * `apps/api/src/modules/contact/schema.ts`. They are duplicated on purpose: the
 * point is instant feedback while typing, not a second source of truth. The
 * server validates every submission again and stays authoritative — if these
 * two ever drift, the server wins and `submitInquiry` reports its verdict as
 * `invalid`.
 */
export const inquiryLimits = {
  name: { max: 80 },
  email: { max: 254 },
  company: { max: 120 },
  message: { min: 10, max: 2000 },
} as const;

/** Rendered in form order, which is also the order errors are announced in. */
export const inquiryFields = ["name", "email", "company", "message"] as const;

export type InquiryField = (typeof inquiryFields)[number];

export type InquiryDraft = Record<InquiryField, string>;

/**
 * What is wrong with a field, not how to say it — the wording lives in
 * `src/content/site.ts` so both locales can phrase it themselves.
 */
export type InquiryIssue = "required" | "invalidEmail" | "tooShort" | "tooLong" | "invalid";

export type InquiryIssues = Partial<Record<InquiryField, InquiryIssue>>;

export const emptyInquiryDraft: InquiryDraft = { name: "", email: "", company: "", message: "" };

// Deliberately loose. A regex that chases RFC 5322 rejects addresses that work,
// which is a worse failure here than passing one to the server that doesn't.
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Every problem with the draft at once, so one submit surfaces the whole list. */
export function validateInquiry(draft: InquiryDraft): InquiryIssues {
  const issues: InquiryIssues = {};
  const name = draft.name.trim();
  const email = draft.email.trim();
  const company = draft.company.trim();
  const message = draft.message.trim();

  if (!name) {
    issues.name = "required";
  } else if (name.length > inquiryLimits.name.max) {
    issues.name = "tooLong";
  }

  if (!email) {
    issues.email = "required";
  } else if (email.length > inquiryLimits.email.max || !emailPattern.test(email)) {
    issues.email = "invalidEmail";
  }

  if (company.length > inquiryLimits.company.max) {
    issues.company = "tooLong";
  }

  if (!message) {
    issues.message = "required";
  } else if (message.length < inquiryLimits.message.min) {
    issues.message = "tooShort";
  } else if (message.length > inquiryLimits.message.max) {
    issues.message = "tooLong";
  }

  return issues;
}

export type InquirySubmission =
  | { status: "created"; id?: string }
  | { status: "invalid"; issues: InquiryIssues }
  | { status: "rateLimited" }
  | { status: "failed" };

type SubmitOptions = {
  /** Origin of `apps/api`; a trailing slash is tolerated. */
  baseUrl: string;
  fetch?: typeof globalThis.fetch;
};

function isInquiryField(value: unknown): value is InquiryField {
  return (inquiryFields as readonly unknown[]).includes(value);
}

/** Reads the API's one error envelope; anything unrecognised yields no issues. */
function issuesFromErrorBody(body: unknown): InquiryIssues {
  const issues: InquiryIssues = {};
  const details = (body as { error?: { details?: unknown } } | null)?.error?.details;

  if (!Array.isArray(details)) {
    return issues;
  }

  for (const detail of details) {
    const path = (detail as { path?: unknown } | null)?.path;
    if (isInquiryField(path)) {
      // The client already checked the shape, so a 400 means the mirror above
      // drifted from the schema. There is no code to map back, only the field.
      issues[path] = "invalid";
    }
  }

  return issues;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Submits the draft straight from the browser to `apps/api`.
 *
 * Deliberately not proxied through a Next route handler: the API's rate limiter
 * keys on the client address, so a server-side hop would put every visitor in
 * one bucket and let a single submitter spend the whole site's budget. That is
 * why the API ships `CORS_ALLOWED_ORIGINS`.
 *
 * Never throws — every failure is a value the form can render.
 */
export async function submitInquiry(
  draft: InquiryDraft,
  locale: Locale,
  { baseUrl, fetch = globalThis.fetch }: SubmitOptions,
): Promise<InquirySubmission> {
  const company = draft.company.trim();
  const body = {
    name: draft.name.trim(),
    email: draft.email.trim(),
    message: draft.message.trim(),
    locale,
    // The schema has company optional, and `.trim().max()` would happily accept
    // an empty string — so an untouched field is left out rather than stored.
    ...(company ? { company } : {}),
  };

  let response: Response;
  try {
    response = await fetch(`${baseUrl.replace(/\/+$/, "")}/contact/inquiries`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return { status: "failed" };
  }

  if (response.status === 201) {
    const created = (await readJson(response)) as { id?: unknown } | null;
    // The inquiry is stored either way; a body we cannot read costs the
    // reference number, not the submission.
    return typeof created?.id === "string"
      ? { status: "created", id: created.id }
      : { status: "created" };
  }

  if (response.status === 400) {
    return { status: "invalid", issues: issuesFromErrorBody(await readJson(response)) };
  }

  if (response.status === 429) {
    return { status: "rateLimited" };
  }

  return { status: "failed" };
}
