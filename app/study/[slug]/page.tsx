import { db } from "@/lib/db";
import { studyMaterials } from "@/lib/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

export const dynamic = "force-dynamic";

interface Section {
  title: string;
  anchor: string;
}

export default async function StudyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [material] = await db
    .select()
    .from(studyMaterials)
    .where(eq(studyMaterials.slug, slug));

  if (!material) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="card p-10 text-center">
          <p className="text-4xl mb-3">📭</p>
          <h2 className="text-lg font-semibold text-foreground">Not found</h2>
          <p className="text-sm text-foreground-tertiary mt-2">
            This study material doesn&apos;t exist.
          </p>
          <Link
            href="/study"
            className="inline-block mt-4 text-sm text-primary-light hover:underline"
          >
            Back to Study Materials
          </Link>
        </div>
      </div>
    );
  }

  const sections = (material.sections as Section[]) || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link
          href="/study"
          className="text-foreground-tertiary hover:text-foreground transition-colors text-sm"
        >
          &larr; Back
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            {material.title}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            {material.category && (
              <span className="text-xs px-2 py-0.5 rounded bg-card-elevated border border-card-border text-foreground-tertiary">
                {material.category}
              </span>
            )}
            {material.difficulty && (
              <span className="text-xs text-foreground-tertiary capitalize">
                {material.difficulty}
              </span>
            )}
            {material.estimatedMinutes && (
              <span className="text-xs text-foreground-tertiary">
                ~{material.estimatedMinutes} min read
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              material.status === "completed"
                ? "bg-success-bg text-success"
                : material.status === "in_progress"
                ? "bg-warning-bg text-warning"
                : "bg-card-elevated text-foreground-tertiary"
            }`}
          >
            {material.status === "in_progress"
              ? "In Progress"
              : material.status === "completed"
              ? "Completed"
              : "Unread"}
          </span>
        </div>
      </div>

      {material.summary && (
        <div className="card p-4 bg-primary-glow border-primary/20">
          <p className="text-sm text-foreground-secondary leading-relaxed">
            {material.summary}
          </p>
        </div>
      )}

      {sections.length > 0 && (
        <div className="card p-4">
          <h3 className="text-xs font-semibold text-foreground-tertiary uppercase tracking-wider mb-2">
            Table of Contents
          </h3>
          <nav className="space-y-1">
            {sections.map((section, i) => (
              <a
                key={i}
                href={`#${section.anchor}`}
                className="block text-sm text-foreground-secondary hover:text-primary-light transition-colors py-0.5"
              >
                {i + 1}. {section.title}
              </a>
            ))}
          </nav>
        </div>
      )}

      <article className="card p-8">
        <MarkdownRenderer content={material.content} />
      </article>

      {material.tags && material.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {material.tags.map((tag) => (
            <span
              key={tag}
              className="px-2.5 py-1 rounded-lg text-xs bg-primary-glow text-primary-light border border-primary/10"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
