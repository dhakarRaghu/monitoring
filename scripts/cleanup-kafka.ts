import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { studyMaterials, studyCourses } from "../lib/schema";
import { sql } from "drizzle-orm";

const conn = neon(process.env.DATABASE_URL!);
const db = drizzle(conn);

async function cleanup() {
  const deleted = await db
    .delete(studyMaterials)
    .where(sql`${studyMaterials.slug} LIKE 'kafka%'`)
    .returning();
  console.log(`Deleted ${deleted.length} kafka study materials`);

  const courses = await db
    .delete(studyCourses)
    .where(sql`${studyCourses.topic} = 'kafka'`)
    .returning();
  console.log(`Deleted ${courses.length} kafka course entries`);
}

cleanup().catch(console.error);
