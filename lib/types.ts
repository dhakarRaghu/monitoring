export const GROWTH_AREAS = [
  "attitude",
  "learning",
  "ownership",
  "verification",
  "proactiveness",
  "communication",
  "code_quality",
  "system_design",
  "debugging",
  "testing",
  "deep_understanding",
  "pattern_recognition",
  "research_ability",
  "asking_questions",
  "speed_efficiency",
  "scope_awareness",
  "pr_quality",
  "thinking_before_coding",
] as const;

export type GrowthArea = (typeof GROWTH_AREAS)[number];

export const AREA_LABELS: Record<GrowthArea, string> = {
  attitude: "Attitude toward hard problems",
  learning: "Learning from work",
  ownership: "Ownership & build-till-end",
  verification: "Verification & first principles",
  proactiveness: "Proactiveness",
  communication: "Communication",
  code_quality: "Code quality",
  system_design: "System design",
  debugging: "Debugging",
  testing: "Testing discipline",
  deep_understanding: "Deep understanding",
  pattern_recognition: "Pattern recognition",
  research_ability: "Research ability",
  asking_questions: "Asking good questions",
  speed_efficiency: "Speed & efficiency",
  scope_awareness: "Scope awareness",
  pr_quality: "PR quality",
  thinking_before_coding: "Thinking before coding",
};

export const CATEGORIES = {
  core_habits: [
    "attitude",
    "learning",
    "ownership",
    "verification",
    "proactiveness",
    "communication",
  ],
  technical: ["code_quality", "system_design", "debugging", "testing"],
  growth: [
    "deep_understanding",
    "pattern_recognition",
    "research_ability",
    "asking_questions",
  ],
  professional: [
    "speed_efficiency",
    "scope_awareness",
    "pr_quality",
    "thinking_before_coding",
  ],
} as const;

export const CATEGORY_LABELS: Record<string, string> = {
  core_habits: "Core Work Habits",
  technical: "Technical Excellence",
  growth: "Growth & Learning",
  professional: "Professional Impact",
};

export const LEVEL_TITLES: Record<number, string> = {
  1: "Beginner",
  2: "Apprentice",
  3: "Growing Developer",
  4: "Competent Developer",
  5: "Skilled Developer",
  6: "Skilled Developer",
  7: "Strong Developer",
  8: "Strong Developer",
  9: "Strong Developer",
  10: "Senior-Level",
  15: "Expert",
  20: "Master",
};

export interface SessionData {
  id: string;
  date: string;
  startTime: string;
  endTime?: string;
  durationMinutes?: number;
  project?: string;
  taskType?: string;
  difficulty?: string;
  summary?: string;
  scores: Partial<Record<GrowthArea, number>>;
  observations: { type: string; content: string }[];
  learningOpportunities: {
    topic: string;
    reason?: string;
    priority?: string;
  }[];
}

export interface DailyReviewData {
  date: string;
  overallScores: Partial<Record<GrowthArea, number>>;
  categoryAverages: {
    core_habits: number;
    technical: number;
    growth: number;
    professional: number;
  };
  keyLearning?: string;
  biggestWin?: string;
  biggestMiss?: string;
  tomorrowFocus?: string;
  mentorMessage?: string;
  xpEarned: number;
}

export interface ProfileData {
  level: number;
  title: string;
  totalXp: number;
  xpToNextLevel: number;
  currentStreak: number;
  longestStreak: number;
  totalSessions: number;
  totalHours: number;
  startDate: string;
}

export interface AchievementDef {
  slug: string;
  name: string;
  description: string;
  xpReward: number;
  icon: string;
  category: string;
  conditionDescription: string;
  unlocked?: boolean;
  unlockedAt?: string;
}
