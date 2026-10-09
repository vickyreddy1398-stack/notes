ALTER TABLE "Note" ADD COLUMN "pinned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "Note" ADD COLUMN "archived" boolean DEFAULT false NOT NULL;