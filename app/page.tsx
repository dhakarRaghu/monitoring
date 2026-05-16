"use client";

import { useEffect, useState } from "react";
import { XPBar } from "@/components/XPBar";
import { StreakCounter } from "@/components/StreakCounter";
import { ScoreRadar } from "@/components/ScoreRadar";
import { MentorMessage } from "@/components/MentorMessage";
import { StatsGrid } from "@/components/StatsGrid";
import { AchievementBadge } from "@/components/AchievementBadge";

interface ProfileData {
  totalXp: number;
  level: number;
  title: string;
  currentStreak: number;
  longestStreak: number;
  totalSessions: number;
  totalHours: string;
  startDate: string;
  xpToNextLevel: number;
}

interface DailyReview {
  categoryAvgCoreHabits: string | null;
  categoryAvgTechnical: string | null;
  categoryAvgGrowth: string | null;
  categoryAvgProfessional: string | null;
  overallAvg: string | null;
  mentorMessage: string | null;
}

interface Achievement {
  slug: string;
  name: string;
  icon: string;
  description: string;
  xpReward: number;
  unlockedAt: string;
}

export default function Dashboard() {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [latestReview, setLatestReview] = useState<DailyReview | null>(null);
  const [recentAchievements, setRecentAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/profile").then((r) => r.json()),
      fetch("/api/daily").then((r) => r.json()),
      fetch("/api/achievements").then((r) => r.json()),
    ]).then(([profile, reviews, achievements]) => {
      setProfileData(profile);
      if (Array.isArray(reviews) && reviews.length > 0) {
        setLatestReview(reviews[0]);
      }
      const unlocked = achievements.filter((a: { unlocked: boolean }) => a.unlocked);
      setRecentAchievements(unlocked.slice(0, 3));
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Dashboard</h1>
          <p className="text-sm text-foreground-tertiary mt-1">Loading...</p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 card p-5 h-24 animate-pulse bg-card-elevated" />
          <div className="card p-5 h-24 animate-pulse bg-card-elevated" />
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card p-4 h-24 animate-pulse bg-card-elevated" />
          ))}
        </div>
      </div>
    );
  }

  const p = profileData;
  const totalXp = p?.totalXp || 0;
  const level = p?.level || 1;
  const title = p?.title || "Beginner";
  const nextLevelXp = p?.xpToNextLevel || 100;

  const daysSinceStart = p?.startDate
    ? Math.floor(
        (new Date().getTime() - new Date(p.startDate).getTime()) / (86400000)
      )
    : 0;

  const radarData = latestReview
    ? [
        { area: "Core Habits", score: parseFloat(latestReview.categoryAvgCoreHabits || "0") },
        { area: "Technical", score: parseFloat(latestReview.categoryAvgTechnical || "0") },
        { area: "Growth", score: parseFloat(latestReview.categoryAvgGrowth || "0") },
        { area: "Professional", score: parseFloat(latestReview.categoryAvgProfessional || "0") },
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
        overallAvg={latestReview ? parseFloat(latestReview.overallAvg || "0") : null}
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
                unlockedAt={a.unlockedAt}
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
