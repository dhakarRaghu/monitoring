import { db } from "@/lib/db";
import { learningQueue, studyMaterials } from "@/lib/schema";
import { desc, eq } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  if (status) {
    const items = await db
      .select()
      .from(learningQueue)
      .where(eq(learningQueue.status, status))
      .orderBy(desc(learningQueue.createdAt));
    return Response.json(items);
  }

  const items = await db
    .select()
    .from(learningQueue)
    .orderBy(desc(learningQueue.createdAt))
    .limit(100);

  return Response.json(items);
}

export async function POST(request: Request) {
  const body = await request.json();

  if (!body.topic) {
    return Response.json({ error: "topic required" }, { status: 400 });
  }

  const slug = body.topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const [item] = await db
    .insert(learningQueue)
    .values({
      sessionId: body.sessionId || null,
      topic: body.topic,
      reason: body.reason || null,
      priority: body.priority || "medium",
      status: body.studyContent ? "in_progress" : "pending",
    })
    .returning();

  if (body.studyContent) {
    await db
      .insert(studyMaterials)
      .values({
        slug,
        title: body.topic,
        category: body.category || "learning-gap",
        difficulty: body.difficulty || "intermediate",
        estimatedMinutes: body.estimatedMinutes || 15,
        tags: body.tags || [],
        summary: body.reason || null,
        content: body.studyContent,
        sections: body.sections || null,
        source: "mentor",
        learningQueueId: item.id,
        status: "unread",
        progress: 0,
      })
      .onConflictDoNothing({ target: studyMaterials.slug });
  }

  return Response.json({ ...item, studySlug: body.studyContent ? slug : null }, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = await request.json();

  if (!body.id) {
    return Response.json({ error: "id required" }, { status: 400 });
  }

  const [updated] = await db
    .update(learningQueue)
    .set({
      status: body.status,
      priority: body.priority,
      completedAt: body.status === "completed" ? new Date() : undefined,
    })
    .where(eq(learningQueue.id, body.id))
    .returning();

  return Response.json(updated);
}
