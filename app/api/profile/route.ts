import { db } from "@/lib/db";
import { profile } from "@/lib/schema";
import { calculateLevel, getLevelTitle, xpToNextLevel } from "@/lib/gamification";

export async function GET() {
  const [p] = await db.select().from(profile).limit(1);

  if (!p) {
    const [newProfile] = await db
      .insert(profile)
      .values({})
      .returning();
    return Response.json({
      ...newProfile,
      xpToNextLevel: xpToNextLevel(0),
    });
  }

  return Response.json({
    ...p,
    xpToNextLevel: xpToNextLevel(p.totalXp || 0),
  });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const [p] = await db.select().from(profile).limit(1);

  if (!p) {
    return Response.json({ error: "Profile not found" }, { status: 404 });
  }

  const newXp = (p.totalXp || 0) + (body.xpEarned || 0);
  const newLevel = calculateLevel(newXp);
  const newTitle = getLevelTitle(newLevel);
  const newStreak = body.streak ?? (p.currentStreak || 0);
  const newLongestStreak = Math.max(p.longestStreak || 0, newStreak);

  const [updated] = await db
    .update(profile)
    .set({
      totalXp: newXp,
      level: newLevel,
      title: newTitle,
      currentStreak: newStreak,
      longestStreak: newLongestStreak,
      totalSessions: (p.totalSessions || 0) + (body.sessionsAdded || 0),
      totalHours: (
        parseFloat(p.totalHours || "0") + (body.hoursAdded || 0)
      ).toString(),
      updatedAt: new Date(),
    })
    .returning();

  return Response.json({
    ...updated,
    xpToNextLevel: xpToNextLevel(newXp),
  });
}
