import { db } from "@/lib/db";
import { studyMaterials } from "@/lib/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LearnDetailPage({
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
            No learning material for this topic yet. Run{" "}
            <code className="text-primary-light bg-primary-glow px-1.5 py-0.5 rounded text-xs">/mentor</code>{" "}
            to generate it.
          </p>
          <Link
            href="/learn"
            className="inline-block mt-4 text-sm text-primary-light hover:underline"
          >
            Back to Learn Queue
          </Link>
        </div>
      </div>
    );
  }

  interface Section {
    title: string;
    anchor: string;
  }

  const sections = (material.sections as Section[]) || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link
          href="/learn"
          className="text-foreground-tertiary hover:text-foreground transition-colors text-sm"
        >
          &larr; Back to Learn Queue
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            {material.title}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs px-2 py-0.5 rounded bg-accent/10 border border-accent/20 text-accent-light">
              Learning Gap
            </span>
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
      </div>

      {material.summary && (
        <div className="card p-4 bg-accent/5 border-accent/20">
          <p className="text-xs font-medium text-accent-light mb-1">Why you need this:</p>
          <p className="text-sm text-foreground-secondary leading-relaxed">
            {material.summary}
          </p>
        </div>
      )}

      {sections.length > 0 && (
        <div className="card p-4">
          <h3 className="text-xs font-semibold text-foreground-tertiary uppercase tracking-wider mb-2">
            Sections
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
              className="px-2.5 py-1 rounded-lg text-xs bg-accent/10 text-accent-light border border-accent/10"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
