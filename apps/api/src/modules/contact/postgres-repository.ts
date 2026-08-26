import type { Sql } from "../../shared/postgres.js";
import type { Inquiry, InquiryRepository } from "./repository.js";

type InquiryRow = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  message: string;
  locale: string;
  received_at: Date;
};

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

    async findById(id) {
      const rows = await sql<InquiryRow[]>`
        select id, name, email, company, message, locale, received_at
        from inquiries
        where id = ${id}
      `;
      const row = rows[0];
      return row ? toInquiry(row) : undefined;
    },
  };
}

function toInquiry(row: InquiryRow): Inquiry {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    // The column is nullable but the domain type is optional, and `company: null`
    // would not round-trip through the schema.
    ...(row.company === null ? {} : { company: row.company }),
    message: row.message,
    locale: row.locale === "en" ? "en" : "zh",
    receivedAt: row.received_at.toISOString(),
  };
}
