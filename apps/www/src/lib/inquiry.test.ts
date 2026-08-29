import { describe, expect, it, vi } from "vitest";

import {
  emptyInquiryDraft,
  type InquiryDraft,
  submitInquiry,
  validateInquiry,
} from "@/lib/inquiry";

/** A draft that passes every rule, so each test can spoil exactly one field. */
const validDraft: InquiryDraft = {
  name: "林望",
  email: "lin@example.com",
  company: "Onward",
  message: "想了解贵司的交付流程和排期。",
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("validateInquiry", () => {
  it("accepts a draft that satisfies every rule", () => {
    expect(validateInquiry(validDraft)).toEqual({});
  });

  it("treats a blank required field as missing, not as present-but-empty", () => {
    expect(validateInquiry({ ...validDraft, name: "   " })).toEqual({ name: "required" });
  });

  it("reports every bad field at once, so one submit surfaces the whole list", () => {
    expect(validateInquiry(emptyInquiryDraft)).toEqual({
      name: "required",
      email: "required",
      message: "required",
    });
  });

  it("rejects an address with no domain", () => {
    expect(validateInquiry({ ...validDraft, email: "lin@example" })).toEqual({
      email: "invalidEmail",
    });
  });

  it("asks for more than a one-word message", () => {
    expect(validateInquiry({ ...validDraft, message: "你好" })).toEqual({ message: "tooShort" });
  });

  it("mirrors the server's length ceilings", () => {
    expect(validateInquiry({ ...validDraft, name: "x".repeat(81) })).toEqual({ name: "tooLong" });
    expect(validateInquiry({ ...validDraft, company: "x".repeat(121) })).toEqual({
      company: "tooLong",
    });
    expect(validateInquiry({ ...validDraft, message: "x".repeat(2001) })).toEqual({
      message: "tooLong",
    });
  });

  it("leaves company alone when it is blank, because the API has it optional", () => {
    expect(validateInquiry({ ...validDraft, company: "" })).toEqual({});
  });
});

describe("submitInquiry", () => {
  it("posts the trimmed draft and the locale to the inquiries endpoint", async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(201, { id: "inq_1" }));

    const result = await submitInquiry({ ...validDraft, name: "  林望  " }, "en", {
      baseUrl: "https://api.example.com",
      fetch,
    });

    expect(result).toEqual({ status: "created", id: "inq_1" });

    const [url, init] = fetch.mock.calls[0] ?? [];
    expect(url).toBe("https://api.example.com/contact/inquiries");
    expect(init).toMatchObject({ method: "POST" });
    expect(init?.headers).toMatchObject({
      "content-type": "application/json",
      "x-request-id": expect.any(String),
      traceparent: expect.stringMatching(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/),
    });
    expect(JSON.parse(String(init?.body))).toEqual({
      name: "林望",
      email: "lin@example.com",
      company: "Onward",
      message: "想了解贵司的交付流程和排期。",
      locale: "en",
    });
  });

  it("omits company rather than sending an empty string the schema would keep", async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(201, { id: "inq_2" }));

    await submitInquiry({ ...validDraft, company: "  " }, "zh", {
      baseUrl: "https://api.example.com",
      fetch,
    });

    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).not.toHaveProperty("company");
  });

  it("tolerates a trailing slash on the base url instead of doubling it", async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(201, { id: "inq_3" }));

    await submitInquiry(validDraft, "zh", { baseUrl: "https://api.example.com/", fetch });

    expect(fetch.mock.calls[0]?.[0]).toBe("https://api.example.com/contact/inquiries");
  });

  it("still counts as created when the response body cannot be read", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("not json", { status: 201 }));

    expect(
      await submitInquiry(validDraft, "zh", { baseUrl: "https://api.example.com", fetch }),
    ).toEqual({ status: "created" });
  });

  it("maps the server's field paths back onto the form", async () => {
    const fetch = vi.fn().mockResolvedValue(
      jsonResponse(400, {
        error: {
          code: "invalid_request",
          message: "The inquiry is not valid",
          details: [{ path: "email", message: "Invalid email address" }],
        },
      }),
    );

    expect(
      await submitInquiry(validDraft, "zh", { baseUrl: "https://api.example.com", fetch }),
    ).toEqual({ status: "invalid", issues: { email: "invalid" } });
  });

  it("ignores a detail path that is not a field the form renders", async () => {
    const fetch = vi.fn().mockResolvedValue(
      jsonResponse(400, {
        error: { code: "invalid_request", details: [{ path: "locale", message: "bad" }] },
      }),
    );

    expect(
      await submitInquiry(validDraft, "zh", { baseUrl: "https://api.example.com", fetch }),
    ).toEqual({ status: "invalid", issues: {} });
  });

  it("distinguishes a spent rate-limit budget from a plain failure", async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(429, { error: { code: "rate_limited" } }));

    expect(
      await submitInquiry(validDraft, "zh", { baseUrl: "https://api.example.com", fetch }),
    ).toEqual({ status: "rateLimited" });
  });

  it("reports a server crash as a failure rather than throwing at the caller", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(jsonResponse(500, { error: { code: "internal_error" } }));

    expect(
      await submitInquiry(validDraft, "zh", { baseUrl: "https://api.example.com", fetch }),
    ).toEqual({ status: "failed" });
  });

  it("survives the network being gone", async () => {
    const fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    expect(
      await submitInquiry(validDraft, "zh", { baseUrl: "https://api.example.com", fetch }),
    ).toEqual({ status: "failed" });
  });
});
