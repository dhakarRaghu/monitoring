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
    setSaving(false);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          Daily Journal
        </h1>
        <p className="text-sm text-foreground-tertiary mt-1">
          Write your daily reflection. Claude uses this for better guidance.
        </p>
      </div>

      {/* Today's entry form */}
      {!todayEntry && !todaySaved ? (
        <div className="card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground-tertiary uppercase tracking-wider">
            Today — {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </h2>

          <div>
            <label className="text-xs text-foreground-secondary font-medium block mb-1.5">
              What happened today? How did you work? What was on your mind?
            </label>
            <textarea
              value={entry}
              onChange={(e) => setEntry(e.target.value)}
              placeholder="Write freely... What did you work on? How did you approach it? Where did you struggle? What went well?"
              className="w-full h-32 bg-background-secondary border border-card-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-foreground-tertiary/50 resize-none focus:outline-none focus:border-primary/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-foreground-secondary font-medium block mb-1.5">
                Challenges / What was hard?
              </label>
              <textarea
                value={challenges}
                onChange={(e) => setChallenges(e.target.value)}
                placeholder="Where did you get stuck? What frustrated you?"
                className="w-full h-20 bg-background-secondary border border-card-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-foreground-tertiary/50 resize-none focus:outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <label className="text-xs text-foreground-secondary font-medium block mb-1.5">
                Wins / What went well?
              </label>
              <textarea
                value={wins}
                onChange={(e) => setWins(e.target.value)}
                placeholder="What are you proud of today? Any breakthroughs?"
                className="w-full h-20 bg-background-secondary border border-card-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-foreground-tertiary/50 resize-none focus:outline-none focus:border-primary/50"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div>
              <label className="text-xs text-foreground-secondary font-medium block mb-1.5">
                Mood
              </label>
              <div className="flex gap-1.5">
                {MOODS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setMood(m)}
                    className={`px-2.5 py-1 text-xs rounded-lg transition-all ${
                      mood === m
                        ? "bg-primary-glow-strong text-primary-light border border-primary/30"
                        : "bg-card-elevated border border-card-border text-foreground-tertiary hover:text-foreground"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-foreground-secondary font-medium block mb-1.5">
                Energy (1-5)
              </label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setEnergy(n)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                      energy === n
                        ? "bg-primary text-white"
                        : "bg-card-elevated border border-card-border text-foreground-tertiary hover:text-foreground"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={save}
            disabled={!entry.trim() || saving}
            className="px-5 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Today's Reflection"}
          </button>
        </div>
      ) : (
        <div className="card p-6 border-success/20">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-success text-lg">✓</span>
            <h2 className="text-sm font-medium text-success">Today's reflection logged</h2>
          </div>
          <p className="text-sm text-foreground-secondary">
            {todayEntry?.entry || entry}
          </p>
          {todayEntry?.aiGuidance && (
            <div className="mt-4 p-3 bg-primary-glow rounded-lg border border-primary/20">
              <p className="text-xs font-medium text-primary-light mb-1">AI Guidance:</p>
              <p className="text-sm text-foreground-secondary">{todayEntry.aiGuidance}</p>
            </div>
          )}
        </div>
      )}

      {/* Past entries */}
      {entries.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-foreground-tertiary uppercase tracking-wider mb-3">
            Past Reflections
          </h2>
          <div className="space-y-3">
            {entries.filter(e => e.date !== today || todaySaved).slice(0, 14).map((e) => (
              <div key={e.id} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-foreground-tertiary">
                    {new Date(e.date).toLocaleDateString("en-US", {
                      weekday: "short", month: "short", day: "numeric",
                    })}
                  </span>
                  <div className="flex items-center gap-2">
                    {e.mood && <span className="text-xs">{e.mood}</span>}
                    {e.energyLevel && (
                      <span className="text-xs text-foreground-tertiary">
                        Energy: {e.energyLevel}/5
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-foreground-secondary leading-relaxed">
                  {e.entry}
                </p>
                {(e.challenges || e.wins) && (
                  <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-card-border">
                    {e.challenges && (
                      <div>
                        <p className="text-[10px] text-danger font-medium uppercase">Challenges</p>
                        <p className="text-xs text-foreground-tertiary mt-0.5">{e.challenges}</p>
                      </div>
                    )}
                    {e.wins && (
                      <div>
                        <p className="text-[10px] text-success font-medium uppercase">Wins</p>
                        <p className="text-xs text-foreground-tertiary mt-0.5">{e.wins}</p>
                      </div>
                    )}
                  </div>
                )}
                {e.aiGuidance && (
                  <div className="mt-3 p-3 bg-primary-glow rounded-lg border border-primary/20">
                    <p className="text-xs font-medium text-primary-light mb-1">AI Guidance:</p>
                    <p className="text-xs text-foreground-secondary">{e.aiGuidance}</p>
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
