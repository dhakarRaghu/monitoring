import { LEVEL_TITLES } from "./types";

export function calculateLevel(totalXp: number): number {
  return Math.max(1, Math.floor(Math.sqrt(totalXp / 25)));
}

export function xpForLevel(level: number): number {
  return level * level * 25;
}

export function xpToNextLevel(totalXp: number): number {
  const currentLevel = calculateLevel(totalXp);
  return xpForLevel(currentLevel + 1);
}

export function getLevelTitle(level: number): string {
  const levels = Object.keys(LEVEL_TITLES)
    .map(Number)
    .sort((a, b) => b - a);
  for (const l of levels) {
    if (level >= l) return LEVEL_TITLES[l];
  }
  return "Beginner";
}

export function calculateSessionXp(scores: Record<string, number>): number {
  let xp = 5; // base XP for completing a /mentor review

  for (const score of Object.values(scores)) {
    if (score >= 4) xp += 3;
    if (score === 5) xp += 5;
  }

  return xp;
}

export function calculateDailyXp(
  scores: Record<string, number>,
  yesterdayScores?: Record<string, number>
): number {
  let xp = 10; // base XP for completing /review-day

  for (const [area, score] of Object.entries(scores)) {
    if (score >= 4) xp += 3;
    if (score === 5) xp += 5;
    if (yesterdayScores && yesterdayScores[area] && score > yesterdayScores[area]) {
      xp += 5;
    }
  }

  const allAbove3 = Object.values(scores).every((s) => s >= 3);
  if (allAbove3 && Object.values(scores).length === 18) xp += 20;

  return xp;
}

export function calculateStreakBonus(streak: number): number {
  return streak * 2;
}
