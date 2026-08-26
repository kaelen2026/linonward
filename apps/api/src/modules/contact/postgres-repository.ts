import { type Database, inquiries } from "../../shared/database.js";
import type { InquiryRepository } from "./repository.js";

/**
 * The durable adapter for {@link InquiryRepository}. It is the only file in the
 * module that knows SQL exists; the service and the routes cannot tell which
 * adapter they were handed.
 */
export function createPostgresInquiryRepository(database: Database): InquiryRepository {
  return {
    async save(inquiry) {
      await database.insert(inquiries).values({
        ...inquiry,
        company: inquiry.company ?? null,
        receivedAt: new Date(inquiry.receivedAt),
      });
    },
  };
}
