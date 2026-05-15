import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { profile } from "../lib/schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function init() {
  const existing = await db.select().from(profile).limit(1);
  if (existing.length > 0) {
    console.log("Profile already exists:", existing[0]);
    return;
  }

  const [p] = await db
    .insert(profile)
    .values({
      level: 1,
      title: "Beginner",
      totalXp: 0,
      currentStreak: 0,
      longestStreak: 0,
      totalSessions: 0,
      totalHours: "0",
    })
    .returning();

  console.log("Profile created:", p);
}

init().catch(console.error);
