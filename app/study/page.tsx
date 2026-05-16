"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface StudyMaterial {
  id: string;
  slug: string;
  title: string;
  category: string | null;
  difficulty: string | null;
  estimatedMinutes: number | null;
  tags: string[] | null;
  summary: string | null;
  source: string | null;
  status: string | null;
  progress: number | null;
  createdAt: string;
  completedAt: string | null;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "bg-success-bg text-success",
  intermediate: "bg-warning-bg text-warning",
  advanced: "bg-danger-bg text-danger",
};

function getTopicFromSlug(slug: string): string {
  const parts = slug.split("-phase-");
  if (parts.length > 1) return parts[0];
  const match = slug.match(/^([a-z]+(?:-[a-z]+)?)/);
  return match ? match[1] : "other";
}

function getTopicDisplayName(topic: string): string {
  return topic.charAt(0).toUpperCase() + topic.slice(1).replace(/-/g, " ");
}

export default function StudyPage() {
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    const params = new URLSearchParams({ excludeSource: "mentor" });
    if (filter !== "all") params.set("status", filter);
    fetch(`/api/study?${params}`)
      .then((r) => r.json())
      .then(setMaterials);
  }, [filter]);

  // Group by topic
  const grouped: Record<string, StudyMaterial[]> = {};
  for (const m of materials) {
    const topic = getTopicFromSlug(m.slug);
    if (!grouped[topic]) grouped[topic] = [];
    grouped[topic].push(m);
  }

  // Sort phases within each topic
  for (const topic of Object.keys(grouped)) {
    grouped[topic].sort((a, b) => {
      const phaseA = a.slug.match(/phase-(\d+)/)?.[1];
      const phaseB = b.slug.match(/phase-(\d+)/)?.[1];
      if (phaseA && phaseB) return parseInt(phaseA) - parseInt(phaseB);
      return a.createdAt.localeCompare(b.createdAt);
    });
  }

  const totalMaterials = materials.length;
  const completedCount = materials.filter((m) => m.status === "completed").length;
  const inProgressCount = materials.filter((m) => m.status === "in_progress").length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            Study Materials
          </h1>
          <p className="text-sm text-foreground-tertiary mt-1">
            {totalMaterials} materials · {completedCount} completed · {inProgressCount} in progress
          </p>
        </div>
        <div className="flex gap-2">
          {["all", "unread", "in_progress", "completed"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all duration-150 ${
                filter === f
                  ? "bg-primary text-white shadow-sm"
                  : "bg-card border border-card-border text-foreground-secondary hover:text-foreground hover:border-card-border-hover"
              }`}
            >
              {f === "in_progress"
                ? "In Progress"
                : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {materials.length === 0 ? (
        <div className="card p-10 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-info-bg via-transparent to-primary-glow pointer-events-none" />
          <div className="relative">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-info-bg flex items-center justify-center mb-4">
              <span className="text-3xl">📖</span>
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              No study materials yet
            </h2>
            <p className="text-sm text-foreground-secondary mt-2 max-w-md mx-auto leading-relaxed">
              Use{" "}
              <code className="text-primary-light bg-primary-glow px-1.5 py-0.5 rounded text-xs font-medium">
                /study kafka
              </code>{" "}
              to generate a full deep-dive course on any topic.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([topic, items]) => (
            <TopicGroup key={topic} topic={topic} materials={items} />
          ))}
        </div>
      )}
    </div>
  );
}

function TopicGroup({
  topic,
  materials,
}: {
  topic: string;
  materials: StudyMaterial[];
}) {
  const completedCount = materials.filter((m) => m.status === "completed").length;
  const totalMinutes = materials.reduce((sum, m) => sum + (m.estimatedMinutes || 0), 0);
  const overallProgress = materials.length > 0
    ? Math.round(
        materials.reduce((sum, m) => {
          if (m.status === "completed") return sum + 100;
          return sum + (m.progress || 0);
        }, 0) / materials.length
      )
    : 0;

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-glow-strong flex items-center justify-center">
            <span className="text-lg">📂</span>
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {getTopicDisplayName(topic)}
            </h2>
            <p className="text-xs text-foreground-tertiary">
              {materials.length} phases · ~{totalMinutes} min total · {completedCount}/{materials.length} done
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-24 h-2 bg-background-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full transition-all duration-500"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <span className="text-xs text-foreground-tertiary font-medium">
            {overallProgress}%
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {materials.map((material, index) => (
          <Link
            key={material.id}
            href={`/study/${material.slug}`}
            className="flex items-center gap-4 px-4 py-3 rounded-lg border border-card-border hover:border-primary/30 hover:bg-card-elevated transition-all duration-150 group"
          >
            <div className="w-7 h-7 rounded-lg bg-card-elevated flex items-center justify-center text-xs font-bold text-foreground-tertiary group-hover:bg-primary-glow group-hover:text-primary-light transition-colors">
              {index}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-foreground group-hover:text-primary-light transition-colors truncate">
                  {material.title}
                </h3>
                {material.difficulty && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
                      DIFFICULTY_COLORS[material.difficulty] || "bg-card-elevated text-foreground-tertiary"
                    }`}
                  >
                    {material.difficulty}
                  </span>
                )}
              </div>
              {material.summary && (
                <p className="text-xs text-foreground-tertiary mt-0.5 truncate">
                  {material.summary}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {material.estimatedMinutes && (
                <span className="text-[10px] text-foreground-tertiary">
                  ~{material.estimatedMinutes}m
                </span>
              )}
              <span
                className={`w-2 h-2 rounded-full ${
                  material.status === "completed"
                    ? "bg-success"
                    : material.status === "in_progress"
                    ? "bg-warning"
                    : "bg-card-border"
                }`}
              />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
