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
  beginner: "bg-success/10 text-success border-success/20",
  intermediate: "bg-warning/10 text-warning border-warning/20",
  advanced: "bg-danger/10 text-danger border-danger/20",
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

  const grouped: Record<string, StudyMaterial[]> = {};
  for (const m of materials) {
    const topic = getTopicFromSlug(m.slug);
    if (!grouped[topic]) grouped[topic] = [];
    grouped[topic].push(m);
  }

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
          <h1 className="text-2xl font-semibold text-foreground tracking-tight page-section-header">
            Study Materials
          </h1>
          <p className="text-[13px] text-foreground-tertiary mt-1">
            <span className="font-mono">{totalMaterials}</span> materials
            <span className="mx-1.5 text-card-border-hover">/</span>
            <span className="font-mono">{completedCount}</span> completed
            <span className="mx-1.5 text-card-border-hover">/</span>
            <span className="font-mono">{inProgressCount}</span> in progress
          </p>
        </div>
        <div className="flex gap-1.5 bg-card-elevated rounded-xl p-1 border border-card-border">
          {["all", "unread", "in_progress", "completed"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-[11px] font-medium rounded-lg transition-all duration-150 ${
                filter === f
                  ? "bg-primary text-white shadow-sm shadow-primary/20"
                  : "text-foreground-tertiary hover:text-foreground"
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
          <div className="absolute inset-0 bg-gradient-to-br from-info/[0.03] via-transparent to-primary/[0.02] pointer-events-none" />
          <div className="relative">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-card-elevated flex items-center justify-center mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-foreground-tertiary">
                <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2V3zM22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7V3z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              No study materials yet
            </h2>
            <p className="text-[13px] text-foreground-tertiary mt-2 max-w-md mx-auto leading-relaxed">
              Use{" "}
              <code className="text-primary-light font-mono text-[11px] bg-primary-glow px-1.5 py-0.5 rounded">
                /study kafka
              </code>{" "}
              to generate a full deep-dive course on any topic.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-primary-light">
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2v11z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <h2 className="text-[14px] font-semibold text-foreground tracking-tight">
              {getTopicDisplayName(topic)}
            </h2>
            <p className="text-[11px] text-foreground-tertiary mt-0.5 font-mono">
              {materials.length} phases · ~{totalMinutes}m · {completedCount}/{materials.length} done
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-24 h-1.5 bg-background-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full transition-all duration-700"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <span className="text-[11px] text-foreground-tertiary font-mono font-medium min-w-[32px] text-right">
            {overallProgress}%
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        {materials.map((material, index) => (
          <Link
            key={material.id}
            href={`/study/${material.slug}`}
            className="flex items-center gap-4 px-4 py-3 rounded-xl border border-card-border hover:border-primary/20 hover:bg-card-elevated/50 transition-all duration-150 group"
          >
            <div className="w-7 h-7 rounded-lg bg-card-elevated flex items-center justify-center text-[11px] font-bold text-foreground-tertiary group-hover:bg-primary-glow group-hover:text-primary-light transition-all font-mono">
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-[13px] font-medium text-foreground group-hover:text-primary-light transition-colors truncate">
                  {material.title}
                </h3>
                {material.difficulty && (
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded-md font-medium uppercase tracking-wider shrink-0 border ${
                      DIFFICULTY_COLORS[material.difficulty] || "bg-card-elevated text-foreground-tertiary border-card-border"
                    }`}
                  >
                    {material.difficulty}
                  </span>
                )}
              </div>
              {material.summary && (
                <p className="text-[11px] text-foreground-tertiary mt-0.5 truncate">
                  {material.summary}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {material.estimatedMinutes && (
                <span className="text-[10px] text-foreground-tertiary font-mono">
                  ~{material.estimatedMinutes}m
                </span>
              )}
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  material.status === "completed"
                    ? "bg-success"
                    : material.status === "in_progress"
                    ? "bg-warning"
                    : "bg-card-border-hover"
                }`}
              />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
