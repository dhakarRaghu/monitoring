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
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Insights</h1>
        <p className="text-muted text-sm mt-1">
          Patterns and analysis from the last 30 days
        </p>
      </div>

      {areaAverages.length === 0 ? (
        <div className="bg-card border border-card-border rounded-xl p-8 text-center">
          <p className="text-4xl mb-3">💡</p>
          <h2 className="text-lg font-medium text-foreground">
            Not enough data for insights
          </h2>
          <p className="text-muted text-sm mt-2">
            Complete at least a few /mentor sessions to see patterns.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card border border-card-border rounded-xl p-5">
              <h2 className="text-sm font-medium text-success mb-3">
                Strongest Areas (30d)
              </h2>
              <div className="space-y-2">
                {strongest.map((item) => (
                  <div
                    key={item.area}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm text-foreground">
                      {AREA_LABELS[item.area as GrowthArea] || item.area}
                    </span>
                    <span className="text-sm font-medium text-success">
                      {item.avg.toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card border border-card-border rounded-xl p-5">
              <h2 className="text-sm font-medium text-danger mb-3">
                Needs Work (30d)
              </h2>
              <div className="space-y-2">
                {weakest.map((item) => (
                  <div
                    key={item.area}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm text-foreground">
                      {AREA_LABELS[item.area as GrowthArea] || item.area}
                    </span>
                    <span className="text-sm font-medium text-danger">
                      {item.avg.toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {weakest.length > 0 && (
            <div className="bg-card border border-card-border rounded-xl p-5">
              <h2 className="text-sm font-medium text-accent mb-4">
                How to Improve — Your Action Plan
              </h2>
              <div className="space-y-4">
                {weakest.slice(0, 3).map((item) => {
                  const tip = IMPROVEMENT_TIPS[item.area];
                  return (
                    <div key={item.area} className="border-l-2 border-accent/50 pl-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-foreground">
                          {AREA_LABELS[item.area as GrowthArea] || item.area}
                        </h3>
                        <span className="text-xs text-danger font-medium">{item.avg.toFixed(1)}/5</span>
                      </div>
                      {tip && (
                        <>
                          <p className="text-sm text-foreground mt-1">
                            <span className="text-accent-light font-medium">Do this:</span>{" "}
                            {tip.action}
                          </p>
                          <p className="text-xs text-muted mt-0.5">
                            Why: {tip.why}
                          </p>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              {pendingLearning.length > 0 && (
                <div className="mt-5 pt-4 border-t border-card-border">
                  <h3 className="text-xs font-medium text-muted mb-2">
                    Active Learning (from your sessions)
                  </h3>
                  <div className="space-y-1.5">
                    {pendingLearning.map((item) => (
                      <Link
                        key={item.id}
                        href={`/learn/${item.topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`}
                        className="flex items-center justify-between py-1 group"
                      >
                        <span className="text-sm text-foreground-secondary group-hover:text-accent-light transition-colors">
                          {item.topic}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          item.priority === "high" ? "bg-danger/20 text-danger" : "bg-warning/20 text-warning"
                        }`}>
                          {item.priority}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="bg-card border border-card-border rounded-xl p-5">
            <h2 className="text-sm font-medium text-muted mb-3">
              All Areas — 30-Day Average
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {areaAverages.map((item) => {
                const pct = (item.avg / 5) * 100;
                return (
                  <div key={item.area} className="flex items-center gap-2">
                    <span className="text-xs text-muted w-40 truncate">
                      {AREA_LABELS[item.area as GrowthArea] || item.area}
                    </span>
                    <div className="flex-1 bg-card-border rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          item.avg >= 4
                            ? "bg-success"
                            : item.avg >= 3
                            ? "bg-warning"
                            : "bg-danger"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-foreground w-8 text-right">
                      {item.avg.toFixed(1)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {reviews.length > 1 && (
            <div className="bg-card border border-card-border rounded-xl p-5">
              <h2 className="text-sm font-medium text-muted mb-3">
                Recent Mentor Messages
              </h2>
              <div className="space-y-3">
                {reviews.slice(0, 5).map((r) => (
                  <div key={r.id} className="border-b border-card-border pb-3 last:border-0">
                    <p className="text-xs text-muted">{r.date}</p>
                    <p className="text-sm text-foreground mt-1">
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

