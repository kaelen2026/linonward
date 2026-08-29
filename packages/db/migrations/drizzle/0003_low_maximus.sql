CREATE TABLE "content_role_assignments" (
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"assigned_by_email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_role_assignments_user_id_role_pk" PRIMARY KEY("user_id","role")
);
--> statement-breakpoint
ALTER TABLE "content_role_assignments" ADD CONSTRAINT "content_role_assignments_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "content_role_membership_idx" ON "content_role_assignments" USING btree ("role","user_id");