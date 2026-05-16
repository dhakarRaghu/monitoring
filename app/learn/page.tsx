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
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Learning Queue</h1>
          <p className="text-muted text-sm mt-1">
            Topics to study deeper, identified during sessions
          </p>
        </div>
        <div className="flex gap-2">
          {["all", "pending", "in_progress", "completed"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                filter === f
                  ? "bg-accent text-white"
                  : "bg-card border border-card-border text-muted hover:text-foreground"
              }`}
            >
              {f === "in_progress" ? "In Progress" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="bg-card border border-card-border rounded-xl p-8 text-center">
          <p className="text-4xl mb-3">📚</p>
          <h2 className="text-lg font-medium text-foreground">
            Learning queue is empty
          </h2>
          <p className="text-muted text-sm mt-2">
            When /mentor identifies things you should study deeper, they will appear here.
          </p>
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
      <h2 className="text-sm font-medium text-muted mb-3">{title} ({items.length})</h2>
      <div className="space-y-2">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/learn/${getStudySlug(item.topic)}`}
            className="bg-card border border-card-border rounded-xl p-4 flex items-center justify-between hover:border-primary/30 hover:bg-card-elevated transition-all cursor-pointer block"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    item.priority === "high"
                      ? "bg-danger/20 text-danger"
                      : item.priority === "medium"
                      ? "bg-warning/20 text-warning"
                      : "bg-muted/20 text-muted"
                  }`}
                >
                  {item.priority}
                </span>
                <h3 className="text-sm font-medium text-foreground truncate">
                  {item.topic}
                </h3>
              </div>
              {item.reason && (
                <p className="text-xs text-muted mt-1">{item.reason}</p>
              )}
            </div>
            <div className="flex gap-2 ml-4" onClick={(e) => e.preventDefault()}>
              {item.status === "pending" && (
                <button
                  onClick={(e) => { e.stopPropagation(); onUpdate(item.id, "in_progress"); }}
                  className="text-xs px-3 py-1 rounded-lg bg-accent/10 text-accent-light hover:bg-accent/20"
                >
                  Start
                </button>
              )}
              {item.status === "in_progress" && (
                <button
                  onClick={(e) => { e.stopPropagation(); onUpdate(item.id, "completed"); }}
                  className="text-xs px-3 py-1 rounded-lg bg-success/10 text-success hover:bg-success/20"
                >
                  Done
                </button>
              )}
              {item.status === "completed" && (
                <span className="text-xs px-3 py-1 rounded-lg bg-success/10 text-success">
                  Review ✓
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
