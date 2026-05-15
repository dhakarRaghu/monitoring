# AI Mentor System — Complete Implementation Plan

## Context

You want a system where Claude acts as your mentor — monitoring your daily coding work, giving real-time feedback, tracking improvement across 18 growth areas, and helping you become a complete developer. Since all your coding happens with Claude, it already sees everything — this system makes that observation structured, tracked, and actionable.

**Database:** Neon Postgres
**Dashboard:** Next.js (App Router) + Tailwind + Recharts
**Integration:** Claude Code hooks + skills

---

## The 18 Growth Areas

### Category 1: Core Work Habits
1. **attitude** — Staying in hard problems, not giving up
2. **learning** — Extracting lessons, understanding WHY
3. **ownership** — Building till the end, edge cases, production-ready
4. **verification** — First principles, knowing assumptions, testing hypotheses
5. **proactiveness** — Finding problems, suggesting improvements, unblocking self
6. **communication** — Flagging blockers early, clear updates

### Category 2: Technical Excellence
7. **code_quality** — Clean code, proper naming, readable
8. **system_design** — How pieces connect, scale, trade-offs
9. **debugging** — Methodical approach, reading errors, finding root cause
10. **testing** — Writing tests, edge case coverage, test-first thinking

### Category 3: Growth & Learning
11. **deep_understanding** — Understanding tools/libraries underneath, not just using
12. **pattern_recognition** — Seeing similarities, applying learned solutions
13. **research_ability** — Finding answers independently, reading docs
14. **asking_questions** — Specific questions, showing what you tried

### Category 4: Professional Impact
15. **speed_efficiency** — Getting things done without sacrificing quality
16. **scope_awareness** — Knowing when to stop, not over/under-delivering
17. **pr_quality** — Clean commits, good descriptions, reviewable code
18. **thinking_before_coding** — Planning approach before jumping in

---

## Tech Stack

| Component | Tech |
|-----------|------|
| Database | Neon Postgres (connection pooler, SSL) |
| ORM | Drizzle ORM (TypeScript-first, lightweight) |
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS (dark mode) |
| Charts | Recharts |
| Deployment | Local dev (can deploy to Vercel later) |
| Integration | Claude Code hooks + skills |

**Database URL:** Set in `.env` file (not committed to git — see `.env.example`)

---

## Database Schema

### Tables

