import { describe, expect, it } from "vitest";

import { createInMemoryInquiryRepository } from "./repository.js";
import { createInquiryService } from "./service.js";

const receivedAt = new Date("2026-08-26T07:00:00.000Z");

function serviceWithIds(...ids: string[]) {
  const queued = [...ids];
  return createInquiryService({
    repository: createInMemoryInquiryRepository(),
    clock: () => receivedAt,
    nextId: () => queued.shift() ?? "unexpected",
  });
}

const input = {
  name: "林望",
  email: "Lin.Wang@Example.com",
  message: "想了解贵司的交付流程，方便安排一次沟通吗？",
  locale: "zh",
} as const;

describe("createInquiryService", () => {
  it("stamps a new inquiry with its id and arrival time", async () => {
    const service = serviceWithIds("inq_1");

    await expect(service.submit(input)).resolves.toMatchObject({
      id: "inq_1",
      name: "林望",
      receivedAt: receivedAt.toISOString(),
    });
  });

  it("stores the email lowercased so the same person is one contact", async () => {
    const service = serviceWithIds("inq_1");

    const inquiry = await service.submit(input);

    expect(inquiry.email).toBe("lin.wang@example.com");
  });
});
