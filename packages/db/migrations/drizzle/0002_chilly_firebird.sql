CREATE TABLE "content_audit_events" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_email" text NOT NULL,
	"action" text NOT NULL,
	"target_id" text NOT NULL,
	"request_id" text NOT NULL,
	"outcome" text NOT NULL,
	"error_code" text,
	"occurred_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "content_audit_request_idx" ON "content_audit_events" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "content_audit_actor_time_idx" ON "content_audit_events" USING btree ("actor_email","occurred_at");--> statement-breakpoint
CREATE INDEX "content_audit_target_time_idx" ON "content_audit_events" USING btree ("target_id","occurred_at");