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
      <div className="card p-5 flex flex-col items-center justify-center h-[280px] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-transparent" />
        <div className="relative text-center">
          <div className="w-14 h-14 rounded-2xl bg-card-elevated flex items-center justify-center mb-3 mx-auto">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-foreground-tertiary">
              <polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <polygon points="12,6 18,9.5 18,14.5 12,18 6,14.5 6,9.5" stroke="currentColor" strokeWidth="1" opacity="0.4" fill="none"/>
            </svg>
          </div>
          <p className="text-sm text-foreground-secondary font-medium">No scores yet</p>
          <p className="text-[11px] text-foreground-tertiary mt-1">
            Use <code className="text-primary-light font-mono text-[10px]">/mentor</code> to start
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <h3 className="text-[11px] font-semibold text-foreground-tertiary uppercase tracking-widest mb-3">
        Category Overview
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <RadarChart data={data}>
          <PolarGrid stroke="#1f1f2e" strokeWidth={0.5} />
          <PolarAngleAxis
            dataKey="area"
            tick={{ fill: "#a8a8b8", fontSize: 11, fontWeight: 500 }}
          />
          <Radar
            dataKey="score"
            stroke="#7c5cfc"
            strokeWidth={2}
            fill="url(#radarGradient)"
            fillOpacity={0.3}
          />
          <defs>
            <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#9b82ff" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#7c5cfc" stopOpacity={0.05} />
            </linearGradient>
          </defs>
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
