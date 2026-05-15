"use client";

interface XPBarProps {
  currentXp: number;
  xpToNext: number;
  level: number;
  title: string;
}

export function XPBar({ currentXp, xpToNext, level, title }: XPBarProps) {
  const levelStart = level * level * 25;
  const progress = xpToNext > levelStart
    ? ((currentXp - levelStart) / (xpToNext - levelStart)) * 100
    : 0;

  return (
    <div className="card p-5 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary via-primary-light to-purple-400 opacity-60" />
      <div className="flex items-baseline justify-between mb-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold gradient-text tracking-tight">
            Lv.{level}
          </span>
          <span className="text-sm text-foreground-secondary font-medium">
            {title}
          </span>
        </div>
        <div className="text-right">
          <span className="text-sm font-mono text-foreground-secondary">
            {currentXp}
          </span>
          <span className="text-sm text-foreground-tertiary"> / {xpToNext} XP</span>
        </div>
      </div>
      <div className="w-full bg-background-secondary rounded-full h-2.5 overflow-hidden">
        <div
          className="progress-bar h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${Math.min(100, Math.max(2, progress))}%` }}
        />
      </div>
    </div>
  );
}
