"use client";

interface StatsGridProps {
  totalSessions: number;
  totalHours: number;
  daysSinceStart: number;
  overallAvg: number | null;
}

const STAT_CONFIG = [
  { key: "sessions", label: "Sessions", gradient: "from-blue-500/8 to-blue-600/4", iconColor: "text-info" },
  { key: "hours", label: "Hours", gradient: "from-emerald-500/8 to-emerald-600/4", iconColor: "text-success" },
  { key: "days", label: "Days Active", gradient: "from-violet-500/8 to-violet-600/4", iconColor: "text-primary-light" },
  { key: "avg", label: "Overall Avg", gradient: "from-amber-500/8 to-amber-600/4", iconColor: "text-warning" },
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

  const icons: Record<string, React.ReactNode> = {
    sessions: <SessionIcon />,
    hours: <ClockIcon />,
    days: <CalIcon />,
    avg: <ChartIcon />,
  };

  return (
    <div className="grid grid-cols-4 gap-3">
      {STAT_CONFIG.map((stat) => (
        <div
          key={stat.key}
          className="card p-4 text-center relative overflow-hidden group"
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
          <div className="relative">
            <div className={`w-9 h-9 mx-auto rounded-lg bg-card-elevated flex items-center justify-center mb-2.5 ${stat.iconColor}`}>
              {icons[stat.key]}
            </div>
            <p className="text-xl font-semibold text-foreground tracking-tight font-mono">
              {values[stat.key]}
            </p>
            <p className="text-[10px] text-foreground-tertiary mt-1 uppercase tracking-widest font-medium">
              {stat.label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function SessionIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <path d="M8 21h8M12 17v4"/>
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 6v6l4 2"/>
    </svg>
  );
}

function CalIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <path d="M16 2v4M8 2v4M3 10h18"/>
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 20V10M12 20V4M6 20v-6"/>
    </svg>
  );
}
