"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { CATEGORIES, CATEGORY_LABELS, AREA_LABELS, type GrowthArea } from "@/lib/types";


const AREA_COLORS = [
  "#7c5cfc", "#9b82ff", "#b8a4ff", "#d4c8ff",
  "#34d399", "#5ee8cc", "#86efac",
  "#fbbf24", "#fcd34d", "#fde68a",
  "#f472b6", "#fb7185", "#fda4af",
  "#f87171", "#fca5a5", "#fecaca",
  "#60a5fa", "#93c5fd",
];

type TimeRange = "7" | "30" | "90" | "all";

export default function TrendsPage() {
  const [data, setData] = useState<{ trendData: Record<string, unknown>[] }>({ trendData: [] });
  const [range, setRange] = useState<TimeRange>("30");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    const days = range === "all" ? "365" : range;
    fetch(`/api/trends?days=${days}`)
      .then((r) => r.json())
      .then(setData);
  }, [range]);

  const areas =
    selectedCategory === "all"
      ? Object.values(CATEGORIES).flat()
      : CATEGORIES[selectedCategory as keyof typeof CATEGORIES] || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight page-section-header">Trends</h1>
          <p className="text-[13px] text-foreground-tertiary mt-1">Track your progress over time</p>
        </div>
        <div className="segmented-control">
          {(["7", "30", "90", "all"] as TimeRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`segmented-option ${
                range === r
                  ? "segmented-option-active"
                  : ""
              }`}
            >
              {r === "all" ? "All" : `${r}d`}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={() => setSelectedCategory("all")}
          className={`px-3 py-1.5 text-[11px] font-medium rounded-lg transition-all duration-150 ${
            selectedCategory === "all"
              ? "bg-primary/[0.12] text-primary-light border border-primary/20"
              : "bg-card border border-card-border text-foreground-tertiary hover:text-foreground hover:border-card-border-hover"
          }`}
        >
          All Areas
        </button>
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSelectedCategory(key)}
            className={`px-3 py-1.5 text-[11px] font-medium rounded-lg transition-all duration-150 ${
              selectedCategory === key
                ? "bg-primary/[0.12] text-primary-light border border-primary/20"
                : "bg-card border border-card-border text-foreground-tertiary hover:text-foreground hover:border-card-border-hover"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {data.trendData.length === 0 ? (
        <div className="card p-10 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-transparent pointer-events-none" />
          <div className="relative">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-card-elevated flex items-center justify-center mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-foreground-tertiary">
                <path d="M23 6l-9.5 9.5-5-5L1 18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M17 6h6v6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-foreground">No trend data yet</h2>
            <p className="text-[13px] text-foreground-tertiary mt-2">
              Complete a few <code className="text-primary-light font-mono text-[11px] bg-primary-glow px-1.5 py-0.5 rounded">/mentor</code> sessions to see your growth charts.
            </p>
          </div>
        </div>
      ) : (
        <div className="card p-6">
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data.trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f2e" strokeOpacity={0.6} />
              <XAxis
                dataKey="date"
                tick={{ fill: "#6b6b7b", fontSize: 11 }}
                tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                axisLine={{ stroke: "#1f1f2e" }}
                tickLine={{ stroke: "#1f1f2e" }}
              />
              <YAxis
                domain={[0, 5]}
                tick={{ fill: "#6b6b7b", fontSize: 11 }}
                axisLine={{ stroke: "#1f1f2e" }}
                tickLine={{ stroke: "#1f1f2e" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#12121a",
                  border: "1px solid #1f1f2e",
                  borderRadius: "12px",
                  color: "#f0f0f5",
                  fontSize: "12px",
                  boxShadow: "0 8px 16px 0 rgba(0,0,0,0.4)",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              {areas.map((area, i) => (
                <Line
                  key={area}
                  type="monotone"
                  dataKey={area}
                  name={AREA_LABELS[area as GrowthArea] || area}
                  stroke={AREA_COLORS[i % AREA_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
