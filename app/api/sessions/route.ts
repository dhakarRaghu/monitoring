import { db } from "@/lib/db";
import { sessions, sessionScores, sessionObservations, learningQueue } from "@/lib/schema";
import { desc, inArray } from "drizzle-orm";

export async function GET() {
  const allSessions = await db
    .select()
    .from(sessions)
    .orderBy(desc(sessions.createdAt))
    .limit(50);

  if (allSessions.length === 0) return Response.json([]);

  const sessionIds = allSessions.map((s) => s.id);

  const [allScores, allObs] = await Promise.all([
    db.select().from(sessionScores).where(inArray(sessionScores.sessionId, sessionIds)),
    db.select().from(sessionObservations).where(inArray(sessionObservations.sessionId, sessionIds)),
  ]);

  const sessionsWithScores = allSessions.map((session) => ({
    ...session,
    scores: Object.fromEntries(
      allScores.filter((s) => s.sessionId === session.id).map((s) => [s.area, s.score])
    ),
    observations: allObs.filter((o) => o.sessionId === session.id),
  }));

  return Response.json(sessionsWithScores);
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.date || !body.startTime) {
    return Response.json({ error: "date and startTime are required" }, { status: 400 });
  }

  // Validate scores are 1-5
  if (body.scores && typeof body.scores === "object") {
    for (const [, score] of Object.entries(body.scores as Record<string, number>)) {
      if (typeof score !== "number" || score < 1 || score > 5) {
        return Response.json({ error: "Scores must be integers 1-5" }, { status: 400 });
      }
    }
  }

  const [session] = await db
    .insert(sessions)
    .values({
      date: body.date as string,
      startTime: new Date(body.startTime as string),
      endTime: body.endTime ? new Date(body.endTime as string) : null,
      durationMinutes: (body.durationMinutes as number) || null,
      project: (body.project as string) || null,
      taskType: (body.taskType as string) || null,
      difficulty: (body.difficulty as string) || null,
      summary: (body.summary as string) || null,
    })
    .returning();

  if (body.scores && typeof body.scores === "object") {
    const scoreEntries = Object.entries(body.scores as Record<string, number>).map(([area, score]) => ({
      sessionId: session.id,
      area,
      score: Math.round(Math.min(5, Math.max(1, score))),
    }));
    if (scoreEntries.length > 0) {
      await db.insert(sessionScores).values(scoreEntries);
    }
  }

  if (Array.isArray(body.observations)) {
    const obsEntries = (body.observations as { type: string; content: string }[])
      .filter((obs) => obs.type && obs.content)
      .map((obs) => ({
        sessionId: session.id,
        type: obs.type,
        content: obs.content,
      }));
    if (obsEntries.length > 0) {
      await db.insert(sessionObservations).values(obsEntries);
    }
  }

  if (Array.isArray(body.learningOpportunities)) {
    const learnEntries = (body.learningOpportunities as { topic: string; reason?: string; priority?: string }[])
      .filter((item) => item.topic)
      .map((item) => ({
        sessionId: session.id,
        topic: item.topic,
        reason: item.reason || null,
        priority: item.priority || "medium",
      }));
    if (learnEntries.length > 0) {
      await db.insert(learningQueue).values(learnEntries);
    }
  }

  return Response.json(session, { status: 201 });
}
