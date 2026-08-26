import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const inquiries = pgTable(
  "inquiries",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    company: text("company"),
    message: text("message").notNull(),
    locale: text("locale").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("inquiries_email_idx").on(table.email)],
);
