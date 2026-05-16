"use client";

import { useEffect, useState } from "react";
import { AchievementBadge } from "@/components/AchievementBadge";

interface Achievement {
  slug: string;
  name: string;
  description: string;
  xpReward: number;
  icon: string;
  category: string;
  conditionDescription: string;
  unlocked: boolean;
  unlockedAt?: string;
}

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    fetch("/api/achievements")
      .then((r) => r.json())
      .then(setAchievements);
  }, []);

  const unlocked = achievements.filter((a) => a.unlocked);
  const locked = achievements.filter((a) => !a.unlocked);
  const totalXpFromAchievements = unlocked.reduce((sum, a) => sum + a.xpReward, 0);

  const categories = [...new Set(achievements.map((a) => a.category))];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight page-section-header">Achievements</h1>
          <p className="text-[13px] text-foreground-tertiary mt-1">
            <span className="font-mono">{unlocked.length}</span> / <span className="font-mono">{achievements.length}</span> unlocked
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-foreground-tertiary uppercase tracking-wider font-medium">XP from achievements</p>
          <p className="text-xl font-bold text-primary-light font-mono mt-0.5">
            {totalXpFromAchievements} XP
          </p>
        </div>
      </div>

      {unlocked.length > 0 && (
        <div>
          <h2 className="text-[11px] font-semibold text-success uppercase tracking-widest mb-3">
            Unlocked ({unlocked.length})
          </h2>
          <div className="grid grid-cols-3 gap-3 stagger-children">
            {unlocked.map((a) => (
              <AchievementBadge
                key={a.slug}
                icon={a.icon}
                name={a.name}
                description={a.description}
                unlocked={true}
                unlockedAt={a.unlockedAt}
                xpReward={a.xpReward}
              />
            ))}
          </div>
        </div>
      )}

      {categories.map((category) => {
        const categoryLocked = locked.filter((a) => a.category === category);
        if (categoryLocked.length === 0) return null;
        return (
          <div key={category}>
            <h2 className="text-[11px] font-semibold text-foreground-tertiary uppercase tracking-widest mb-3 capitalize">
              {category} ({categoryLocked.length} remaining)
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {categoryLocked.map((a) => (
                <AchievementBadge
                  key={a.slug}
                  icon={a.icon}
                  name={a.name}
                  description={a.conditionDescription}
                  unlocked={false}
                  xpReward={a.xpReward}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
