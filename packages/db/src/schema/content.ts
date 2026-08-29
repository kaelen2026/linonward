import { index, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const articles = pgTable(
  "articles",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    excerpt: text("excerpt").notNull(),
    content: jsonb("content").notNull(),
    coverImageUrl: text("cover_image_url"),
    locale: text("locale").notNull(),
    status: text("status").notNull().default("draft"),
    authorName: text("author_name").notNull(),
    seoDescription: text("seo_description").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("articles_locale_slug_idx").on(table.locale, table.slug),
    index("articles_publication_idx").on(table.status, table.locale, table.publishedAt),
  ],
);
