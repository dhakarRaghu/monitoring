import { db } from "@/lib/db";
import { dailyJournal } from "@/lib/schema";
import { desc, eq } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  if (date) {
    const [entry] = await db
      .select()
      .from(dailyJournal)
      .where(eq(dailyJournal.date, date));
    return Response.json(entry || null);
  }

  const entries = await db
    .select()
    .from(dailyJournal)
    .orderBy(desc(dailyJournal.date))
    .limit(60);

  return Response.json(entries);
}

export async function POST(request: Request) {
  const body = await request.json();

  const [entry] = await db
    .insert(dailyJournal)
    .values({
      date: body.date,
      entry: body.entry,
      mood: body.mood || null,
      energyLevel: body.energyLevel || null,
      challenges: body.challenges || null,
      wins: body.wins || null,
      aiGuidance: body.aiGuidance || null,
      aiSuggestions: body.aiSuggestions || null,
    })
    .onConflictDoNothing()
    .returning();

  if (!entry) {
    // Date exists, update instead
    const [updated] = await db
      .update(dailyJournal)
      .set({
        entry: body.entry,
        mood: body.mood || undefined,
        energyLevel: body.energyLevel || undefined,
        challenges: body.challenges || undefined,
        wins: body.wins || undefined,
        aiGuidance: body.aiGuidance || undefined,
        aiSuggestions: body.aiSuggestions || undefined,
      })
      .where(eq(dailyJournal.date, body.date))
      .returning();
    return Response.json(updated);
  }

  return Response.json(entry, { status: 201 });
}
