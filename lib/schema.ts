import {
  pgTable,
  uuid,
  date,
  timestamp,
  integer,
  varchar,
  text,
  decimal,
  jsonb,
  unique,
} from "drizzle-orm/pg-core";

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  date: date("date").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  durationMinutes: integer("duration_minutes"),
  project: varchar("project", { length: 100 }),
  taskType: varchar("task_type", { length: 50 }),
  difficulty: varchar("difficulty", { length: 20 }),
  summary: text("summary"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const sessionScores = pgTable(
  "session_scores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id").references(() => sessions.id),
    area: varchar("area", { length: 50 }).notNull(),
    score: integer("score").notNull(),
  },
  (table) => [unique().on(table.sessionId, table.area)]
);

export const sessionObservations = pgTable("session_observations", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").references(() => sessions.id),
  type: varchar("type", { length: 20 }).notNull(),
  content: text("content").notNull(),
});

export const learningQueue = pgTable("learning_queue", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").references(() => sessions.id),
  topic: varchar("topic", { length: 200 }).notNull(),
  reason: text("reason"),
  priority: varchar("priority", { length: 20 }).default("medium"),
  status: varchar("status", { length: 20 }).default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const dailyReviews = pgTable("daily_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  date: date("date").unique().notNull(),
  categoryAvgCoreHabits: decimal("category_avg_core_habits", {
    precision: 3,
    scale: 2,
  }),
  categoryAvgTechnical: decimal("category_avg_technical", {
    precision: 3,
    scale: 2,
  }),
  categoryAvgGrowth: decimal("category_avg_growth", {
    precision: 3,
    scale: 2,
  }),
  categoryAvgProfessional: decimal("category_avg_professional", {
    precision: 3,
    scale: 2,
  }),
  overallAvg: decimal("overall_avg", { precision: 3, scale: 2 }),
  keyLearning: text("key_learning"),
  biggestWin: text("biggest_win"),
  biggestMiss: text("biggest_miss"),
  tomorrowFocus: text("tomorrow_focus"),
  mentorMessage: text("mentor_message"),
  xpEarned: integer("xp_earned").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const profile = pgTable("profile", {
  id: uuid("id").primaryKey().defaultRandom(),
  level: integer("level").default(1),
  title: varchar("title", { length: 50 }).default("Beginner"),
  totalXp: integer("total_xp").default(0),
  currentStreak: integer("current_streak").default(0),
  longestStreak: integer("longest_streak").default(0),
  totalSessions: integer("total_sessions").default(0),
  totalHours: decimal("total_hours", { precision: 8, scale: 2 }).default("0"),
  startDate: date("start_date").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const achievements = pgTable("achievements", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 100 }).unique().notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  xpReward: integer("xp_reward").default(20),
  icon: varchar("icon", { length: 10 }),
  category: varchar("category", { length: 50 }),
  conditionDescription: text("condition_description"),
});

export const unlockedAchievements = pgTable("unlocked_achievements", {
  id: uuid("id").primaryKey().defaultRandom(),
  achievementSlug: varchar("achievement_slug", { length: 100 }).references(
    () => achievements.slug
  ),
  unlockedAt: timestamp("unlocked_at").defaultNow(),
  sessionId: uuid("session_id").references(() => sessions.id),
});

export const weeklySummaries = pgTable("weekly_summaries", {
  id: uuid("id").primaryKey().defaultRandom(),
  weekStart: date("week_start").notNull(),
  weekEnd: date("week_end").notNull(),
  areaAverages: jsonb("area_averages"),
  strongestAreas: text("strongest_areas").array(),
  weakestAreas: text("weakest_areas").array(),
  improvementFromLastWeek: jsonb("improvement_from_last_week"),
  patterns: text("patterns").array(),
  focusRecommendation: text("focus_recommendation"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const mentorNudges = pgTable("mentor_nudges", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").references(() => sessions.id),
  nudgeType: varchar("nudge_type", { length: 50 }),
  message: text("message"),
  context: text("context"),
  userResponse: varchar("user_response", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const studyCourses = pgTable("study_courses", {
  id: uuid("id").primaryKey().defaultRandom(),
  topic: varchar("topic", { length: 100 }).unique().notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  totalPhases: integer("total_phases").notNull(),
  currentPhase: integer("current_phase").default(0),
  status: varchar("status", { length: 20 }).default("in_progress"),
  outline: jsonb("outline").notNull(),
  config: jsonb("config"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const dailyJournal = pgTable("daily_journal", {
  id: uuid("id").primaryKey().defaultRandom(),
  date: date("date").unique().notNull(),
  entry: text("entry").notNull(),
  mood: varchar("mood", { length: 20 }),
  energyLevel: integer("energy_level"),
  challenges: text("challenges"),
  wins: text("wins"),
  aiGuidance: text("ai_guidance"),
  aiSuggestions: jsonb("ai_suggestions"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const studyMaterials = pgTable("study_materials", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 200 }).unique().notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  category: varchar("category", { length: 100 }),
  difficulty: varchar("difficulty", { length: 20 }),
  estimatedMinutes: integer("estimated_minutes"),
  tags: text("tags").array(),
  summary: text("summary"),
  content: text("content").notNull(),
  sections: jsonb("sections"),
  source: varchar("source", { length: 50 }).default("manual"),
  learningQueueId: uuid("learning_queue_id").references(() => learningQueue.id),
  status: varchar("status", { length: 20 }).default("unread"),
  progress: integer("progress").default(0),
  filePath: varchar("file_path", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});
