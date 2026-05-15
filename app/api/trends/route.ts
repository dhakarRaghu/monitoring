import { db } from "@/lib/db";
import { dailyReviews, sessionScores, sessions } from "@/lib/schema";
import { desc, gte, eq } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "30");

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().split("T")[0];

  const reviews = await db
    .select()
    .from(dailyReviews)
    .where(gte(dailyReviews.date, sinceStr))
    .orderBy(desc(dailyReviews.date));

  const allSessions = await db
    .select()
    .from(sessions)
    .where(gte(sessions.date, sinceStr))
    .orderBy(desc(sessions.date));

  const scoresByDate: Record<string, Record<string, number[]>> = {};

  for (const session of allSessions) {
    const scores = await db
      .select()
      .from(sessionScores)
      .where(eq(sessionScores.sessionId, session.id));

    if (!scoresByDate[session.date]) {
      scoresByDate[session.date] = {};
    }

    for (const score of scores) {
      if (!scoresByDate[session.date][score.area]) {
        scoresByDate[session.date][score.area] = [];
      }
      scoresByDate[session.date][score.area].push(score.score);
    }
  }

  const trendData = Object.entries(scoresByDate)
    .map(([date, areas]) => {
      const averages: Record<string, number> = {};
      for (const [area, scores] of Object.entries(areas)) {
        averages[area] = scores.reduce((a, b) => a + b, 0) / scores.length;
      }
      return { date, ...averages };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  return Response.json({ reviews, trendData });
}
