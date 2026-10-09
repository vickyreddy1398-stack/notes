CREATE TABLE "Note" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Note" ADD CONSTRAINT "Note_owner_id_User_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;