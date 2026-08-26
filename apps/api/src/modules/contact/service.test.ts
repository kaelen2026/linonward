import { describe, expect, it } from "vitest";

import { ApiError } from "../../shared/api-error.js";
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

  it("reads a submitted inquiry back by id", async () => {
    const service = serviceWithIds("inq_1");
    const submitted = await service.submit(input);

    await expect(service.get("inq_1")).resolves.toEqual(submitted);
  });

  it("reports an unknown id as a client-visible 404 rather than undefined", async () => {
    const service = serviceWithIds();

    await expect(service.get("inq_missing")).rejects.toThrow(ApiError);
    await expect(service.get("inq_missing")).rejects.toMatchObject({
      status: 404,
      code: "inquiry_not_found",
    });
  });

  it("keeps inquiries apart instead of overwriting the first", async () => {
    const service = serviceWithIds("inq_1", "inq_2");
    await service.submit(input);
    await service.submit({ ...input, name: "Wang Lin" });

    await expect(service.get("inq_1")).resolves.toMatchObject({ name: "林望" });
    await expect(service.get("inq_2")).resolves.toMatchObject({ name: "Wang Lin" });
  });
});
