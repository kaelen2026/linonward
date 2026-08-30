ALTER TABLE "account" ADD COLUMN "issuer" text;--> statement-breakpoint
UPDATE "account"
SET "issuer" = CASE
	WHEN "provider_id" = 'google' THEN 'https://accounts.google.com'
	WHEN "provider_id" = 'credential' THEN 'local:credential'
	ELSE 'local:oauth:' || "provider_id"
END;--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "issuer" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "account_issuer_account_id_idx" ON "account" USING btree ("issuer","account_id");
