import { db } from "@/lib/db";
import { dailyReviews, sessionScores, sessions, studyMaterials, learningQueue } from "@/lib/schema";
import { desc, gte, eq } from "drizzle-orm";
import { AREA_LABELS, type GrowthArea } from "@/lib/types";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function InsightsPage() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sinceStr = thirtyDaysAgo.toISOString().split("T")[0];

  const recentSessions = await db
    .select()
    .from(sessions)
    .where(gte(sessions.date, sinceStr))
    .orderBy(desc(sessions.date));

  const areaScores: Record<string, number[]> = {};

  for (const session of recentSessions) {
    const scores = await db
      .select()
      .from(sessionScores)
      .where(eq(sessionScores.sessionId, session.id));
    for (const score of scores) {
      if (!areaScores[score.area]) areaScores[score.area] = [];
      areaScores[score.area].push(score.score);
    }
  }

  const areaAverages: { area: string; avg: number; count: number }[] = Object.entries(
    areaScores
  ).map(([area, scores]) => ({
    area,
    avg: scores.reduce((a, b) => a + b, 0) / scores.length,
    count: scores.length,
  }));

  areaAverages.sort((a, b) => b.avg - a.avg);

  const strongest = areaAverages.slice(0, 5);
  const weakest = [...areaAverages].sort((a, b) => a.avg - b.avg).slice(0, 5);

  const reviews = await db
    .select()
    .from(dailyReviews)
    .where(gte(dailyReviews.date, sinceStr))
    .orderBy(desc(dailyReviews.date));

  const pendingLearning = await db
    .select()
    .from(learningQueue)
    .where(eq(learningQueue.status, "in_progress"))
    .orderBy(desc(learningQueue.createdAt))
    .limit(5);

  const IMPROVEMENT_TIPS: Record<string, { action: string; why: string }> = {
    testing: { action: "Before marking any task done, write ONE test for the unhappy path", why: "Testing discipline catches bugs before they reach production" },
    deep_understanding: { action: "After using any tool/library, explain HOW it works in one sentence", why: "Surface usage leads to debugging nightmares when things break" },
    research_ability: { action: "Before asking Claude, spend 5 min reading docs or grepping code yourself", why: "Self-found answers stick 10x better than given answers" },
    learning: { action: "After each session, write 1 thing you understood for the first time", why: "Deliberate learning extraction turns work into growth" },
    verification: { action: "Before implementing, state your assumption and how you'd verify it's correct", why: "Wrong assumptions waste hours — 30 seconds of verification saves them" },
    asking_questions: { action: "Replace 'fix this' with 'why does this happen?' in every interaction", why: "Good questions reveal understanding gaps; commands hide them" },
    code_quality: { action: "Read your diff before committing — would a stranger understand the naming?", why: "Clean code is a gift to future you (and your team reviewers)" },
    debugging: { action: "Read the full error message, then form a hypothesis before changing code", why: "Random changes create new bugs; systematic debugging solves root causes" },
    thinking_before_coding: { action: "Write 3 bullet points of your approach before typing any code", why: "Planning saves rewrites — the second attempt is always cleaner" },
    attitude: { action: "When stuck, set a 15-min timer before asking for help", why: "Persistence builds problem-solving muscles that shortcuts atrophy" },
    ownership: { action: "Before calling a feature 'done', list 3 ways it could break", why: "Owning edge cases separates senior from junior engineers" },
    system_design: { action: "Draw a quick box-and-arrow diagram before building any multi-component feature", why: "Seeing connections prevents tunnel vision on one piece" },
    pattern_recognition: { action: "When solving something, ask 'where have I seen a similar pattern before?'", why: "Transferring patterns across domains is what makes engineers fast" },
    proactiveness: { action: "If you notice something broken/improvable, fix it immediately rather than noting it", why: "Proactive fixes compound — reactive ones pile up as tech debt" },
    communication: { action: "If stuck for >30 min, write a clear message: what you tried, what failed, what you think is wrong", why: "Good communication unblocks you AND teaches you to think clearly" },
    speed_efficiency: { action: "Timebox: set 25-min Pomodoros and ship something by the end of each", why: "Time pressure forces prioritization and prevents gold-plating" },
    scope_awareness: { action: "Before adding 'one more thing', ask: does this serve the current goal?", why: "Scope creep kills deadlines; restraint ships products" },
    pr_quality: { action: "Write a 2-sentence PR description explaining WHY before pushing", why: "Reviewers judge intent, not just code — help them help you" },
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight page-section-header">Insights</h1>
        <p className="text-[13px] text-foreground-tertiary mt-1">
          Patterns and analysis from the last 30 days
        </p>
      </div>

      {areaAverages.length === 0 ? (
        <div className="card p-10 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-accent/[0.02] pointer-events-none" />
          <div className="relative">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-card-elevated flex items-center justify-center mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-foreground-tertiary">
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
                <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.75"/>
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              Not enough data for insights
            </h2>
            <p className="text-[13px] text-foreground-tertiary mt-2">
              Complete at least a few <code className="text-primary-light font-mono text-[11px] bg-primary-glow px-1.5 py-0.5 rounded">/mentor</code> sessions to see patterns.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="card p-5 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-success/[0.03] via-transparent to-transparent pointer-events-none" />
              <div className="relative">
                <h2 className="text-[11px] font-semibold text-success uppercase tracking-widest mb-4">
                  Strongest Areas (30d)
                </h2>
                <div className="space-y-3">
                  {strongest.map((item, i) => (
                    <div
                      key={item.area}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-[10px] font-mono text-foreground-tertiary w-4">{i + 1}.</span>
                        <span className="text-[13px] text-foreground">
                          {AREA_LABELS[item.area as GrowthArea] || item.area}
                        </span>
                      </div>
                      <span className="text-[13px] font-mono font-semibold text-success">
                        {item.avg.toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="card p-5 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-danger/[0.03] via-transparent to-transparent pointer-events-none" />
              <div className="relative">
                <h2 className="text-[11px] font-semibold text-danger uppercase tracking-widest mb-4">
                  Needs Work (30d)
                </h2>
                <div className="space-y-3">
                  {weakest.map((item, i) => (
                    <div
                      key={item.area}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-[10px] font-mono text-foreground-tertiary w-4">{i + 1}.</span>
                        <span className="text-[13px] text-foreground">
                          {AREA_LABELS[item.area as GrowthArea] || item.area}
                        </span>
                      </div>
                      <span className="text-[13px] font-mono font-semibold text-danger">
                        {item.avg.toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {weakest.length > 0 && (
            <div className="card p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-accent/[0.02] pointer-events-none" />
              <div className="relative">
                <h2 className="text-[11px] font-semibold text-primary-light uppercase tracking-widest mb-5">
                  How to Improve — Your Action Plan
                </h2>
                <div className="space-y-5">
                  {weakest.slice(0, 3).map((item) => {
                    const tip = IMPROVEMENT_TIPS[item.area];
                    return (
                      <div key={item.area} className="border-l-2 border-primary/30 pl-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-[13px] font-medium text-foreground">
                            {AREA_LABELS[item.area as GrowthArea] || item.area}
                          </h3>
                          <span className="text-[11px] text-danger font-mono font-medium">{item.avg.toFixed(1)}/5</span>
                        </div>
                        {tip && (
                          <>
                            <p className="text-[13px] text-foreground-secondary mt-1.5 leading-relaxed">
                              <span className="text-accent-light font-medium">Do this:</span>{" "}
                              {tip.action}
                            </p>
                            <p className="text-[11px] text-foreground-tertiary mt-1 leading-relaxed">
                              Why: {tip.why}
                            </p>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
                {pendingLearning.length > 0 && (
                  <div className="mt-6 pt-5 border-t border-card-border">
                    <h3 className="text-[10px] font-semibold text-foreground-tertiary uppercase tracking-widest mb-3">
                      Active Learning (from your sessions)
                    </h3>
                    <div className="space-y-1.5">
                      {pendingLearning.map((item) => (
                        <Link
                          key={item.id}
                          href={`/learn/${item.topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`}
                          className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-card-elevated/50 group transition-colors"
                        >
                          <span className="text-[13px] text-foreground-secondary group-hover:text-primary-light transition-colors">
                            {item.topic}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium uppercase tracking-wider border ${
                            item.priority === "high" ? "bg-danger/10 text-danger border-danger/20" : "bg-warning/10 text-warning border-warning/20"
                          }`}>
                            {item.priority}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="card p-6">
            <h2 className="text-[11px] font-semibold text-foreground-tertiary uppercase tracking-widest mb-4">
              All Areas — 30-Day Average
            </h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {areaAverages.map((item) => {
                const pct = (item.avg / 5) * 100;
                return (
                  <div key={item.area} className="flex items-center gap-3">
                    <span className="text-[11px] text-foreground-tertiary w-36 truncate">
                      {AREA_LABELS[item.area as GrowthArea] || item.area}
                    </span>
                    <div className="flex-1 bg-background-secondary rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          item.avg >= 4
                            ? "bg-success"
                            : item.avg >= 3
                            ? "bg-warning"
                            : "bg-danger"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-mono font-medium text-foreground w-8 text-right">
                      {item.avg.toFixed(1)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {reviews.length > 1 && (
            <div className="card p-6">
              <h2 className="text-[11px] font-semibold text-foreground-tertiary uppercase tracking-widest mb-4">
                Recent Mentor Messages
              </h2>
              <div className="space-y-4">
                {reviews.slice(0, 5).map((r) => (
                  <div key={r.id} className="border-b border-card-border pb-4 last:border-0 last:pb-0">
                    <p className="text-[11px] text-foreground-tertiary font-mono">{r.date}</p>
                    <p className="text-[13px] text-foreground-secondary mt-1.5 leading-relaxed">
                      {r.mentorMessage || "No message"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}


