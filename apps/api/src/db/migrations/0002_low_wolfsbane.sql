CREATE TABLE "Note tag" (
	"note_id" text NOT NULL,
	"tag_id" text NOT NULL,
	CONSTRAINT "Note_tag_note_id_tag_id_unique" UNIQUE("note_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "Tag" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "Tag_owner_id_name_unique" UNIQUE("owner_id","name")
);
--> statement-breakpoint
ALTER TABLE "Note tag" ADD CONSTRAINT "Note tag_note_id_Note_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."Note"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Note tag" ADD CONSTRAINT "Note tag_tag_id_Tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."Tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_owner_id_User_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;