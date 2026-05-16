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
          <h1 className="text-2xl font-semibold text-foreground tracking-tight page-section-header">Dashboard</h1>
          <p className="text-sm text-foreground-tertiary mt-1">Loading...</p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 card p-5 h-24 bg-card-elevated/50 animate-pulse" />
          <div className="card p-5 h-24 bg-card-elevated/50 animate-pulse" />
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card p-4 h-[100px] bg-card-elevated/50 animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
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
        <h1 className="text-2xl font-semibold text-foreground tracking-tight page-section-header">
          Dashboard
        </h1>
        <p className="text-[13px] text-foreground-tertiary mt-1">
          Your developer growth at a glance
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 stagger-children">
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
          <h2 className="text-[11px] font-semibold text-foreground-tertiary uppercase tracking-widest mb-3">
            Recent Achievements
          </h2>
          <div className="grid grid-cols-3 gap-3 stagger-children">
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
          <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] via-transparent to-accent/[0.02] pointer-events-none" />
          <div className="relative">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-primary-glow-strong flex items-center justify-center mb-4 animate-pulse-glow">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-primary-light">
                <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-foreground tracking-tight">
              Ready to start tracking
            </h2>
            <p className="text-[13px] text-foreground-secondary mt-2 max-w-sm mx-auto leading-relaxed">
              Use{" "}
              <code className="text-primary-light font-mono text-[11px] bg-primary-glow px-1.5 py-0.5 rounded">
                /mentor
              </code>{" "}
              during coding sessions and{" "}
              <code className="text-primary-light font-mono text-[11px] bg-primary-glow px-1.5 py-0.5 rounded">
                /review-day
              </code>{" "}
              at the end of each day.
            </p>
            <div className="mt-6 flex items-center justify-center gap-6 text-[11px] text-foreground-tertiary">
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
