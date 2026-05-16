"use client";

interface AchievementBadgeProps {
  icon: string;
  name: string;
  description: string;
  unlocked: boolean;
  unlockedAt?: string;
  xpReward: number;
}

export function AchievementBadge({
  icon,
  name,
  description,
  unlocked,
  unlockedAt,
  xpReward,
}: AchievementBadgeProps) {
  return (
    <div
      className={`card-interactive p-4 ${
        unlocked
          ? "border-primary/20 bg-gradient-to-br from-primary/[0.04] to-transparent"
          : "opacity-40 grayscale hover:opacity-60"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            unlocked ? "bg-primary-glow-strong" : "bg-card-elevated"
          }`}
        >
          <span className="text-lg">{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-[13px] text-foreground truncate">{name}</p>
          <p className="text-[11px] text-foreground-tertiary mt-0.5 line-clamp-2 leading-relaxed">
            {description}
          </p>
          {unlocked && unlockedAt && (
            <p className="text-[11px] text-success mt-1.5 font-medium">
              Unlocked {new Date(unlockedAt).toLocaleDateString()}
            </p>
          )}
          {!unlocked && (
            <p className="text-[11px] text-primary-light mt-1.5 font-medium font-mono">
              +{xpReward} XP
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
