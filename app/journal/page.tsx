"use client";

import { useEffect, useState } from "react";

interface JournalEntry {
  id: string;
  date: string;
  entry: string;
  mood: string | null;
  energyLevel: number | null;
  challenges: string | null;
  wins: string | null;
  aiGuidance: string | null;
  aiSuggestions: unknown;
  createdAt: string;
}

const MOODS = ["😤 frustrated", "😐 neutral", "🙂 good", "🔥 great", "😓 tired"];

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [entry, setEntry] = useState("");
  const [challenges, setChallenges] = useState("");
  const [wins, setWins] = useState("");
  const [mood, setMood] = useState("");
  const [energy, setEnergy] = useState(3);
  const [saving, setSaving] = useState(false);
  const [todaySaved, setTodaySaved] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    fetch("/api/journal")
      .then((r) => r.json())
      .then(setEntries);
  }, [todaySaved]);

  const today = new Date().toISOString().split("T")[0];
  const todayEntry = entries.find((e) => e.date === today);

  async function save() {
    if (!entry.trim()) return;
    setSaving(true);

    await fetch("/api/journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: today,
        entry: entry.trim(),
        mood: mood || null,
        energyLevel: energy,
        challenges: challenges.trim() || null,
        wins: wins.trim() || null,
      }),
    });

    setTodaySaved(true);
    setEditing(false);
    setSaving(false);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight page-section-header">
          Daily Journal
        </h1>
        <p className="text-[13px] text-foreground-tertiary mt-1">
          Write your daily reflection. Claude uses this for better guidance.
        </p>
      </div>

      {(!todayEntry && !todaySaved) || editing ? (
        <div className="card p-6 space-y-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-transparent pointer-events-none" />
          <div className="relative space-y-5">
            <h2 className="text-[11px] font-semibold text-foreground-tertiary uppercase tracking-widest">
              {editing ? "Edit" : "Today"} — {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </h2>

            <div>
              <label className="text-[12px] text-foreground-secondary font-medium block mb-2">
                What happened today? How did you work? What was on your mind?
              </label>
              <textarea
                value={entry}
                onChange={(e) => setEntry(e.target.value)}
                placeholder="Write freely... What did you work on? How did you approach it? Where did you struggle? What went well?"
                className="w-full h-32 bg-background-secondary border border-card-border rounded-xl px-4 py-3 text-[13px] text-foreground placeholder:text-foreground-tertiary/40 resize-none focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[12px] text-foreground-secondary font-medium block mb-2">
                  Challenges / What was hard?
                </label>
                <textarea
                  value={challenges}
                  onChange={(e) => setChallenges(e.target.value)}
                  placeholder="Where did you get stuck? What frustrated you?"
                  className="w-full h-20 bg-background-secondary border border-card-border rounded-xl px-4 py-3 text-[13px] text-foreground placeholder:text-foreground-tertiary/40 resize-none focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
                />
              </div>
              <div>
                <label className="text-[12px] text-foreground-secondary font-medium block mb-2">
                  Wins / What went well?
                </label>
                <textarea
                  value={wins}
                  onChange={(e) => setWins(e.target.value)}
                  placeholder="What are you proud of today? Any breakthroughs?"
                  className="w-full h-20 bg-background-secondary border border-card-border rounded-xl px-4 py-3 text-[13px] text-foreground placeholder:text-foreground-tertiary/40 resize-none focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            <div className="flex items-end gap-6">
              <div>
                <label className="text-[12px] text-foreground-secondary font-medium block mb-2">
                  Mood
                </label>
                <div className="flex gap-1.5">
                  {MOODS.map((m) => (
                    <button
                      key={m}
                      onClick={() => setMood(m)}
                      className={`px-2.5 py-1.5 text-[11px] rounded-lg transition-all duration-150 ${
                        mood === m
                          ? "bg-primary/[0.15] text-primary-light border border-primary/30 shadow-sm"
                          : "bg-card-elevated border border-card-border text-foreground-tertiary hover:text-foreground hover:border-card-border-hover"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[12px] text-foreground-secondary font-medium block mb-2">
                  Energy (1-5)
                </label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setEnergy(n)}
                      className={`w-8 h-8 rounded-lg text-[11px] font-medium transition-all duration-150 ${
                        energy === n
                          ? "bg-primary text-white shadow-sm shadow-primary/30"
                          : "bg-card-elevated border border-card-border text-foreground-tertiary hover:text-foreground hover:border-card-border-hover"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={save}
                disabled={!entry.trim() || saving}
                className="px-5 py-2.5 bg-primary text-white text-[13px] font-medium rounded-xl hover:bg-primary-dark transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-primary/20 hover:shadow-md hover:shadow-primary/30"
              >
                {saving ? "Saving..." : editing ? "Update Reflection" : "Save Today's Reflection"}
              </button>
              {editing && (
                <button
                  onClick={() => setEditing(false)}
                  className="px-5 py-2.5 text-[13px] font-medium text-foreground-tertiary hover:text-foreground rounded-xl border border-card-border hover:border-card-border-hover transition-all"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="card p-6 border-success/15 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-success/[0.03] via-transparent to-transparent pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-success">
                    <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h2 className="text-[13px] font-medium text-success">Today&apos;s reflection logged</h2>
              </div>
              <button
                onClick={() => {
                  const existing = todayEntry;
                  if (existing) {
                    setEntry(existing.entry);
                    setChallenges(existing.challenges || "");
                    setWins(existing.wins || "");
                    setMood(existing.mood || "");
                    setEnergy(existing.energyLevel || 3);
                  }
                  setEditing(true);
                }}
                className="text-[11px] px-3 py-1.5 rounded-lg bg-card-elevated border border-card-border text-foreground-tertiary hover:text-foreground hover:border-card-border-hover transition-all"
              >
                Edit
              </button>
            </div>
            <p className="text-[13px] text-foreground-secondary leading-relaxed">
              {todayEntry?.entry || entry}
            </p>
            {todayEntry?.aiGuidance && (
              <div className="mt-4 p-4 bg-primary/[0.05] rounded-xl border border-primary/15">
                <p className="text-[11px] font-medium text-primary-light mb-1.5 uppercase tracking-wider">AI Guidance</p>
                <p className="text-[13px] text-foreground-secondary leading-relaxed">{todayEntry.aiGuidance}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {entries.length > 0 && (
        <div>
          <h2 className="text-[11px] font-semibold text-foreground-tertiary uppercase tracking-widest mb-3">
            Past Reflections
          </h2>
          <div className="space-y-3 stagger-children">
            {entries.filter(e => e.date !== today || todaySaved).slice(0, 14).map((e) => (
              <div key={e.id} className="card p-5">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[11px] text-foreground-tertiary font-medium">
                    {new Date(e.date).toLocaleDateString("en-US", {
                      weekday: "short", month: "short", day: "numeric",
                    })}
                  </span>
                  <div className="flex items-center gap-3">
                    {e.mood && <span className="text-[11px]">{e.mood}</span>}
                    {e.energyLevel && (
                      <span className="text-[10px] text-foreground-tertiary font-mono">
                        Energy {e.energyLevel}/5
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-[13px] text-foreground-secondary leading-relaxed">
                  {e.entry}
                </p>
                {(e.challenges || e.wins) && (
                  <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-card-border">
                    {e.challenges && (
                      <div>
                        <p className="text-[10px] text-danger font-medium uppercase tracking-wider">Challenges</p>
                        <p className="text-[12px] text-foreground-tertiary mt-1 leading-relaxed">{e.challenges}</p>
                      </div>
                    )}
                    {e.wins && (
                      <div>
                        <p className="text-[10px] text-success font-medium uppercase tracking-wider">Wins</p>
                        <p className="text-[12px] text-foreground-tertiary mt-1 leading-relaxed">{e.wins}</p>
                      </div>
                    )}
                  </div>
                )}
                {e.aiGuidance && (
                  <div className="mt-3 p-3.5 bg-primary/[0.04] rounded-xl border border-primary/10">
                    <p className="text-[10px] font-medium text-primary-light mb-1 uppercase tracking-wider">AI Guidance</p>
                    <p className="text-[12px] text-foreground-secondary leading-relaxed">{e.aiGuidance}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
