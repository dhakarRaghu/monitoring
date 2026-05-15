CREATE TABLE "achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(100) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"xp_reward" integer DEFAULT 20,
	"icon" varchar(10),
	"category" varchar(50),
	"condition_description" text,
	CONSTRAINT "achievements_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "daily_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"category_avg_core_habits" numeric(3, 2),
	"category_avg_technical" numeric(3, 2),
	"category_avg_growth" numeric(3, 2),
	"category_avg_professional" numeric(3, 2),
	"overall_avg" numeric(3, 2),
	"key_learning" text,
	"biggest_win" text,
	"biggest_miss" text,
	"tomorrow_focus" text,
	"mentor_message" text,
	"xp_earned" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "daily_reviews_date_unique" UNIQUE("date")
);
--> statement-breakpoint
CREATE TABLE "learning_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid,
	"topic" varchar(200) NOT NULL,
	"reason" text,
	"priority" varchar(20) DEFAULT 'medium',
	"status" varchar(20) DEFAULT 'pending',
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "mentor_nudges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid,
	"nudge_type" varchar(50),
	"message" text,
	"context" text,
	"user_response" varchar(50),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"level" integer DEFAULT 1,
	"title" varchar(50) DEFAULT 'Beginner',
	"total_xp" integer DEFAULT 0,
	"current_streak" integer DEFAULT 0,
	"longest_streak" integer DEFAULT 0,
	"total_sessions" integer DEFAULT 0,
	"total_hours" numeric(8, 2) DEFAULT '0',
	"start_date" date DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "session_observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid,
	"type" varchar(20) NOT NULL,
	"content" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid,
	"area" varchar(50) NOT NULL,
	"score" integer NOT NULL,
	CONSTRAINT "session_scores_session_id_area_unique" UNIQUE("session_id","area")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp,
	"duration_minutes" integer,
	"project" varchar(100),
	"task_type" varchar(50),
	"difficulty" varchar(20),
	"summary" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "unlocked_achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"achievement_slug" varchar(100),
	"unlocked_at" timestamp DEFAULT now(),
	"session_id" uuid
);
--> statement-breakpoint
CREATE TABLE "weekly_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"week_start" date NOT NULL,
	"week_end" date NOT NULL,
	"area_averages" jsonb,
	"strongest_areas" text[],
	"weakest_areas" text[],
	"improvement_from_last_week" jsonb,
	"patterns" text[],
	"focus_recommendation" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "learning_queue" ADD CONSTRAINT "learning_queue_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_nudges" ADD CONSTRAINT "mentor_nudges_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_observations" ADD CONSTRAINT "session_observations_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_scores" ADD CONSTRAINT "session_scores_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unlocked_achievements" ADD CONSTRAINT "unlocked_achievements_achievement_slug_achievements_slug_fk" FOREIGN KEY ("achievement_slug") REFERENCES "public"."achievements"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unlocked_achievements" ADD CONSTRAINT "unlocked_achievements_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;