```sql
-- Core session tracking
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  duration_minutes INTEGER,
  project VARCHAR(100),
  task_type VARCHAR(50), -- feature, bugfix, refactor, learning, review
  difficulty VARCHAR(20), -- easy, medium, hard
  summary TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Scores per session (18 areas)
CREATE TABLE session_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id),
  area VARCHAR(50) NOT NULL, -- one of 18 areas
  score INTEGER CHECK (score >= 1 AND score <= 5),
  UNIQUE(session_id, area)
);

-- Observations, wins, struggles per session
CREATE TABLE session_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id),
  type VARCHAR(20) NOT NULL, -- observation, win, struggle, suggestion
  content TEXT NOT NULL
);

-- Learning opportunities identified
CREATE TABLE learning_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id),
  topic VARCHAR(200) NOT NULL,
  reason TEXT,
  priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high
  status VARCHAR(20) DEFAULT 'pending', -- pending, in_progress, completed
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Daily aggregated reviews
CREATE TABLE daily_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE UNIQUE NOT NULL,
  category_avg_core_habits DECIMAL(3,2),
  category_avg_technical DECIMAL(3,2),
  category_avg_growth DECIMAL(3,2),
  category_avg_professional DECIMAL(3,2),
  overall_avg DECIMAL(3,2),
  key_learning TEXT,
  biggest_win TEXT,
  biggest_miss TEXT,
  tomorrow_focus TEXT,
  mentor_message TEXT,
  xp_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Gamification profile
CREATE TABLE profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level INTEGER DEFAULT 1,
  title VARCHAR(50) DEFAULT 'Beginner',
  total_xp INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  total_hours DECIMAL(8,2) DEFAULT 0,
  start_date DATE DEFAULT CURRENT_DATE,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Achievements
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  xp_reward INTEGER DEFAULT 20,
  icon VARCHAR(10), -- emoji
  category VARCHAR(50),
  condition_description TEXT
);

-- User's unlocked achievements
CREATE TABLE unlocked_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  achievement_slug VARCHAR(100) REFERENCES achievements(slug),
  unlocked_at TIMESTAMP DEFAULT NOW(),
  session_id UUID REFERENCES sessions(id)
);

-- Weekly summaries (for trends)
CREATE TABLE weekly_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  area_averages JSONB, -- {"attitude": 3.5, "learning": 4.0, ...}
  strongest_areas TEXT[], -- top 3
  weakest_areas TEXT[], -- bottom 3
  improvement_from_last_week JSONB, -- {"attitude": +0.5, ...}
  patterns TEXT[],
  focus_recommendation TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Mentor nudges log (real-time interventions)
CREATE TABLE mentor_nudges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id),
  nudge_type VARCHAR(50), -- attitude, learning, testing, planning, etc.
  message TEXT,
  context TEXT, -- what triggered it
  user_response VARCHAR(50), -- acknowledged, acted_on, ignored
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Project Structure

```
mentor-dashboard/
├── app/
│   ├── layout.tsx              (dark theme, sidebar nav, font setup)
│   ├── page.tsx                (dashboard home)
│   ├── daily/
│   │   ├── page.tsx            (calendar view)
│   │   └── [date]/page.tsx     (specific day detail)
│   ├── trends/
│   │   └── page.tsx            (charts by category)
│   ├── achievements/
│   │   └── page.tsx            (badge grid)
│   ├── insights/
│   │   └── page.tsx            (AI insights, patterns)
│   ├── learn/
│   │   └── page.tsx            (learning queue)
│   └── api/
│       ├── sessions/route.ts   (CRUD sessions)
│       ├── daily/route.ts      (daily review endpoints)
│       ├── profile/route.ts    (profile + XP)
│       ├── achievements/route.ts
│       ├── trends/route.ts     (aggregation queries)
│       └── learn/route.ts      (learning queue)
├── components/
│   ├── Sidebar.tsx
│   ├── ScoreRadar.tsx          (radar chart for 4 categories)
│   ├── TrendChart.tsx          (line chart component)
│   ├── XPBar.tsx               (level progress bar)
│   ├── StreakCounter.tsx
│   ├── AchievementBadge.tsx
│   ├── CalendarHeatmap.tsx
│   ├── DailyCard.tsx
│   ├── MentorMessage.tsx
│   └── LearningItem.tsx
├── lib/
│   ├── db.ts                   (Drizzle + Neon connection)
│   ├── schema.ts              (Drizzle schema definitions)
│   ├── gamification.ts         (XP calc, level calc, achievement checks)
│   ├── queries.ts              (reusable DB queries)
│   └── types.ts                (TypeScript interfaces)
├── scripts/
│   ├── migrate.ts              (run DB migrations)
│   ├── seed-achievements.ts    (populate achievement definitions)
│   └── log-session.js          (hook script for session logging)
├── drizzle/
│   └── migrations/             (SQL migration files)
├── .env.local                  (DATABASE_URL)
├── drizzle.config.ts
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## Dashboard Pages Detail

### `/` — Home Dashboard
- Level badge + title ("Level 3 — Growing Developer")
- XP progress bar to next level
- Current streak (flame icon + count)
- Radar chart: 4 category averages (core habits, technical, growth, professional)
- Today's scores (if reviewed) or "Awaiting /review-day"
- Latest mentor message
- 3 most recent achievements
- "Quick Stats": total sessions, total hours, days since start

### `/daily` — Daily Log
- Calendar heatmap (color = overall avg score: red < 2.5, yellow 2.5-3.5, green > 3.5)
- Click any date → full daily review: all scores, observations, wins, misses, mentor message
- Comparison to previous day (arrows up/down per area)

### `/trends` — Trends & Charts
- 4 line charts (one per category), each showing area lines over time
- Toggle: 7d / 30d / 90d / all
- Highlight: areas trending up (green) vs down (red) vs flat (gray)
- Weekly average comparison table

