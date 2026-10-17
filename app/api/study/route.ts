import { db } from "@/lib/db";
import { studyMaterials } from "@/lib/schema";
import { and, desc, eq, getTableColumns, ne, sql, type SQL } from "drizzle-orm";

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

  const excludeSource = searchParams.get("excludeSource");
  // lite=1 leaves out the document text, for list pages that show only titles.
  const lite = searchParams.get("lite") === "1";

  // Every filter applies together. Chained .where() calls replaced each other,
  // so status dropped excludeSource.
  const filters: SQL[] = [];
  if (excludeSource) filters.push(ne(studyMaterials.source, excludeSource));
  if (status) filters.push(eq(studyMaterials.status, status));
  if (category) filters.push(eq(studyMaterials.category, category));

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { content, sections, ...listColumns } = getTableColumns(studyMaterials);
  const base = lite ? db.select(listColumns) : db.select();

  // No row limit. A limit of 100 hid every course past the newest 100 documents.
  const materials = await base
    .from(studyMaterials)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(studyMaterials.createdAt));
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

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  const topic = searchParams.get("topic");

  if (topic) {
    const deleted = await db
      .delete(studyMaterials)
      .where(sql`${studyMaterials.slug} LIKE ${topic + '%'}`)
      .returning();
    return Response.json({ deleted: deleted.length });
  }

  if (slug) {
    await db.delete(studyMaterials).where(eq(studyMaterials.slug, slug));
    return Response.json({ deleted: 1 });
  }

  return Response.json({ error: "slug or topic required" }, { status: 400 });
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
