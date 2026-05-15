"use client";

interface StatsGridProps {
  totalSessions: number;
  totalHours: number;
  daysSinceStart: number;
  overallAvg: number | null;
}

const STAT_CONFIG = [
  { key: "sessions", label: "Sessions", icon: "💻", color: "from-blue-500/10 to-blue-600/5" },
  { key: "hours", label: "Hours", icon: "⏱️", color: "from-green-500/10 to-green-600/5" },
  { key: "days", label: "Days Active", icon: "📆", color: "from-purple-500/10 to-purple-600/5" },
  { key: "avg", label: "Overall Avg", icon: "📊", color: "from-amber-500/10 to-amber-600/5" },
];

export function StatsGrid({
  totalSessions,
  totalHours,
  daysSinceStart,
  overallAvg,
}: StatsGridProps) {
  const values: Record<string, string | number> = {
    sessions: totalSessions,
    hours: totalHours.toFixed(1),
    days: daysSinceStart,
    avg: overallAvg ? overallAvg.toFixed(1) : "—",
  };

  return (
    <div className="grid grid-cols-4 gap-3">
      {STAT_CONFIG.map((stat) => (
        <div
          key={stat.key}
          className="card p-4 text-center group hover:shadow-[var(--shadow-2)] transition-all duration-150"
        >
          <div className={`w-9 h-9 mx-auto rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center mb-2`}>
            <span className="text-base">{stat.icon}</span>
          </div>
          <p className="text-xl font-semibold text-foreground tracking-tight">
            {values[stat.key]}
          </p>
          <p className="text-[11px] text-foreground-tertiary mt-0.5 uppercase tracking-wider font-medium">
            {stat.label}
          </p>
        </div>
      ))}
    </div>
  );
}
