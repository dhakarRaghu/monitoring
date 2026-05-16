import { db } from "@/lib/db";
import { studyCourses } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const topic = searchParams.get("topic");

  if (topic) {
    const [course] = await db
      .select()
      .from(studyCourses)
      .where(eq(studyCourses.topic, topic));
    return Response.json(course || null);
  }

  const courses = await db.select().from(studyCourses);
  return Response.json(courses);
}

export async function POST(request: Request) {
  const body = await request.json();

  if (!body.topic || !body.title || !body.outline) {
    return Response.json({ error: "topic, title, and outline required" }, { status: 400 });
  }

  const [course] = await db
    .insert(studyCourses)
    .values({
      topic: body.topic,
      title: body.title,
      totalPhases: body.totalPhases || (body.outline as unknown[]).length,
      currentPhase: body.currentPhase || 0,
      status: "in_progress",
      outline: body.outline,
      config: body.config || null,
    })
    .onConflictDoNothing({ target: studyCourses.topic })
    .returning();

  if (!course) {
    const [existing] = await db
      .select()
      .from(studyCourses)
      .where(eq(studyCourses.topic, body.topic));
    return Response.json(existing);
  }

  return Response.json(course, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = await request.json();

  if (!body.topic) {
    return Response.json({ error: "topic required" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (body.currentPhase !== undefined) updateData.currentPhase = body.currentPhase;
  if (body.status) updateData.status = body.status;
  if (body.outline) updateData.outline = body.outline;

  const [updated] = await db
    .update(studyCourses)
    .set(updateData)
    .where(eq(studyCourses.topic, body.topic))
    .returning();

  return Response.json(updated);
}
