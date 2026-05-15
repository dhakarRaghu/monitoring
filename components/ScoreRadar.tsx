"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";

interface ScoreRadarProps {
  data: { area: string; score: number }[];
}

export function ScoreRadar({ data }: ScoreRadarProps) {
  if (data.length === 0) {
    return (
      <div className="card p-5 flex flex-col items-center justify-center h-[280px]">
        <div className="w-14 h-14 rounded-2xl bg-primary-glow flex items-center justify-center mb-3">
          <span className="text-2xl opacity-60">📐</span>
        </div>
        <p className="text-sm text-foreground-secondary">No scores yet</p>
        <p className="text-xs text-foreground-tertiary mt-1">
          Use <code className="text-primary-light">/mentor</code> to start
        </p>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <h3 className="text-xs font-semibold text-foreground-tertiary uppercase tracking-wider mb-3">
        Category Overview
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <RadarChart data={data}>
          <PolarGrid stroke="#27272a" strokeWidth={0.5} />
          <PolarAngleAxis
            dataKey="area"
            tick={{ fill: "#a1a1aa", fontSize: 11, fontWeight: 500 }}
          />
          <Radar
            dataKey="score"
            stroke="#6366f1"
            strokeWidth={2}
            fill="url(#radarGradient)"
            fillOpacity={0.3}
          />
          <defs>
            <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#818cf8" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0.1} />
            </linearGradient>
          </defs>
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
