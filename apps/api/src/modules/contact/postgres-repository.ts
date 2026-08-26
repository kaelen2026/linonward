import type { Sql } from "../../shared/postgres.js";
import type { InquiryRepository } from "./repository.js";

/**
 * The durable adapter for {@link InquiryRepository}. It is the only file in the
 * module that knows SQL exists; the service and the routes cannot tell which
 * adapter they were handed.
 */
export function createPostgresInquiryRepository(sql: Sql): InquiryRepository {
  return {
    async save(inquiry) {
      await sql`
        insert into inquiries (id, name, email, company, message, locale, received_at)
        values (
          ${inquiry.id}, ${inquiry.name}, ${inquiry.email}, ${inquiry.company ?? null},
          ${inquiry.message}, ${inquiry.locale}, ${inquiry.receivedAt}
        )
      `;
    },
  };
}
