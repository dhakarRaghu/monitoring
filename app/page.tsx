import { db } from "@/lib/db";
import { profile, dailyReviews, unlockedAchievements, achievements } from "@/lib/schema";
import { desc, eq } from "drizzle-orm";
import { XPBar } from "@/components/XPBar";
import { StreakCounter } from "@/components/StreakCounter";
import { ScoreRadar } from "@/components/ScoreRadar";
import { MentorMessage } from "@/components/MentorMessage";
import { StatsGrid } from "@/components/StatsGrid";
import { AchievementBadge } from "@/components/AchievementBadge";
import { xpToNextLevel } from "@/lib/gamification";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const [p] = await db.select().from(profile).limit(1);
  const [latestReview] = await db
    .select()
    .from(dailyReviews)
    .orderBy(desc(dailyReviews.date))
    .limit(1);

  const recentAchievements = await db
    .select({
      slug: unlockedAchievements.achievementSlug,
      unlockedAt: unlockedAchievements.unlockedAt,
      name: achievements.name,
      icon: achievements.icon,
      description: achievements.description,
      xpReward: achievements.xpReward,
    })
    .from(unlockedAchievements)
    .innerJoin(
      achievements,
      eq(unlockedAchievements.achievementSlug, achievements.slug)
    )
    .orderBy(desc(unlockedAchievements.unlockedAt))
    .limit(3);

  const totalXp = p?.totalXp || 0;
  const level = p?.level || 1;
  const title = p?.title || "Beginner";
  const nextLevelXp = xpToNextLevel(totalXp);

  const daysSinceStart = p?.startDate
    ? Math.floor(
        (Date.now() - new Date(p.startDate).getTime()) / (1000 * 60 * 60 * 24)
      )
    : 0;

  const radarData = latestReview
    ? [
        {
          area: "Core Habits",
          score: parseFloat(latestReview.categoryAvgCoreHabits || "0"),
        },
        {
          area: "Technical",
          score: parseFloat(latestReview.categoryAvgTechnical || "0"),
        },
        {
          area: "Growth",
          score: parseFloat(latestReview.categoryAvgGrowth || "0"),
        },
        {
          area: "Professional",
          score: parseFloat(latestReview.categoryAvgProfessional || "0"),
        },
      ]
    : [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          Dashboard
        </h1>
        <p className="text-sm text-foreground-tertiary mt-1">
          Your developer growth at a glance
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <XPBar
            currentXp={totalXp}
            xpToNext={nextLevelXp}
            level={level}
            title={title}
          />
        </div>
        <StreakCounter
          current={p?.currentStreak || 0}
          longest={p?.longestStreak || 0}
        />
      </div>

      <StatsGrid
        totalSessions={p?.totalSessions || 0}
        totalHours={parseFloat(p?.totalHours || "0")}
        daysSinceStart={daysSinceStart}
        overallAvg={
          latestReview ? parseFloat(latestReview.overallAvg || "0") : null
        }
      />

      <div className="grid grid-cols-2 gap-4">
        <ScoreRadar data={radarData} />
        <MentorMessage message={latestReview?.mentorMessage || null} />
      </div>

      {recentAchievements.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-foreground-tertiary uppercase tracking-wider mb-3">
            Recent Achievements
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {recentAchievements.map((a) => (
              <AchievementBadge
                key={a.slug}
                icon={a.icon || "🏆"}
                name={a.name || ""}
                description={a.description || ""}
                unlocked={true}
                unlockedAt={a.unlockedAt?.toISOString()}
                xpReward={a.xpReward || 20}
              />
            ))}
          </div>
        </div>
      )}

      {!latestReview && (
        <div className="card p-10 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-glow via-transparent to-purple-500/5 pointer-events-none" />
          <div className="relative">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-primary-glow-strong flex items-center justify-center mb-4 animate-pulse-glow">
              <span className="text-3xl">🚀</span>
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              Ready to start tracking
            </h2>
            <p className="text-sm text-foreground-secondary mt-2 max-w-sm mx-auto leading-relaxed">
              Use{" "}
              <code className="text-primary-light bg-primary-glow px-1.5 py-0.5 rounded text-xs font-medium">
                /mentor
              </code>{" "}
              during coding sessions and{" "}
              <code className="text-primary-light bg-primary-glow px-1.5 py-0.5 rounded text-xs font-medium">
                /review-day
              </code>{" "}
              at the end of each day.
            </p>
            <div className="mt-6 flex items-center justify-center gap-6 text-xs text-foreground-tertiary">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-success" />
                18 growth areas
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary" />
                XP & levels
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-warning" />
                17 achievements
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
