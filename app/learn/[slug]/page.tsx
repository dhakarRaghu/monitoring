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
        <div className="card p-10 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-warning/[0.03] via-transparent to-transparent pointer-events-none" />
          <div className="relative">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-card-elevated flex items-center justify-center mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-foreground-tertiary">
                <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 11v4M12 11l-2 2M12 11l2 2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-foreground">Not found</h2>
            <p className="text-[13px] text-foreground-tertiary mt-2">
              No learning material for this topic yet. Run{" "}
              <code className="text-primary-light font-mono text-[11px] bg-primary-glow px-1.5 py-0.5 rounded">/mentor</code>{" "}
              to generate it.
            </p>
            <Link
              href="/learn"
              className="inline-flex items-center gap-2 mt-5 text-[13px] text-primary-light hover:text-primary font-medium transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              Back to Learn Queue
            </Link>
          </div>
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
      <div>
        <Link
          href="/learn"
          className="inline-flex items-center gap-2 text-[12px] text-foreground-tertiary hover:text-foreground transition-colors font-medium"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back to Learn Queue
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight page-section-header">
            {material.title}
          </h1>
          <div className="flex items-center gap-3 mt-2.5">
            <span className="text-[10px] px-2.5 py-1 rounded-md bg-primary/[0.08] border border-primary/15 text-primary-light font-medium uppercase tracking-wider">
              Learning Gap
            </span>
            {material.difficulty && (
              <span className="text-[11px] text-foreground-tertiary capitalize">
                {material.difficulty}
              </span>
            )}
            {material.estimatedMinutes && (
              <span className="text-[11px] text-foreground-tertiary font-mono">
                ~{material.estimatedMinutes} min
              </span>
            )}
          </div>
        </div>
      </div>

      {material.summary && (
        <div className="card p-4 bg-accent/[0.04] border-accent/15">
          <p className="text-[10px] font-medium text-accent-light mb-1.5 uppercase tracking-wider">Why you need this</p>
          <p className="text-[13px] text-foreground-secondary leading-relaxed">
            {material.summary}
          </p>
        </div>
      )}

      {sections.length > 0 && (
        <div className="card p-4">
          <h3 className="text-[10px] font-semibold text-foreground-tertiary uppercase tracking-widest mb-2.5">
            Sections
          </h3>
          <nav className="space-y-1">
            {sections.map((section, i) => (
              <a
                key={i}
                href={`#${section.anchor}`}
                className="block text-[13px] text-foreground-secondary hover:text-primary-light transition-colors py-1 pl-3 border-l-2 border-transparent hover:border-primary/30"
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
              className="px-2.5 py-1 rounded-lg text-[11px] bg-primary/[0.06] text-primary-light border border-primary/10 font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