### `/achievements` — Gamification
- Badge grid: unlocked (colored) vs locked (grayed, with progress %)
- Categories: streaks, scores, habits, milestones
- Next 3 closest-to-unlock achievements highlighted
- Total XP earned from achievements

### `/insights` — AI Insights
- Current strengths (top 5 areas by avg score)
- Current weaknesses (bottom 5)
- Improvement velocity (which areas moving fastest)
- Recurring patterns ("You drop testing when rushing", "Attitude peaks on Mon/Tue")
- Week-over-week comparison
- "You were here 4 weeks ago" snapshot

### `/learn` — Learning Queue
- Topics identified during sessions that you should study deeper
- Priority: high / medium / low
- Status: pending / in-progress / completed
- Filter by area (which growth area it relates to)
- Mark as done when you've studied it

---

## Gamification System

### XP Sources
| Action | XP |
|--------|-----|
| Complete /mentor review | 5 |
| Complete /review-day | 10 |
| Score ≥4 on any area | 3 per area |
| Score 5 on any area | 5 bonus |
| Improve any area from yesterday | 5 per area |
| All 18 areas ≥3 in one day | 20 |
| Daily streak bonus | streak × 2 |
| Achievement unlock | 20–100 |
| Solved hard problem without giving up | 15 |
| Wrote tests before code | 10 |
| Planned before coding (documented) | 10 |

### Level Formula
`Level = floor(sqrt(total_xp / 25))`

| Level | XP | Title |
|-------|-----|-------|
| 1 | 0 | Beginner |
| 2 | 100 | Apprentice |
| 3 | 225 | Growing Developer |
| 4 | 400 | Competent Developer |
| 5 | 625 | Skilled Developer |
| 7 | 1225 | Strong Developer |
| 10 | 2500 | Senior-Level |
| 15 | 5625 | Expert |
| 20 | 10000 | Master |

### Achievement Definitions (seeded into DB)
| Slug | Name | Condition | XP |
|------|------|-----------|-----|
| first-review | First Review | Complete first /review-day | 20 |
| streak-7 | Week Warrior | 7-day streak | 30 |
| streak-30 | Monthly Dedication | 30-day streak | 50 |
| streak-100 | Unstoppable | 100-day streak | 100 |
| first-perfect | Perfect Score | Score 5 on any area | 20 |
| hard-problem-hero | Hard Problem Hero | Stay on hard problem 2+ hours | 30 |
| never-give-up | Never Give Up | 0 give-ups for 7 days | 40 |
| test-first | Test First | Write tests before code 5 times | 30 |
| architect | Architect | Score 5 on system_design 3 times | 40 |
| deep-diver | Deep Diver | Complete 10 learning queue items | 30 |
| full-stack-growth | Full Stack | All 18 areas ≥3 avg for a week | 50 |
| unblockable | Unblockable | Self-unblock 10 times | 40 |
| clean-coder | Clean Coder | Score 5 on code_quality 5 times | 30 |
| planner | Planner | Score 5 on thinking_before_coding 5 days | 40 |
| communicator | Communicator | Zero missed comms for 30 days | 50 |
| pattern-master | Pattern Master | Recognize 10 cross-project patterns | 40 |
| complete-dev | The Complete Developer | All 18 areas avg ≥4 for 2 weeks | 100 |

---

## Claude Code Skills

### Skill: `/mentor` (file: `.claude/skills/mentor.md`)

When invoked, Claude:
1. Reviews the current session — what was worked on, approach taken, struggles, wins
2. Scores relevant areas (1-5) with brief justification
3. Lists top 3 things done well + top 3 to improve
4. Identifies learning opportunities
5. Calls the API: `POST /api/sessions` with the session data
6. Gives a mentor message (honest, specific, actionable)

### Skill: `/review-day` (file: `.claude/skills/review-day.md`)

When invoked, Claude:
1. Queries today's sessions from DB via API
2. Aggregates scores across sessions
3. Calculates category averages
4. Identifies the day's biggest win and miss
5. Sets tomorrow's focus area
6. Calculates XP earned, checks achievement conditions
7. Writes daily review: `POST /api/daily`
8. Updates profile: `PATCH /api/profile`
9. Delivers comprehensive end-of-day mentor message

