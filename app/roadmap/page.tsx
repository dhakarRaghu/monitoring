"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

interface PhaseOutline {
  phase: number;
  title: string;
  subtitle?: string;
  description: string;
  lessons?: { id: string; title: string; description: string }[];
  keyConcepts?: string[];
  objectives?: string[];
  mindtickleAnchor?: string;
  estimatedSessions: number;
}

interface CourseConfig {
  source?: string;
  version?: string;
  order?: number;
  macroPhase?: 1 | 2 | 3 | 4 | 5 | 6;
  prerequisites?: string[];
  whyItMatters?: string;
  outcomes?: string[];
}

interface Course {
  id: string;
  topic: string;
  title: string;
  totalPhases: number;
  currentPhase: number;
  status: string;
  outline: PhaseOutline[];
  config?: CourseConfig | null;
}

// The 6 macro-phases of the Principal Engineer roadmap.
// Mirrors the seed file (`scripts/seed-learning-plan.ts`).
const MACRO_PHASES = [
  { phase: 1, title: "Foundations", months: "M1-3", description: "Go, networking, SQL/MySQL, security, observability. The non-negotiable ground floor." },
  { phase: 2, title: "Service Mastery", months: "M4-6", description: "Kafka, Redis, DynamoDB, Kubernetes. Own a service end-to-end to a 99.9% SLO." },
  { phase: 3, title: "Cross-System Thinking", months: "M7-9", description: "Lambda + Step Functions, storage systems, GraphQL/Relay. Multi-service reasoning." },
  { phase: 4, title: "AI Platform Mastery", months: "M10-12", description: "RAG, agents, MCP, evals, multi-tenant AI. Plus Mindtickle's internal AI/platform map." },
  { phase: 5, title: "Staff Craft", months: "M13-18", description: "Distributed systems theory + system design at scale. The Senior+ unlock." },
  { phase: 6, title: "Principal Craft", months: "M19-24", description: "Strategy, written communication, mentorship, public portfolio. Influence > authority." },
] as const;

// Per-track colors for visual differentiation.
const TRACK_COLORS: Record<string, string> = {
  "go-mastery": "from-cyan-500/20 to-cyan-600/5 border-cyan-500/30",
  "networking": "from-teal-500/20 to-teal-600/5 border-teal-500/30",
  "sql-mysql": "from-emerald-500/20 to-emerald-600/5 border-emerald-500/30",
  "docker-containers": "from-blue-400/20 to-blue-500/5 border-blue-400/30",
  "security": "from-rose-500/20 to-rose-600/5 border-rose-500/30",
  "observability": "from-green-500/20 to-green-600/5 border-green-500/30",
  "kafka": "from-orange-500/20 to-orange-600/5 border-orange-500/30",
  "redis": "from-red-500/20 to-red-600/5 border-red-500/30",
  "dynamodb": "from-yellow-500/20 to-yellow-600/5 border-yellow-500/30",
  "kubernetes": "from-blue-500/20 to-blue-600/5 border-blue-500/30",
  "aws-services-deep": "from-orange-300/20 to-orange-400/5 border-orange-300/30",
  "service-mesh": "from-cyan-400/20 to-cyan-500/5 border-cyan-400/30",
  "caching-strategies": "from-red-300/20 to-red-400/5 border-red-300/30",
  "queues-async-patterns": "from-orange-300/20 to-orange-400/5 border-orange-300/30",
  "lambda-stepfunctions": "from-purple-500/20 to-purple-600/5 border-purple-500/30",
  "storage-systems": "from-amber-500/20 to-amber-600/5 border-amber-500/30",
  "graphql-relay": "from-fuchsia-500/20 to-fuchsia-600/5 border-fuchsia-500/30",
  "api-design": "from-slate-400/20 to-slate-500/5 border-slate-400/30",
  "iac-terraform": "from-purple-400/20 to-purple-500/5 border-purple-400/30",
  "ci-cd-gitops": "from-orange-400/20 to-orange-500/5 border-orange-400/30",
  "auth-identity-saas": "from-rose-400/20 to-rose-500/5 border-rose-400/30",
  "api-gateway-edge": "from-yellow-400/20 to-yellow-500/5 border-yellow-400/30",
  "realtime-systems": "from-pink-400/20 to-pink-500/5 border-pink-400/30",
  "ai-agentic": "from-pink-500/20 to-pink-600/5 border-pink-500/30",
  "mindtickle-internals": "from-lime-500/20 to-lime-600/5 border-lime-500/30",
  "distributed-systems-theory": "from-sky-500/20 to-sky-600/5 border-sky-500/30",
  "system-design": "from-indigo-500/20 to-indigo-600/5 border-indigo-500/30",
  "multi-tenancy-patterns": "from-emerald-400/20 to-emerald-500/5 border-emerald-400/30",
  "performance-engineering": "from-red-400/20 to-red-500/5 border-red-400/30",
  "staff-principal-skills": "from-violet-500/20 to-violet-600/5 border-violet-500/30",
};

