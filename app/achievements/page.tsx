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
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Achievements</h1>
          <p className="text-muted text-sm mt-1">
            {unlocked.length} / {achievements.length} unlocked
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted">XP from achievements</p>
          <p className="text-xl font-bold text-accent-light">
            {totalXpFromAchievements} XP
          </p>
        </div>
      </div>

      {unlocked.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-success mb-3">
            Unlocked ({unlocked.length})
          </h2>
          <div className="grid grid-cols-3 gap-3">
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
            <h2 className="text-sm font-medium text-muted mb-3 capitalize">
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
