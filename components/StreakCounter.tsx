"use client";

interface StreakCounterProps {
  current: number;
  longest: number;
}

export function StreakCounter({ current, longest }: StreakCounterProps) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-warning-bg flex items-center justify-center">
        <span className="text-2xl">🔥</span>
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground tracking-tight">
          {current} <span className="text-sm font-normal text-foreground-secondary">days</span>
        </p>
        <p className="text-xs text-foreground-tertiary mt-0.5">
          Current streak
          {longest > 0 && (
            <span className="ml-2 text-foreground-tertiary/60">
              Best: {longest}d
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
