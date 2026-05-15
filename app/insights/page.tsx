import { db } from "@/lib/db";
import { dailyReviews, sessionScores, sessions } from "@/lib/schema";
import { desc, gte, eq } from "drizzle-orm";
import { AREA_LABELS, type GrowthArea } from "@/lib/types";

export const dynamic = "force-dynamic";

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

