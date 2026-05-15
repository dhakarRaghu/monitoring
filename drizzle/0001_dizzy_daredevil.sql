CREATE TABLE "daily_journal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"entry" text NOT NULL,
	"mood" varchar(20),
	"energy_level" integer,
	"challenges" text,
	"wins" text,
	"ai_guidance" text,
	"ai_suggestions" jsonb,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "daily_journal_date_unique" UNIQUE("date")
);
--> statement-breakpoint
CREATE TABLE "study_materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(200) NOT NULL,
	"title" varchar(200) NOT NULL,
	"category" varchar(100),
	"difficulty" varchar(20),
	"estimated_minutes" integer,
	"tags" text[],
	"summary" text,
	"content" text NOT NULL,
	"sections" jsonb,
	"source" varchar(50) DEFAULT 'manual',
	"learning_queue_id" uuid,
	"status" varchar(20) DEFAULT 'unread',
	"progress" integer DEFAULT 0,
	"file_path" varchar(500),
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	CONSTRAINT "study_materials_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "study_materials" ADD CONSTRAINT "study_materials_learning_queue_id_learning_queue_id_fk" FOREIGN KEY ("learning_queue_id") REFERENCES "public"."learning_queue"("id") ON DELETE no action ON UPDATE no action;