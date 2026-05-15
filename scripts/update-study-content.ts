import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { studyMaterials } from "../lib/schema";
import { eq } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

const STUDY_DIR = path.join(__dirname, "../study-materials");

async function updateAll() {
  const files = fs.readdirSync(STUDY_DIR).filter(f => f.startsWith("kafka-phase-") && f.endsWith(".md"));

  for (const file of files) {
    const slug = file.replace(".md", "");
    const content = fs.readFileSync(path.join(STUDY_DIR, file), "utf-8");

    const existing = await db.select().from(studyMaterials).where(eq(studyMaterials.slug, slug));

    if (existing.length > 0) {
      await db.update(studyMaterials)
        .set({ content, filePath: path.join(STUDY_DIR, file) })
        .where(eq(studyMaterials.slug, slug));
      console.log(`Updated: ${slug} (${(content.length / 1024).toFixed(1)}KB)`);
    } else {
      console.log(`Skipped: ${slug} (not in DB)`);
    }
  }

  console.log("\nDone!");
}

updateAll().catch(console.error);
