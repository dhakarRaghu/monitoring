import { db } from "@/lib/db";
import { learningQueue } from "@/lib/schema";
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
