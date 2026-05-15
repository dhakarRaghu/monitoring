# /review-day — End of Day Comprehensive Review

When the user invokes /review-day, generate the most honest, comprehensive daily review of all coding work done today. This is the daily checkpoint that feeds the growth dashboard.

## The process

### Step 1: Gather context

Check what was logged today:
```bash
# Today's sessions
curl -s https://raghu-monitoring.vercel.app/api/sessions

# Today's journal entry (user's own reflection)
curl -s "https://raghu-monitoring.vercel.app/api/journal?date=$(date +%Y-%m-%d)"
```

**IMPORTANT:** If the user wrote a journal entry today, READ IT CAREFULLY. Their self-reflection is gold:
- Their challenges → tells you what felt hard (might score attitude/debugging differently than you'd guess)
- Their wins → validate or challenge ("you said X was a win, but actually you skipped Y")
- Their mood/energy → context for scoring (tired + still produced = higher attitude score)
- Use their own words in your feedback ("you wrote that X was frustrating — here's why...")

If no journal entry exists, mention: "Tip: write your reflection at /journal before running /review-day. It helps me give better feedback."

Also review the entire current conversation — what was worked on, how, wins, struggles. If no sessions were logged via /mentor, treat the full conversation as the day's work.

### Step 2: Score ALL 18 areas (1-5)

Score EVERY area. If an area wasn't observable today, give it a 3 (neutral) and note "not observed." But push yourself to find evidence — most sessions touch more areas than you think.

**Scoring (same calibration as /mentor):**
- 1 = Did the opposite. Actively harmful behavior.
- 2 = Clear weakness demonstrated.
- 3 = Adequate. Normal. Met minimum bar.
- 4 = Genuinely good. Would impress a senior.
- 5 = Exceptional. Rare. Staff-engineer level.

### Step 3: Calculate everything

```
Category averages:
  core_habits    = avg(attitude, learning, ownership, verification, proactiveness, communication)
  technical      = avg(code_quality, system_design, debugging, testing)
  growth         = avg(deep_understanding, pattern_recognition, research_ability, asking_questions)
  professional   = avg(speed_efficiency, scope_awareness, pr_quality, thinking_before_coding)
  overall        = avg(all 18)

XP calculation:
  base                    = 10
  per area ≥ 4            = +3 each
  per area = 5            = +5 bonus each
  improvement from yesterday = +5 per improved area (query yesterday's review)
  all 18 ≥ 3             = +20 bonus
  streak bonus           = current_streak × 2
  total                  = sum of above
```

### Step 4: Identify patterns

Look across the day (and memory of past sessions if available):
- **Recurring strengths** — what they consistently do well
- **Recurring weaknesses** — what keeps showing up as low scores
- **Trend** — are they improving or stagnating on their focus areas?
- **Today vs yesterday** — specific area improvements or regressions

### Step 5: Deliver the review

```markdown
## Daily Review — [Date]

**Level [X] — [Title]** | Streak: [X+1] days | +[XP] XP today | Overall: [X.X]/5

---

### Scores

| Category | Area | Score | Quick note |
|----------|------|-------|-----------|
| Core | attitude | X | <2-word evidence> |
| Core | learning | X | ... |
| Core | ownership | X | ... |
| Core | verification | X | ... |
| Core | proactiveness | X | ... |
| Core | communication | X | ... |
| Tech | code_quality | X | ... |
| Tech | system_design | X | ... |
| Tech | debugging | X | ... |
| Tech | testing | X | ... |
| Growth | deep_understanding | X | ... |
| Growth | pattern_recognition | X | ... |
| Growth | research_ability | X | ... |
| Growth | asking_questions | X | ... |
| Prof | speed_efficiency | X | ... |
| Prof | scope_awareness | X | ... |
| Prof | pr_quality | X | ... |
| Prof | thinking_before_coding | X | ... |

### Category Averages
- **Core Habits:** X.X [↑/↓/→ vs yesterday]
- **Technical:** X.X [↑/↓/→]
- **Growth:** X.X [↑/↓/→]
- **Professional:** X.X [↑/↓/→]
- **Overall:** X.X

---

### Today's Win
<The ONE most impressive thing today. Be specific. Why was this good?>

### Today's Miss
<The ONE most important thing to do differently. What happened and what SHOULD have happened?>

### Key Learning
<What was actually learned today? Not "I used X" but "I understood WHY X works because...">

### Patterns I'm Noticing
<2-3 observations about recurring behavior — good or bad. Reference specific sessions if possible.>

---

### Mentor Message
<3-4 sentences. Brutally honest. Reference today specifically. Acknowledge growth where real. Don't comfort — challenge. End with tomorrow's mission.>

### Tomorrow's Focus
**[Weakest area from today]** — <Why this area, what specifically to do differently tomorrow. One concrete behavior change.>

---

*XP breakdown: base(10) + scores(X) + improvement(X) + streak(X) = [total]*
```

### Step 6: Save to system

```bash
# Get yesterday's data for comparison
YESTERDAY=$(date -v-1d +%Y-%m-%d 2>/dev/null || date -d "yesterday" +%Y-%m-%d)
curl -s "https://raghu-monitoring.vercel.app/api/daily?date=$YESTERDAY"

# Post today's review
curl -X POST https://raghu-monitoring.vercel.app/api/daily \
  -H "Content-Type: application/json" \
  -d '{
    "date": "<today YYYY-MM-DD>",
    "categoryAverages": {
      "core_habits": <X.XX>,
      "technical": <X.XX>,
      "growth": <X.XX>,
      "professional": <X.XX>
    },
    "overallAvg": <X.XX>,
    "keyLearning": "<what was learned>",
    "biggestWin": "<specific win>",
    "biggestMiss": "<specific miss>",
    "tomorrowFocus": "<area + action>",
    "mentorMessage": "<the mentor message>",
    "xpEarned": <total XP>
  }'

# Update profile (XP + streak)
curl -X PATCH https://raghu-monitoring.vercel.app/api/profile \
  -H "Content-Type: application/json" \
  -d '{
    "xpEarned": <total XP>,
    "streak": <current + 1>,
    "sessionsAdded": <sessions today>,
    "hoursAdded": <hours today>
  }'
```

### Step 7: Check achievement conditions

After saving, check if any achievements should unlock:
- First review → `first-review`
- Streak hit 7/30/100 → `streak-7`, `streak-30`, `streak-100`
- Any score = 5 → `first-perfect`
- All 18 ≥ 3 for 7 consecutive days → `full-stack-growth`

If unlocked:
```bash
curl -X POST https://raghu-monitoring.vercel.app/api/achievements \
  -H "Content-Type: application/json" \
  -d '{"slug": "<achievement-slug>"}'
```

### Step 8: Write AI guidance to journal

If the user wrote a journal entry today, update it with personalized guidance based on what they shared + today's scores:

```bash
curl -X POST https://raghu-monitoring.vercel.app/api/journal \
  -H "Content-Type: application/json" \
  -d '{
    "date": "<today>",
    "entry": "<their original entry — keep unchanged>",
    "aiGuidance": "<2-3 sentences of specific guidance based on their reflection + today's scores. Not generic — reference their exact words.>",
    "aiSuggestions": ["<actionable suggestion 1>", "<actionable suggestion 2>", "<suggestion 3>"]
  }'
```

The guidance should:
- Reference their own words ("You said X was frustrating — here's a concrete way to approach it next time")
- Connect to their scores ("Your attitude was 4 today despite being tired — that's growth")
- Give ONE specific thing to try tomorrow
- If they mentioned a challenge, suggest a study material or approach

### Step 9: Update memory

Update `/Users/raghvendradhakar/.claude/projects/-Users-raghvendradhakar-Desktop-code-verly/memory/mentor_progress.md` with:
- Current level & XP
- Updated strongest/weakest areas (based on 7-day rolling average)
- Any new patterns observed
- This week's recommendation

## Critical rules

- **Score ALL 18 areas every day.** No exceptions. Even "not observed" is a data point (means they didn't touch that area today — which itself is information).
- **Compare to yesterday.** Always. "attitude went from 2 to 4" matters more than a standalone 4.
- **The mentor message must STING a little.** If it reads like a participation trophy, rewrite it. The user asked to be challenged, not comforted.
- **Light day = say so.** If they worked 30 min on trivial stuff, the review should be short: "Light day. Not enough signal to give meaningful scores. The one observation: <X>. No XP bonus for low-effort days."
- **Never repeat the same generic advice twice.** If you said "plan before coding" yesterday, today say SPECIFICALLY: "You jumped into the migration without drawing the schema change first. Spend 5 min tomorrow with pen and paper before `CREATE TABLE`."