function trackOrder(c: Course): number {
  return c.config?.order ?? 999;
}

function trackMacroPhase(c: Course): number {
  return c.config?.macroPhase ?? 99;
}

export default function RoadmapPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/courses")
      .then((r) => r.json())
      .then((data: Course[]) => {
        // Sort by order (which orders within macro-phase since order is global).
        const sorted = [...data].sort((a, b) => trackOrder(a) - trackOrder(b));
        setCourses(sorted);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Aggregate stats.
  const { totalPhases, completedPhases, overallProgress } = useMemo(() => {
    const total = courses.reduce((s, c) => s + c.totalPhases, 0);
    const done = courses.reduce((s, c) => s + c.currentPhase, 0);
    return {
      totalPhases: total,
      completedPhases: done,
      overallProgress: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  }, [courses]);

  // Group courses by macroPhase.
  const coursesByMacroPhase = useMemo(() => {
    const map = new Map<number, Course[]>();
    for (const course of courses) {
      const mp = trackMacroPhase(course);
      if (!map.has(mp)) map.set(mp, []);
      map.get(mp)!.push(course);
    }
    return map;
  }, [courses]);

  // First incomplete course in the lowest macro-phase = the recommended next.
  const recommendedNext = useMemo(() => {
    for (const course of courses) {
      if (course.currentPhase < course.totalPhases) return course;
    }
    return null;
  }, [courses]);

  // Build a topic → title map for prerequisite lookups.
  const titleByTopic = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of courses) map.set(c.topic, c.title);
    return map;
  }, [courses]);

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight page-section-header">
          Principal Engineer Roadmap
        </h1>
        <p className="text-[13px] text-foreground-tertiary mt-1">
          A 24-month path from Intern → Principal across {courses.length || 30} tracks, structured by 6 macro-phases.
        </p>
      </div>

      {/* What this page is — read this first */}
      <div className="card p-5 border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <h2 className="text-[13px] font-semibold text-foreground mb-2">What you're looking at</h2>
        <ul className="text-[12px] text-foreground-secondary space-y-1.5 leading-relaxed list-disc list-inside marker:text-foreground-tertiary">
          <li>
            <span className="text-foreground">30 learning tracks</span> (Go, Kafka, K8s, Docker, AWS deep, Service Mesh, Caching, Queues, Auth/SSO, API Gateways, Real-time, IaC, AI/Agentic, …) grouped into <span className="text-foreground">6 macro-phases</span> (Foundations → Principal Craft) spanning ~24 months.
          </li>
          <li>
            Each track is broken into <span className="text-foreground">phases</span> (5-8 each). Each phase is a discrete lesson with concepts, exercises, and a real Mindtickle code anchor.
          </li>
          <li>
            <span className="text-foreground">Recommended Next</span> below picks the lowest-order track that isn't complete. Click its <code className="font-mono text-primary-light bg-primary-glow px-1 py-0.5 rounded">/study</code> button to start.
          </li>
          <li>
            Running <code className="font-mono text-primary-light bg-primary-glow px-1 py-0.5 rounded">/study &lt;topic&gt;</code> in Claude Code (from the <span className="font-mono">verly</span> repo) expands the seed skeleton into the full production-grade content for the next phase, on demand.
          </li>
          <li>
            Tracks have <span className="text-foreground">prerequisites</span> (shown as chips). Do them in <span className="font-mono">order</span> (#01 first) — the chain is the point.
          </li>
        </ul>
      </div>

      {/* Overall progress */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[13px] font-medium text-foreground">Overall Progress</span>
          <span className="text-[13px] font-mono text-foreground-tertiary">
            {completedPhases}/{totalPhases} phases
          </span>
        </div>
        <div className="w-full h-2.5 bg-background-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full transition-all duration-700"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-[11px] text-foreground-tertiary">{overallProgress}% complete</span>
          <span className="text-[11px] text-foreground-tertiary">
            ~{Math.round((totalPhases - completedPhases) * 1.5)} hours of focused work remaining
          </span>
        </div>
      </div>

      {/* Recommended next */}
      {recommendedNext && (
        <div className="card p-5 border border-primary/30 bg-gradient-to-br from-primary/10 to-transparent">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-primary-light">
              Recommended Next
            </span>
            <span className="text-[10px] font-mono text-foreground-tertiary">
              order #{recommendedNext.config?.order ?? "?"}
            </span>
          </div>
          <h3 className="text-[15px] font-semibold text-foreground mb-1">
            {recommendedNext.title}
          </h3>
          {recommendedNext.config?.whyItMatters && (
            <p className="text-[12px] text-foreground-secondary leading-relaxed mb-3">
              {recommendedNext.config.whyItMatters}
            </p>
          )}
          <div className="flex items-center gap-2">
            <Link
              href={`/study?category=${recommendedNext.topic}`}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-white text-[12px] font-medium hover:bg-primary-light transition-colors"
            >
              Start phase {recommendedNext.currentPhase}
            </Link>
            <code className="text-[11px] font-mono text-primary-light bg-primary-glow px-2 py-1 rounded">
              /study {recommendedNext.topic}
            </code>
          </div>
        </div>
      )}

      {/* The 6 macro-phases timeline */}
      <div>
        <h2 className="text-[14px] font-semibold text-foreground mb-4">The 6 Macro-Phases</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {MACRO_PHASES.map((phase) => {
            const tracksInPhase = coursesByMacroPhase.get(phase.phase) || [];
            return (
              <div key={phase.phase} className="card p-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary/60 to-primary/10 rounded-l" />
                <div className="pl-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono text-primary-light bg-primary-glow px-1.5 py-0.5 rounded">
                      {phase.months}
                    </span>
                    <span className="text-[10px] text-foreground-tertiary">
                      Phase {phase.phase} · {tracksInPhase.length} tracks
                    </span>
                  </div>
                  <h3 className="text-[13px] font-semibold text-foreground">{phase.title}</h3>
                  <p className="text-[11px] text-foreground-tertiary mt-1 leading-relaxed">
                    {phase.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Loading state */}
      {loading && courses.length === 0 && (
        <div className="card p-8 text-center">
          <p className="text-[13px] text-foreground-tertiary">Loading roadmap…</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && courses.length === 0 && (
        <div className="card p-8 text-center">
          <h2 className="text-lg font-semibold text-foreground mb-2">No courses loaded yet</h2>
          <p className="text-[13px] text-foreground-tertiary mb-4">
            Run the seed script to load the Principal Engineer learning plan:
          </p>
          <code className="text-primary-light font-mono text-[12px] bg-primary-glow px-3 py-1.5 rounded-lg">
            npx tsx scripts/seed-learning-plan.ts
          </code>
        </div>
      )}

      {/* Tracks grouped by macro-phase — each track shows its full phase list */}
      {MACRO_PHASES.map((macroPhase) => {
        const tracksInPhase = (coursesByMacroPhase.get(macroPhase.phase) || []).sort(
          (a, b) => trackOrder(a) - trackOrder(b)
        );
        if (tracksInPhase.length === 0) return null;

        return (
          <div key={macroPhase.phase}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[10px] font-mono text-primary-light bg-primary-glow px-2 py-1 rounded">
                {macroPhase.months}
              </span>
              <h2 className="text-[14px] font-semibold text-foreground">
                Phase {macroPhase.phase} · {macroPhase.title}
              </h2>
              <span className="text-[11px] text-foreground-tertiary">
                {tracksInPhase.length} tracks
              </span>
            </div>
            <div className="space-y-3">
              {tracksInPhase.map((course) => {
                const progress =
                  course.totalPhases > 0
                    ? Math.round((course.currentPhase / course.totalPhases) * 100)
                    : 0;
                const colorClass =
                  TRACK_COLORS[course.topic] ||
                  "from-gray-500/20 to-gray-600/5 border-gray-500/30";
                const prereqs = course.config?.prerequisites || [];
                const order = course.config?.order;
                const totalHours = (course.outline || []).reduce(
                  (s, p) => s + (p.estimatedSessions || 0),
                  0
                );

                return (
                  <div
                    key={course.id}
                    className="card p-4 relative overflow-hidden"
                  >
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${colorClass} opacity-20 rounded-xl pointer-events-none`}
                    />
                    <div className="relative">
                      {/* Track header */}
                      <div className="flex items-start justify-between mb-2 gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            {order !== undefined && (
                              <span className="text-[10px] font-mono text-foreground-tertiary bg-card-elevated px-1.5 py-0.5 rounded">
                                #{String(order).padStart(2, "0")}
                              </span>
                            )}
                            <span className="text-[10px] font-mono text-foreground-tertiary">
                              {course.currentPhase}/{course.totalPhases} phases · ~{totalHours}h
                            </span>
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded font-medium uppercase ${
                                course.status === "completed"
                                  ? "bg-success/10 text-success"
                                  : course.currentPhase > 0
                                  ? "bg-warning/10 text-warning"
                                  : "bg-card-elevated text-foreground-tertiary"
                              }`}
                            >
                              {course.currentPhase > 0
                                ? course.status.replace("_", " ")
                                : "not started"}
                            </span>
                          </div>
                          <Link
                            href={`/study?category=${course.topic}`}
                            className="text-[14px] font-semibold text-foreground hover:text-primary-light transition-colors"
                          >
                            {course.title}
                          </Link>
                          {course.config?.whyItMatters && (
                            <p className="text-[11px] text-foreground-tertiary mt-1 leading-relaxed">
                              {course.config.whyItMatters}
                            </p>
                          )}
                        </div>
                        <code className="text-[10px] font-mono text-primary-light bg-primary-glow px-2 py-1 rounded shrink-0 self-start">
                          /study {course.topic}
                        </code>
                      </div>

                      {/* Prerequisites */}
                      {prereqs.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3 items-center">
                          <span className="text-[9px] uppercase tracking-wider text-foreground-tertiary">
                            requires:
                          </span>
                          {prereqs.map((p) => (
                            <span
                              key={p}
                              className="text-[9px] font-mono text-foreground-tertiary bg-card-elevated px-1.5 py-0.5 rounded"
                              title={titleByTopic.get(p) || p}
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Progress bar */}
                      <div className="w-full h-1 bg-background-secondary rounded-full overflow-hidden mb-3">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>

                      {/* Phase list — the actual plan */}
                      <div className="space-y-1 pt-2 border-t border-card-border/40">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[9px] uppercase tracking-wider text-foreground-tertiary">
                            What you'll study
                          </span>
                          <span className="text-[9px] text-foreground-tertiary">
                            run /study to generate each phase on demand
                          </span>
                        </div>
                        {(course.outline || []).map((phase) => {
                          const isDone = phase.phase < course.currentPhase;
                          const isCurrent = phase.phase === course.currentPhase;
                          const isUpcoming = phase.phase > course.currentPhase;

                          return (
                            <div
                              key={phase.phase}
                              className={`flex items-start gap-2 py-1.5 px-2 rounded ${
                                isCurrent
                                  ? "bg-primary/10 border border-primary/20"
                                  : "hover:bg-card-elevated/50"
                              }`}
                            >
                              {/* Phase indicator */}
                              <span
                                className={`text-[9px] font-mono shrink-0 mt-0.5 px-1.5 py-0.5 rounded ${
                                  isDone
                                    ? "bg-success/15 text-success"
                                    : isCurrent
                                    ? "bg-primary/20 text-primary-light"
                                    : "bg-card-elevated text-foreground-tertiary"
                                }`}
                              >
                                {isDone ? "✓" : `P${phase.phase}`}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline justify-between gap-2">
                                  <span
                                    className={`text-[12px] font-medium ${
                                      isCurrent
                                        ? "text-primary-light"
                                        : isDone
                                        ? "text-foreground-tertiary line-through"
                                        : "text-foreground"
                                    }`}
                                  >
                                    {phase.title}
                                  </span>
                                  <span className="text-[10px] font-mono text-foreground-tertiary shrink-0">
                                    ~{phase.estimatedSessions}h
                                  </span>
                                </div>
                                <p
                                  className={`text-[11px] mt-0.5 leading-relaxed ${
                                    isDone
                                      ? "text-foreground-tertiary/60 line-through"
                                      : "text-foreground-tertiary"
                                  }`}
                                >
                                  {phase.description}
                                </p>
                                {isCurrent && (
                                  <div className="mt-1.5 flex items-center gap-2">
                                    <span className="text-[10px] text-primary-light">
                                      → next up
                                    </span>
                                    <code className="text-[10px] font-mono text-primary-light bg-primary-glow px-1.5 py-0.5 rounded">
                                      /study {course.topic}
                                    </code>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* How to use this roadmap */}
      <div className="card p-5">
        <h2 className="text-[14px] font-semibold text-foreground mb-3">How to use this roadmap</h2>
        <ol className="text-[12px] text-foreground-secondary space-y-2 leading-relaxed list-decimal list-inside">
          <li>
            Work through tracks in <span className="font-mono">order</span> (#01 first). Within a track, do phases in order — earlier phases set up later ones.
          </li>
          <li>
            Click any track card to go to its study page, or run{" "}
            <code className="text-primary-light font-mono bg-primary-glow px-1.5 py-0.5 rounded">/study &lt;topic&gt;</code>{" "}
            to generate the deep production-grade content for the next phase on demand.
          </li>
          <li>
            Mark a phase complete when you've done the exercises and can answer the checkpoint questions in your own words.
          </li>
          <li>
            Re-seed any time —{" "}
            <code className="text-primary-light font-mono bg-primary-glow px-1.5 py-0.5 rounded">npx tsx scripts/seed-learning-plan.ts</code>{" "}
            is idempotent.
          </li>
        </ol>
      </div>
    </div>
  );
}
