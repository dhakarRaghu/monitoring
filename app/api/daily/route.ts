import { db } from "@/lib/db";
import { dailyReviews } from "@/lib/schema";
import { desc, eq } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  if (date) {
    const [review] = await db
      .select()
      .from(dailyReviews)
      .where(eq(dailyReviews.date, date));
    return Response.json(review || null);
  }

  const reviews = await db
    .select()
    .from(dailyReviews)
    .orderBy(desc(dailyReviews.date))
    .limit(90);

  return Response.json(reviews);
}

export async function POST(request: Request) {
  const body = await request.json();

  const [review] = await db
    .insert(dailyReviews)
    .values({
      date: body.date,
      categoryAvgCoreHabits: body.categoryAverages?.core_habits?.toString(),
      categoryAvgTechnical: body.categoryAverages?.technical?.toString(),
      categoryAvgGrowth: body.categoryAverages?.growth?.toString(),
      categoryAvgProfessional: body.categoryAverages?.professional?.toString(),
      overallAvg: body.overallAvg?.toString(),
      keyLearning: body.keyLearning,
      biggestWin: body.biggestWin,
      biggestMiss: body.biggestMiss,
      tomorrowFocus: body.tomorrowFocus,
      mentorMessage: body.mentorMessage,
      xpEarned: body.xpEarned || 0,
    })
    .returning();

  return Response.json(review, { status: 201 });
}