### Skill: `/learn-check` (file: `.claude/skills/learn-check.md`)

Claude asks 2-3 questions about something you used in the session to test understanding. Based on answers:
- If you understand → mark as completed in learning queue
- If you don't → keeps it as pending, bumps priority

---

## Hooks Configuration

In `.claude/settings.local.json`, add:

```json
{
  "hooks": {
    "Stop": [
      {
        "type": "command",
        "command": "node /Users/raghvendradhakar/Desktop/code/verly/mentor-dashboard/scripts/log-turn.js \"$CLAUDE_SESSION_ID\" \"$CLAUDE_TURN_SUMMARY\""
      }
    ]
  }
}
```

`log-turn.js` appends lightweight turn metadata to a local temp file that `/mentor` reads when generating the session review.

---

## Memory Integration

File: `/Users/raghvendradhakar/.claude/projects/-Users-raghvendradhakar-Desktop-code-verly/memory/mentor_progress.md`

Updated when `/review-day` runs:
- Current level & XP
- Strongest areas (top 5 by 30-day avg)
- Weakest areas (bottom 5)
- Areas improving fastest
- Areas stagnating
- Recurring patterns observed
- This week's recommended focus

This allows Claude to reference your growth across sessions without querying the DB every time.

---

## Data Flow

```
You code with Claude
        │
        ├─── Hook (Stop) ──→ log-turn.js ──→ temp session log
        │
        ├─── /mentor ──→ Claude reviews session ──→ POST /api/sessions ──→ Neon DB
        │
        └─── /review-day ──→ Claude aggregates day ──→ POST /api/daily ──→ Neon DB
                                                    ──→ PATCH /api/profile ──→ Neon DB
                                                    ──→ Update memory file
                                                            │
                                                            ▼
                                              Next.js dashboard reads from Neon DB
                                              ──→ Charts, scores, achievements, insights
```

---

## Build Order

| Step | What | Files |
|------|------|-------|
| 1 | Init Next.js project, install deps (drizzle, neon, recharts, tailwind) | package.json, configs |
| 2 | Set up Drizzle + Neon connection | lib/db.ts, .env.local, drizzle.config.ts |
| 3 | Define schema + run migrations | lib/schema.ts, drizzle/migrations/ |
| 4 | Seed achievements table | scripts/seed-achievements.ts |
| 5 | Build API routes (sessions, daily, profile, trends, achievements, learn) | app/api/**/route.ts |
| 6 | Build gamification engine | lib/gamification.ts |
| 7 | Build shared components (Sidebar, XPBar, charts) | components/ |
| 8 | Build Dashboard page `/` | app/page.tsx |
| 9 | Build Daily Log page `/daily` | app/daily/ |
| 10 | Build Trends page `/trends` | app/trends/ |
| 11 | Build Achievements page `/achievements` | app/achievements/ |
| 12 | Build Insights page `/insights` | app/insights/ |
| 13 | Build Learn page `/learn` | app/learn/ |
| 14 | Create `/mentor` skill | .claude/skills/mentor.md |
| 15 | Create `/review-day` skill | .claude/skills/review-day.md |
| 16 | Create `/learn-check` skill | .claude/skills/learn-check.md |
| 17 | Set up hook + log-turn script | settings, scripts/log-turn.js |
| 18 | Create initial memory entry | memory/mentor_progress.md |
| 19 | End-to-end test | Run /mentor → verify DB → verify dashboard |

---

## Verification Plan

1. Run `npm run dev` → dashboard loads with empty state
2. Run DB migrations → tables created in Neon
3. Seed achievements → visible on `/achievements` (all locked)
4. Use `/mentor` in a Claude session → session record appears in DB → shows on dashboard
5. Use `/review-day` → daily review created, XP awarded, streak updated, dashboard reflects it
6. After 3 days → trends page shows lines, streak counter works
7. Hit an achievement condition → badge unlocks, notification on dashboard
8. Use `/learn-check` → learning queue item status updates

---

## The Goal

**Before:** "I do the work I'm told."
**After:** "I own everything I touch, I understand everything I use, I plan before I code, I test before I ship, I stay when it's hard, I learn from every task, and I get measurably better every week — and I have the data to prove it."
