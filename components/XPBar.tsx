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
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.1] via-transparent to-accent/[0.05]" />
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary-glow-strong border border-primary/20 flex items-center justify-center shadow-[var(--shadow-glow)]">
              <span className="text-2xl font-bold gradient-text">{level}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground tracking-tight">{title}</p>
              <p className="text-[11px] text-foreground-tertiary mt-0.5">Level {level}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-mono font-medium text-foreground">
              {currentXp.toLocaleString()}
              <span className="text-foreground-tertiary"> / {xpToNext.toLocaleString()}</span>
            </p>
            <p className="text-[11px] text-foreground-tertiary mt-0.5">XP to next level</p>
          </div>
        </div>
        <div className="w-full bg-background-secondary rounded-full h-2 overflow-hidden border border-card-border">
          <div
            className="progress-bar h-full rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${Math.min(100, Math.max(2, progress))}%` }}
          />
        </div>
      </div>
    </div>
  );
}
