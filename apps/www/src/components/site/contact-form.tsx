"use client";

import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";
import { useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { SiteContent } from "@/content/site";
import type { Locale } from "@/lib/i18n";
import {
  emptyInquiryDraft,
  type InquiryDraft,
  type InquiryField,
  type InquiryIssues,
  type InquirySubmission,
  inquiryFields,
  submitInquiry,
  validateInquiry,
} from "@/lib/inquiry";

type ContactFormContent = SiteContent["contactForm"];

/** What went wrong with the submission as a whole, as opposed to one field. */
type FormStatus = "invalid" | "rateLimited" | "failed";

type ContactFormProps = {
  content: ContactFormContent;
  locale: Locale;
  /** Origin of `apps/api`, resolved on the server and passed down. */
  apiBaseUrl: string;
  /**
   * Injected so the form's behaviour can be tested without a network. The
   * default is the real call; the wire format is covered by `inquiry.test.ts`.
   */
  submit?: (
    draft: InquiryDraft,
    locale: Locale,
    options: { baseUrl: string },
  ) => Promise<InquirySubmission>;
};

function FormField({
  children,
  errorId,
  htmlFor,
  issue,
  label,
  optional,
}: {
  children: ReactNode;
  errorId: string;
  htmlFor: string;
  /** Already-localised text, or nothing when the field is fine. */
  issue?: string;
  label: string;
  optional?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>
        {label}
        {optional ? (
          <span className="text-xs font-normal text-muted-foreground">({optional})</span>
        ) : null}
      </Label>
      {children}
      {issue ? (
        // Referenced by the control's aria-describedby rather than given its own
        // alert role — four simultaneous alerts talk over each other.
        <p className="text-sm text-destructive" id={errorId}>
          {issue}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The website's one write path. Submits straight to `apps/api` from the
 * browser, because the API rate-limits per client address and a server-side
 * proxy would collapse every visitor into a single budget.
 */
export function ContactForm({
  apiBaseUrl,
  content,
  locale,
  submit = submitInquiry,
}: ContactFormProps) {
  const formId = useId();
  const [draft, setDraft] = useState<InquiryDraft>(emptyInquiryDraft);
  const [issues, setIssues] = useState<InquiryIssues>({});
  const [status, setStatus] = useState<FormStatus | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState<{ reference?: string } | null>(null);
  const controls = useRef<Partial<Record<InquiryField, HTMLElement | null>>>({});

  /** Sends the user to the problem instead of leaving them to hunt for it. */
  function focusFirstIssue(found: InquiryIssues) {
    const field = inquiryFields.find((candidate) => found[candidate]);
    if (field) {
      controls.current[field]?.focus();
    }
  }

  function update(field: InquiryField, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));

    if (!issues[field]) {
      return;
    }

    const remaining = { ...issues };
    delete remaining[field];
    setIssues(remaining);

    // The summary counts fields that still need fixing; with none left it lies.
    if (status === "invalid" && Object.keys(remaining).length === 0) {
      setStatus(null);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) {
      return;
    }

    const found = validateInquiry(draft);
    if (Object.keys(found).length > 0) {
      setIssues(found);
      setStatus("invalid");
      focusFirstIssue(found);
      return;
    }

    setIssues({});
    setStatus(null);
    setPending(true);

    const result = await submit(draft, locale, { baseUrl: apiBaseUrl });
    setPending(false);

    if (result.status === "created") {
      setSent({ reference: result.id });
      return;
    }

    if (result.status === "invalid") {
      // The server disagreed with the client mirror in `inquiry.ts`. Show the
      // summary either way, so an unmapped path is never a silent no-op.
      setIssues(result.issues);
      setStatus("invalid");
      focusFirstIssue(result.issues);
      return;
    }

    setStatus(result.status);
  }

  if (sent) {
    return (
      <div
        className="space-y-2 rounded-xl bg-card px-6 py-8 text-center ring-1 ring-foreground/10"
        role="status"
      >
        <CircleCheck aria-hidden="true" className="mx-auto size-6 text-teal-700" />
        <p className="font-heading text-lg">{content.status.successTitle}</p>
        <p className="text-sm text-muted-foreground">{content.status.successBody}</p>
        {sent.reference ? (
          <p className="text-xs text-muted-foreground">
            {content.status.reference} <span className="font-mono">{sent.reference}</span>
          </p>
        ) : null}
      </div>
    );
  }

  const fieldProps = (field: InquiryField) => ({
    id: `${formId}-${field}`,
    name: field,
    value: draft[field],
    placeholder: content.fields[field].placeholder,
    onChange: (event: { target: { value: string } }) => update(field, event.target.value),
    "aria-invalid": issues[field] ? true : undefined,
    "aria-describedby": issues[field] ? `${formId}-${field}-error` : undefined,
  });

  const fieldIssue = (field: InquiryField) => {
    const issue = issues[field];
    return issue ? content.issues[issue] : undefined;
  };

  return (
    // Our own validation drives the messages, so the browser's — untranslated
    // and inconsistent between engines — is turned off.
    <form className="space-y-5 text-left" noValidate onSubmit={handleSubmit}>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          errorId={`${formId}-name-error`}
          htmlFor={`${formId}-name`}
          issue={fieldIssue("name")}
          label={content.fields.name.label}
        >
          <Input
            {...fieldProps("name")}
            autoComplete="name"
            ref={(element) => {
              controls.current.name = element;
            }}
            required
          />
        </FormField>

        <FormField
          errorId={`${formId}-email-error`}
          htmlFor={`${formId}-email`}
          issue={fieldIssue("email")}
          label={content.fields.email.label}
        >
          <Input
            {...fieldProps("email")}
            autoComplete="email"
            ref={(element) => {
              controls.current.email = element;
            }}
            required
            type="email"
          />
        </FormField>
      </div>

      <FormField
        errorId={`${formId}-company-error`}
        htmlFor={`${formId}-company`}
        issue={fieldIssue("company")}
        label={content.fields.company.label}
        optional={content.optional}
      >
        <Input
          {...fieldProps("company")}
          autoComplete="organization"
          ref={(element) => {
            controls.current.company = element;
          }}
        />
      </FormField>

      <FormField
        errorId={`${formId}-message-error`}
        htmlFor={`${formId}-message`}
        issue={fieldIssue("message")}
        label={content.fields.message.label}
      >
        <Textarea
          {...fieldProps("message")}
          ref={(element) => {
            controls.current.message = element;
          }}
          required
          rows={4}
        />
      </FormField>

      {status ? (
        <p
          className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {content.status[status]}
        </p>
      ) : null}

      <Button
        className="w-full sm:w-auto"
        disabled={pending}
        size="lg"
        type="submit"
        variant="brand"
      >
        {pending ? (
          <>
            <LoaderCircle aria-hidden="true" className="animate-spin" data-icon="inline-start" />
            {content.submitting}
          </>
        ) : (
          content.submit
        )}
      </Button>
    </form>
  );
}
