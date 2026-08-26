import type { InquiryInput } from "./schema.js";

export type Inquiry = InquiryInput & {
  id: string;
  /** ISO 8601, in UTC. */
  receivedAt: string;
};

/**
 * The module's storage port. Routes and service depend on this shape only, so
 * swapping the in-memory adapter for a database touches this file and nothing
 * else in the module.
 */
export type InquiryRepository = {
  save(inquiry: Inquiry): Promise<void>;
  findById(id: string): Promise<Inquiry | undefined>;
};

/**
 * Process-local storage. Deliberate for now — inquiries do not survive a
 * restart, and a second replica would not see the first one's writes.
 */
export function createInMemoryInquiryRepository(): InquiryRepository {
  const inquiries = new Map<string, Inquiry>();

  return {
    save(inquiry) {
      inquiries.set(inquiry.id, inquiry);
      return Promise.resolve();
    },
    findById(id) {
      return Promise.resolve(inquiries.get(id));
    },
  };
}
