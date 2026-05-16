"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface LearningItem {
  id: string;
  topic: string;
  reason: string | null;
  priority: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
}

export default function LearnPage() {
  const [items, setItems] = useState<LearningItem[]>([]);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    const url = filter === "all" ? "/api/learn" : `/api/learn?status=${filter}`;
    fetch(url)
      .then((r) => r.json())
      .then(setItems);
  }, [filter]);

  async function updateStatus(id: string, status: string) {
    await fetch("/api/learn", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status, completedAt: status === "completed" ? new Date().toISOString() : null }
          : item
      )
    );
  }

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const sorted = [...items].sort(
    (a, b) =>
      (priorityOrder[a.priority as keyof typeof priorityOrder] || 1) -
      (priorityOrder[b.priority as keyof typeof priorityOrder] || 1)
  );

  const pending = sorted.filter((i) => i.status === "pending");
  const inProgress = sorted.filter((i) => i.status === "in_progress");
  const completed = sorted.filter((i) => i.status === "completed");

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight page-section-header">Learning Queue</h1>
          <p className="text-[13px] text-foreground-tertiary mt-1">
            Topics to study deeper, identified during sessions
          </p>
        </div>
        <div className="segmented-control">
          {["all", "pending", "in_progress", "completed"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`segmented-option ${
                filter === f
                  ? "segmented-option-active"
                  : ""
              }`}
            >
              {f === "in_progress" ? "In Progress" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="card p-10 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.03] via-transparent to-primary/[0.02] pointer-events-none" />
          <div className="relative">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-card-elevated flex items-center justify-center mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-foreground-tertiary">
                <path d="M4 19.5A2.5 2.5 0 016.5 17H20" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 7h8M8 11h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              Learning queue is empty
            </h2>
            <p className="text-[13px] text-foreground-tertiary mt-2 max-w-sm mx-auto">
              When <code className="text-primary-light font-mono text-[11px] bg-primary-glow px-1.5 py-0.5 rounded">/mentor</code> identifies things you should study deeper, they will appear here.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {inProgress.length > 0 && (
            <Section title="In Progress" items={inProgress} onUpdate={updateStatus} />
          )}
          {pending.length > 0 && (
            <Section title="Pending" items={pending} onUpdate={updateStatus} />
          )}
          {completed.length > 0 && (
            <Section title="Completed" items={completed} onUpdate={updateStatus} />
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  items,
  onUpdate,
}: {
  title: string;
  items: LearningItem[];
  onUpdate: (id: string, status: string) => void;
}) {
  function getStudySlug(topic: string) {
    return topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  return (
    <div>
      <h2 className="text-[11px] font-semibold text-foreground-tertiary uppercase tracking-widest mb-3">
        {title} <span className="text-foreground-tertiary/60">({items.length})</span>
      </h2>
      <div className="space-y-2">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/learn/${getStudySlug(item.topic)}`}
            className="card-interactive p-4 flex items-center justify-between block"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5">
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-md font-medium uppercase tracking-wider ${
                    item.priority === "high"
                      ? "bg-danger/10 text-danger border border-danger/20"
                      : item.priority === "medium"
                      ? "bg-warning/10 text-warning border border-warning/20"
                      : "bg-card-elevated text-foreground-tertiary border border-card-border"
                  }`}
                >
                  {item.priority}
                </span>
                <h3 className="text-[13px] font-medium text-foreground truncate">
                  {item.topic}
                </h3>
              </div>
              {item.reason && (
                <p className="text-[11px] text-foreground-tertiary mt-1.5 ml-[calc(2rem+10px)]">{item.reason}</p>
              )}
            </div>
            <div className="flex gap-2 ml-4" onClick={(e) => e.preventDefault()}>
              {item.status === "pending" && (
                <button
                  onClick={(e) => { e.stopPropagation(); onUpdate(item.id, "in_progress"); }}
                  className="btn btn-primary !px-3.5 !py-1.5 !text-[11px]"
                >
                  Start
                </button>
              )}
              {item.status === "in_progress" && (
                <button
                  onClick={(e) => { e.stopPropagation(); onUpdate(item.id, "completed"); }}
                  className="text-[11px] px-3.5 py-1.5 rounded-lg bg-success/[0.1] text-success border border-success/20 hover:bg-success/[0.16] hover:border-success/35 transition-all font-semibold"
                >
                  Done
                </button>
              )}
              {item.status === "completed" && (
                <span className="text-[11px] px-3.5 py-1.5 rounded-lg bg-success/[0.08] text-success border border-success/15 font-medium flex items-center gap-1.5">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="text-success">
                    <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Done
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
