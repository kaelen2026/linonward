import { describe, expect, it } from "vitest";

import { createApp } from "../../app.js";
import { createContactModule } from "./index.js";
import { createInMemoryInquiryRepository } from "./repository.js";

const body = {
  name: "林望",
  email: "lin.wang@example.com",
  message: "想了解贵司的交付流程，方便安排一次沟通吗？",
  locale: "zh",
};

function appWithContact() {
  return createApp({
    allowedOrigins: [],
    modules: [
      createContactModule({
        repository: createInMemoryInquiryRepository(),
        clock: () => new Date("2026-08-26T07:00:00.000Z"),
        nextId: () => "inq_1",
      }),
    ],
  });
}

function post(path: string, payload: unknown) {
  return appWithContact().request(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

describe("contact routes", () => {
  it("accepts an inquiry and points at where it can be read back", async () => {
    const response = await post("/contact/inquiries", body);

    expect(response.status).toBe(201);
    expect(response.headers.get("location")).toBe("/contact/inquiries/inq_1");
    expect(await response.json()).toMatchObject({ id: "inq_1", name: "林望" });
  });

  it("rejects a malformed submission with the field that failed", async () => {
    const response = await post("/contact/inquiries", { ...body, email: "not-an-email" });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: {
        code: "invalid_request",
        details: [{ path: "email" }],
      },
    });
  });

  it("rejects a message too short to act on", async () => {
    const response = await post("/contact/inquiries", { ...body, message: "hi" });

    expect(response.status).toBe(400);
    const payload = (await response.json()) as { error: { details: { path: string }[] } };
    expect(payload.error.details.map((detail) => detail.path)).toContain("message");
  });

  it("refuses a locale the website does not ship", async () => {
    const response = await post("/contact/inquiries", { ...body, locale: "fr" });

    expect(response.status).toBe(400);
  });

  it("reads an inquiry back after it was accepted", async () => {
    const app = appWithContact();
    await app.request("/contact/inquiries", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    const response = await app.request("/contact/inquiries/inq_1");

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: "inq_1", email: "lin.wang@example.com" });
  });

  it("answers an unknown inquiry id with 404 and not an empty 200", async () => {
    const response = await appWithContact().request("/contact/inquiries/inq_missing");

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: { code: "inquiry_not_found" } });
  });
});
