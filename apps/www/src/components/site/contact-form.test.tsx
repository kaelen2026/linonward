import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ContactForm } from "@/components/site/contact-form";
import type { SiteContent } from "@/content/site";
import type { InquirySubmission } from "@/lib/inquiry";

/**
 * Sentinel copy rather than the real strings: these tests are about behaviour,
 * and asserting on shipped wording makes every copy edit a test failure.
 */
const content: SiteContent["contactForm"] = {
  heading: "Talk to us",
  intro: "Tell us what you measure today.",
  optional: "optional",
  submit: "Send",
  submitting: "Sending",
  fields: {
    name: { label: "Your name", placeholder: "name" },
    email: { label: "Work email", placeholder: "email" },
    company: { label: "Company", placeholder: "company" },
    message: { label: "What do you need", placeholder: "message" },
  },
  issues: {
    required: "REQUIRED",
    invalidEmail: "BAD_EMAIL",
    tooShort: "TOO_SHORT",
    tooLong: "TOO_LONG",
    invalid: "INVALID",
  },
  status: {
    invalid: "CHECK_FIELDS",
    rateLimited: "SLOW_DOWN",
    failed: "TRY_AGAIN",
    successTitle: "GOT_IT",
    successBody: "We will reply soon.",
    reference: "Reference",
  },
};

function renderForm(submission: InquirySubmission = { status: "created", id: "inq_1" }) {
  const submit = vi.fn<() => Promise<InquirySubmission>>().mockResolvedValue(submission);
  render(
    <ContactForm
      apiBaseUrl="https://api.example.com"
      content={content}
      locale="en"
      submit={submit}
    />,
  );
  return { submit, user: userEvent.setup() };
}

async function fillValidDraft(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Your name"), "Lin");
  await user.type(screen.getByLabelText("Work email"), "lin@example.com");
  await user.type(screen.getByLabelText(/What do you need/), "We need one honest revenue curve.");
}

describe("ContactForm", () => {
  it("labels every control so it can be reached without seeing the layout", () => {
    renderForm();

    expect(screen.getByLabelText("Your name")).toBeInTheDocument();
    expect(screen.getByLabelText("Work email")).toBeInTheDocument();
    expect(screen.getByLabelText(/Company/)).toBeInTheDocument();
    expect(screen.getByLabelText(/What do you need/)).toBeInTheDocument();
  });

  it("marks the one field the API treats as optional", () => {
    renderForm();

    expect(screen.getByLabelText(/Company/)).not.toBeRequired();
    expect(screen.getByLabelText("Your name")).toBeRequired();
  });

  it("refuses an empty draft without spending a request", async () => {
    const { submit, user } = renderForm();

    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(submit).not.toHaveBeenCalled();
    expect(await screen.findByRole("alert")).toHaveTextContent("CHECK_FIELDS");
  });

  it("ties each field to the reason it was rejected", async () => {
    const { user } = renderForm();

    await user.click(screen.getByRole("button", { name: "Send" }));

    const email = screen.getByLabelText("Work email");
    await waitFor(() => expect(email).toHaveAttribute("aria-invalid", "true"));

    const describedBy = email.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(String(describedBy))).toHaveTextContent("REQUIRED");
  });

  it("moves focus to the first field that needs fixing", async () => {
    const { user } = renderForm();

    await user.type(screen.getByLabelText("Your name"), "Lin");
    await user.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => expect(screen.getByLabelText("Work email")).toHaveFocus());
  });

  it("says why an address was rejected rather than only that it was", async () => {
    const { submit, user } = renderForm();

    await user.type(screen.getByLabelText("Your name"), "Lin");
    await user.type(screen.getByLabelText("Work email"), "lin@example");
    await user.type(screen.getByLabelText(/What do you need/), "We need one honest curve.");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText("BAD_EMAIL")).toBeInTheDocument();
    expect(submit).not.toHaveBeenCalled();
  });

  it("clears a field's error once it is corrected", async () => {
    const { user } = renderForm();

    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Your name"), "Lin");

    await waitFor(() =>
      expect(screen.getByLabelText("Your name")).not.toHaveAttribute("aria-invalid", "true"),
    );
  });

  it("hands the draft and the locale to the submitter", async () => {
    const { submit, user } = renderForm();

    await fillValidDraft(user);
    await user.type(screen.getByLabelText(/Company/), "Onward");
    await user.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() =>
      expect(submit).toHaveBeenCalledWith(
        {
          name: "Lin",
          email: "lin@example.com",
          company: "Onward",
          message: "We need one honest revenue curve.",
        },
        "en",
        { baseUrl: "https://api.example.com" },
      ),
    );
  });

  it("replaces the form with a confirmation once the inquiry is stored", async () => {
    const { user } = renderForm();

    await fillValidDraft(user);
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByRole("status")).toHaveTextContent("GOT_IT");
    expect(screen.queryByLabelText("Work email")).not.toBeInTheDocument();
  });

  it("shows the reference number so a submitter can quote it", async () => {
    const { user } = renderForm();

    await fillValidDraft(user);
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText(/inq_1/)).toBeInTheDocument();
  });

  it("confirms without a reference when the API returned no id", async () => {
    const { user } = renderForm({ status: "created" });

    await fillValidDraft(user);
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByRole("status")).toHaveTextContent("GOT_IT");
    expect(screen.queryByText("Reference")).not.toBeInTheDocument();
  });

  it("tells a throttled submitter to wait instead of blaming their input", async () => {
    const { user } = renderForm({ status: "rateLimited" });

    await fillValidDraft(user);
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("SLOW_DOWN");
  });

  it("keeps the draft when the request fails, so nothing is retyped", async () => {
    const { user } = renderForm({ status: "failed" });

    await fillValidDraft(user);
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("TRY_AGAIN");
    expect(screen.getByLabelText("Work email")).toHaveValue("lin@example.com");
  });

  it("surfaces a field the server rejected even though the client accepted it", async () => {
    const { user } = renderForm({ status: "invalid", issues: { email: "invalid" } });

    await fillValidDraft(user);
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText("INVALID")).toBeInTheDocument();
    expect(screen.getByLabelText("Work email")).toHaveAttribute("aria-invalid", "true");
  });

  it("blocks a second submit while the first is still in flight", async () => {
    let release: (submission: InquirySubmission) => void = () => {};
    const submit = vi
      .fn<() => Promise<InquirySubmission>>()
      .mockReturnValue(new Promise((resolve) => (release = resolve)));
    render(
      <ContactForm
        apiBaseUrl="https://api.example.com"
        content={content}
        locale="en"
        submit={submit}
      />,
    );
    const user = userEvent.setup();

    await fillValidDraft(user);
    await user.click(screen.getByRole("button", { name: "Send" }));

    const pending = await screen.findByRole("button", { name: "Sending" });
    expect(pending).toBeDisabled();

    await user.click(pending);
    expect(submit).toHaveBeenCalledTimes(1);

    release({ status: "created" });
    expect(await screen.findByRole("status")).toBeInTheDocument();
  });
});
