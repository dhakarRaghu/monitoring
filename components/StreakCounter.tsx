"use client";

interface StreakCounterProps {
  current: number;
  longest: number;
}

export function StreakCounter({ current, longest }: StreakCounterProps) {
  return (
    <div className="card p-5 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-warning/[0.08] via-transparent to-accent/[0.03]" />
      <div className="relative flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-warning-bg border border-warning/20 flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-warning">
            <path d="M12 2c.3 3.6-2 5.8-3.5 8C7 12.5 8.5 16 12 17c3.5-1 5-4.5 3.5-7-1.5-2.2-3.8-4.4-3.5-8z" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 17v5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
          </svg>
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground tracking-tight">
            {current}
            <span className="text-sm font-normal text-foreground-tertiary ml-1.5">days</span>
          </p>
          <p className="text-[11px] text-foreground-tertiary mt-0.5">
            Current streak
            {longest > 0 && (
              <span className="ml-2 opacity-60">
                Best: {longest}d
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
