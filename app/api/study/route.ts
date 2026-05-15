import { db } from "@/lib/db";
import { studyMaterials } from "@/lib/schema";
import { desc, eq } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  const status = searchParams.get("status");
  const category = searchParams.get("category");

  if (slug) {
    const [material] = await db
      .select()
      .from(studyMaterials)
      .where(eq(studyMaterials.slug, slug));
    return Response.json(material || null);
  }

  let query = db.select().from(studyMaterials);

  if (status) {
    query = query.where(eq(studyMaterials.status, status)) as typeof query;
  }
  if (category) {
    query = query.where(eq(studyMaterials.category, category)) as typeof query;
  }

  const materials = await query.orderBy(desc(studyMaterials.createdAt)).limit(100);
  return Response.json(materials);
}

export async function POST(request: Request) {
  const body = await request.json();

  const slug = body.slug || body.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const [material] = await db
    .insert(studyMaterials)
    .values({
      slug,
      title: body.title,
      category: body.category,
      difficulty: body.difficulty,
      estimatedMinutes: body.estimatedMinutes,
      tags: body.tags,
      summary: body.summary,
      content: body.content,
      sections: body.sections,
      source: body.source || "manual",
      learningQueueId: body.learningQueueId || null,
      status: "unread",
      progress: 0,
      filePath: body.filePath || null,
    })
    .onConflictDoNothing({ target: studyMaterials.slug })
    .returning();

  return Response.json(material, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = await request.json();

  if (!body.id && !body.slug) {
    return Response.json({ error: "id or slug required" }, { status: 400 });
  }

  const where = body.id
    ? eq(studyMaterials.id, body.id)
    : eq(studyMaterials.slug, body.slug);

  const updateData: Record<string, unknown> = {};
  if (body.status) updateData.status = body.status;
  if (body.progress !== undefined) updateData.progress = body.progress;
  if (body.status === "completed") updateData.completedAt = new Date();

  const [updated] = await db
    .update(studyMaterials)
    .set(updateData)
    .where(where)
    .returning();

  return Response.json(updated);
}
