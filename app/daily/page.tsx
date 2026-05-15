import { db } from "@/lib/db";
import { dailyReviews } from "@/lib/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getScoreColor(score: number): string {
  if (score >= 4) return "bg-success";
  if (score >= 3) return "bg-warning";
  if (score >= 2) return "bg-orange-500";
  return "bg-danger";
}

export default async function DailyPage() {
  const reviews = await db
    .select()
    .from(dailyReviews)
    .orderBy(desc(dailyReviews.date))
    .limit(90);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Daily Log</h1>
        <p className="text-muted text-sm mt-1">
          Your daily reviews and scores
        </p>
      </div>

      {reviews.length === 0 ? (
        <div className="bg-card border border-card-border rounded-xl p-8 text-center">
          <p className="text-4xl mb-3">📅</p>
          <h2 className="text-lg font-medium text-foreground">No daily reviews yet</h2>
          <p className="text-muted text-sm mt-2">
            Use <code className="text-accent-light bg-accent/10 px-1.5 py-0.5 rounded">/review-day</code> at the end of your workday.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="bg-card border border-card-border rounded-xl p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-foreground">
                  {new Date(review.date).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted">Overall:</span>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full text-white ${getScoreColor(
                      parseFloat(review.overallAvg || "0")
                    )}`}
                  >
                    {parseFloat(review.overallAvg || "0").toFixed(1)}
                  </span>
                  {review.xpEarned && review.xpEarned > 0 && (
                    <span className="text-xs text-accent-light">
                      +{review.xpEarned} XP
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3 mb-4">
                <div className="text-center">
                  <p className="text-xs text-muted">Core Habits</p>
                  <p className="text-lg font-bold text-foreground">
                    {parseFloat(review.categoryAvgCoreHabits || "0").toFixed(1)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted">Technical</p>
                  <p className="text-lg font-bold text-foreground">
                    {parseFloat(review.categoryAvgTechnical || "0").toFixed(1)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted">Growth</p>
                  <p className="text-lg font-bold text-foreground">
                    {parseFloat(review.categoryAvgGrowth || "0").toFixed(1)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted">Professional</p>
                  <p className="text-lg font-bold text-foreground">
                    {parseFloat(review.categoryAvgProfessional || "0").toFixed(1)}
                  </p>
                </div>
              </div>

              {review.mentorMessage && (
                <div className="border-t border-card-border pt-3 mt-3">
                  <p className="text-sm text-muted italic">
                    {review.mentorMessage}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 mt-3 border-t border-card-border pt-3">
                {review.biggestWin && (
                  <div>
                    <p className="text-xs text-success font-medium">Biggest Win</p>
                    <p className="text-xs text-muted mt-0.5">{review.biggestWin}</p>
                  </div>
                )}
                {review.biggestMiss && (
                  <div>
                    <p className="text-xs text-danger font-medium">Biggest Miss</p>
                    <p className="text-xs text-muted mt-0.5">{review.biggestMiss}</p>
                  </div>
                )}
                {review.keyLearning && (
                  <div>
                    <p className="text-xs text-accent-light font-medium">Key Learning</p>
                    <p className="text-xs text-muted mt-0.5">{review.keyLearning}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
