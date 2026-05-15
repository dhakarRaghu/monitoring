import { db } from "@/lib/db";
import { achievements, unlockedAchievements } from "@/lib/schema";

export async function GET() {
  const allAchievements = await db.select().from(achievements);
  const unlocked = await db.select().from(unlockedAchievements);

  const unlockedSlugs = new Set(unlocked.map((u) => u.achievementSlug));

  const result = allAchievements.map((a) => ({
    ...a,
    unlocked: unlockedSlugs.has(a.slug),
    unlockedAt: unlocked.find((u) => u.achievementSlug === a.slug)?.unlockedAt,
  }));

  return Response.json(result);
}

export async function POST(request: Request) {
  const body = await request.json();

  const [entry] = await db
    .insert(unlockedAchievements)
    .values({
      achievementSlug: body.slug,
      sessionId: body.sessionId || null,
    })
    .returning();

  return Response.json(entry, { status: 201 });
}
