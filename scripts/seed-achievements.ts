import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { achievements } from "../lib/schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

const ACHIEVEMENTS = [
  {
    slug: "first-review",
    name: "First Review",
    description: "Complete your first /review-day",
    xpReward: 20,
    icon: "🎯",
    category: "milestones",
    conditionDescription: "Complete first /review-day",
  },
  {
    slug: "streak-7",
    name: "Week Warrior",
    description: "Maintain a 7-day review streak",
    xpReward: 30,
    icon: "🔥",
    category: "streaks",
    conditionDescription: "7 consecutive days logged",
  },
  {
    slug: "streak-30",
    name: "Monthly Dedication",
    description: "Maintain a 30-day review streak",
    xpReward: 50,
    icon: "💪",
    category: "streaks",
    conditionDescription: "30 consecutive days logged",
  },
  {
    slug: "streak-100",
    name: "Unstoppable",
    description: "Maintain a 100-day review streak",
    xpReward: 100,
    icon: "⚡",
    category: "streaks",
    conditionDescription: "100 consecutive days logged",
  },
  {
    slug: "first-perfect",
    name: "Perfect Score",
    description: "Score 5/5 on any growth area",
    xpReward: 20,
    icon: "⭐",
    category: "scores",
    conditionDescription: "Score 5 on any area",
  },
  {
    slug: "hard-problem-hero",
    name: "Hard Problem Hero",
    description: "Stay on a hard problem for 2+ hours without giving up",
    xpReward: 30,
    icon: "🦸",
    category: "habits",
    conditionDescription: "Stay on hard problem 2+ hours",
  },
  {
    slug: "never-give-up",
    name: "Never Give Up",
    description: "Zero give-up instances for 7 consecutive days",
    xpReward: 40,
    icon: "🏔️",
    category: "habits",
    conditionDescription: "0 give-ups for 7 days",
  },
  {
    slug: "test-first",
    name: "Test First",
    description: "Write tests before code 5 times",
    xpReward: 30,
    icon: "🧪",
    category: "habits",
    conditionDescription: "Write tests before code 5 times",
  },
  {
    slug: "architect",
    name: "Architect",
    description: "Score 5 on system design 3 times",
    xpReward: 40,
    icon: "🏗️",
    category: "scores",
    conditionDescription: "Score 5 on system_design 3 times",
  },
  {
    slug: "deep-diver",
    name: "Deep Diver",
    description: "Complete 10 items from your learning queue",
    xpReward: 30,
    icon: "🤿",
    category: "growth",
    conditionDescription: "Complete 10 learning queue items",
  },
  {
    slug: "full-stack-growth",
    name: "Full Stack",
    description: "All 18 areas average 3+ for a full week",
    xpReward: 50,
    icon: "🌟",
    category: "milestones",
    conditionDescription: "All 18 areas >= 3 avg for a week",
  },
  {
    slug: "unblockable",
    name: "Unblockable",
    description: "Self-unblock 10 times without asking for help",
    xpReward: 40,
    icon: "🔓",
    category: "habits",
    conditionDescription: "Self-unblock 10 times",
  },
  {
    slug: "clean-coder",
    name: "Clean Coder",
    description: "Score 5 on code quality 5 times",
    xpReward: 30,
    icon: "✨",
    category: "scores",
    conditionDescription: "Score 5 on code_quality 5 times",
  },
  {
    slug: "planner",
    name: "Planner",
    description: "Score 5 on thinking before coding for 5 days",
    xpReward: 40,
    icon: "📋",
    category: "habits",
    conditionDescription: "Score 5 on thinking_before_coding 5 days",
  },
  {
    slug: "communicator",
    name: "Communicator",
    description: "Zero uncommunicated blockers for 30 days",
    xpReward: 50,
    icon: "📡",
    category: "habits",
    conditionDescription: "Zero missed communications for 30 days",
  },
  {
    slug: "pattern-master",
    name: "Pattern Master",
    description: "Recognize and apply 10 patterns across projects",
    xpReward: 40,
    icon: "🧩",
    category: "growth",
    conditionDescription: "Recognize 10 cross-project patterns",
  },
  {
    slug: "complete-dev",
    name: "The Complete Developer",
    description: "All 18 areas average 4+ for 2 consecutive weeks",
    xpReward: 100,
    icon: "👑",
    category: "milestones",
    conditionDescription: "All 18 areas avg >= 4 for 2 weeks",
  },
];

async function seed() {
  console.log("Seeding achievements...");

  for (const achievement of ACHIEVEMENTS) {
    await db
      .insert(achievements)
      .values(achievement)
      .onConflictDoNothing({ target: achievements.slug });
  }

  console.log(`Seeded ${ACHIEVEMENTS.length} achievements.`);
}

seed().catch(console.error);
