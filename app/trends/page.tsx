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
  "#6366f1", "#818cf8", "#a5b4fc", "#c7d2fe",
  "#22c55e", "#4ade80", "#86efac",
  "#eab308", "#facc15", "#fde047",
  "#ec4899", "#f472b6", "#f9a8d4",
  "#ef4444", "#f87171", "#fca5a5",
  "#06b6d4", "#67e8f9",
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
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Trends</h1>
          <p className="text-muted text-sm mt-1">Track your progress over time</p>
        </div>
        <div className="flex gap-2">
          {(["7", "30", "90", "all"] as TimeRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                range === r
                  ? "bg-accent text-white"
                  : "bg-card border border-card-border text-muted hover:text-foreground"
              }`}
            >
              {r === "all" ? "All" : `${r}d`}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedCategory("all")}
          className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
            selectedCategory === "all"
              ? "bg-accent text-white"
              : "bg-card border border-card-border text-muted hover:text-foreground"
          }`}
        >
          All Areas
        </button>
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSelectedCategory(key)}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              selectedCategory === key
                ? "bg-accent text-white"
                : "bg-card border border-card-border text-muted hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {data.trendData.length === 0 ? (
        <div className="bg-card border border-card-border rounded-xl p-8 text-center">
          <p className="text-4xl mb-3">📈</p>
          <h2 className="text-lg font-medium text-foreground">No trend data yet</h2>
          <p className="text-muted text-sm mt-2">
            Complete a few /mentor sessions to see your growth charts.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-card-border rounded-xl p-5">
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data.trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#71717a", fontSize: 11 }}
                tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              />
              <YAxis
                domain={[0, 5]}
                tick={{ fill: "#71717a", fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#141419",
                  border: "1px solid #27272a",
                  borderRadius: "8px",
                  color: "#e4e4e7",
                }}
              />
              <Legend />
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
