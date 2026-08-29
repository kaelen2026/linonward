CREATE TABLE "articles" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"excerpt" text NOT NULL,
	"content" jsonb NOT NULL,
	"cover_image_url" text,
	"locale" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"author_name" text NOT NULL,
	"seo_description" text NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "articles_locale_slug_idx" ON "articles" USING btree ("locale","slug");--> statement-breakpoint
CREATE INDEX "articles_publication_idx" ON "articles" USING btree ("status","locale","published_at");