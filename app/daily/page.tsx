import { db } from "@/lib/db";
import { dailyReviews } from "@/lib/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getScoreColor(score: number): string {
  if (score >= 4) return "bg-success text-white";
  if (score >= 3) return "bg-warning text-black";
  if (score >= 2) return "bg-orange-500 text-white";
  return "bg-danger text-white";
}

function getScoreTextColor(score: number): string {
  if (score >= 4) return "text-success";
  if (score >= 3) return "text-warning";
  return "text-danger";
}

export default async function DailyPage() {
  const reviews = await db
    .select()
    .from(dailyReviews)
    .orderBy(desc(dailyReviews.date))
    .limit(90);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight page-section-header">Daily Log</h1>
        <p className="text-[13px] text-foreground-tertiary mt-1">
          Your daily reviews and scores
        </p>
      </div>

      {reviews.length === 0 ? (
        <div className="card p-10 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-info/[0.03] via-transparent to-transparent pointer-events-none" />
          <div className="relative">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-card-elevated flex items-center justify-center mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-foreground-tertiary">
                <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.75"/>
                <path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-foreground">No daily reviews yet</h2>
            <p className="text-[13px] text-foreground-tertiary mt-2">
              Use <code className="text-primary-light font-mono text-[11px] bg-primary-glow px-1.5 py-0.5 rounded">/review-day</code> at the end of your workday.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4 stagger-children">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="card p-5 relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[14px] font-medium text-foreground">
                  {new Date(review.date).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </h3>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-foreground-tertiary">Overall</span>
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg ${getScoreColor(
                      parseFloat(review.overallAvg || "0")
                    )}`}
                  >
                    {parseFloat(review.overallAvg || "0").toFixed(1)}
                  </span>
                  {review.xpEarned && review.xpEarned > 0 && (
                    <span className="text-[11px] text-primary-light font-mono font-medium">
                      +{review.xpEarned} XP
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3 mb-4">
                {[
                  { label: "Core Habits", value: review.categoryAvgCoreHabits },
                  { label: "Technical", value: review.categoryAvgTechnical },
                  { label: "Growth", value: review.categoryAvgGrowth },
                  { label: "Professional", value: review.categoryAvgProfessional },
                ].map((cat) => {
                  const score = parseFloat(cat.value || "0");
                  return (
                    <div key={cat.label} className="text-center p-3 rounded-xl bg-card-elevated/50">
                      <p className="text-[10px] text-foreground-tertiary uppercase tracking-wider font-medium">{cat.label}</p>
                      <p className={`text-lg font-bold mt-1 font-mono ${getScoreTextColor(score)}`}>
                        {score.toFixed(1)}
                      </p>
                    </div>
                  );
                })}
              </div>

              {review.mentorMessage && (
                <div className="border-t border-card-border pt-4 mt-4">
                  <p className="text-[13px] text-foreground-secondary leading-relaxed italic">
                    &ldquo;{review.mentorMessage}&rdquo;
                  </p>
                </div>
              )}

              {(review.biggestWin || review.biggestMiss || review.keyLearning) && (
                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-card-border">
                  {review.biggestWin && (
                    <div>
                      <p className="text-[10px] text-success font-medium uppercase tracking-wider mb-1">Biggest Win</p>
                      <p className="text-[12px] text-foreground-tertiary leading-relaxed">{review.biggestWin}</p>
                    </div>
                  )}
                  {review.biggestMiss && (
                    <div>
                      <p className="text-[10px] text-danger font-medium uppercase tracking-wider mb-1">Biggest Miss</p>
                      <p className="text-[12px] text-foreground-tertiary leading-relaxed">{review.biggestMiss}</p>
                    </div>
                  )}
                  {review.keyLearning && (
                    <div>
                      <p className="text-[10px] text-primary-light font-medium uppercase tracking-wider mb-1">Key Learning</p>
                      <p className="text-[12px] text-foreground-tertiary leading-relaxed">{review.keyLearning}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
