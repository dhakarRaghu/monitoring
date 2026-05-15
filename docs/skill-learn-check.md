# /learn-check — Test Your Understanding (Pop Quiz)

When the user invokes /learn-check, give them a surprise quiz on something they used in the current session. The goal: catch the gap between "I used it" and "I understand it." Finding a gap is a WIN — it's a learning opportunity identified.

## How it works

### Step 1: Pick a topic to test

Scan the current session for concepts the user USED but might not UNDERSTAND deeply. Prioritize:

1. **Libraries/APIs called without explanation** — They used `kafka.NewReader` but do they know what happens when the group coordinator dies?
2. **Solutions accepted from Claude without questioning** — Claude wrote the code, user said "looks good" — but can they explain WHY it works?
3. **Complex behavior relied on** — async operations, caching, auth flows, DB transactions, retry logic
4. **Config values set without understanding** — They set `max.poll.interval.ms=300000` but can they explain the math?
5. **Error handling that was copy-pasted** — The error handling exists but do they know WHICH errors are retriable vs fatal?

### Step 2: Ask 3-4 questions (escalating difficulty)

Start easy, get harder. This reveals exactly where understanding breaks down.

**Question types (use a mix):**

| Type | Format | Tests |
|------|--------|-------|
| Trace | "Walk me through what happens when you call X" | Do they know the full flow? |
| What-if | "What happens if [condition changes]?" | Can they reason about edge cases? |
| Why | "Why does [thing] work this way? Why not [alternative]?" | Do they understand design decisions? |
| Break-it | "How would you make this fail? What input breaks it?" | Do they know the failure modes? |
| Under-the-hood | "What does [library function] actually do at the syscall/protocol level?" | Deep understanding vs surface |
| Compare | "How is [X] different from [Y]? When would you pick one over the other?" | Can they see tradeoffs? |

**Example questions (from real scenarios):**

If they used `context.WithTimeout`:
- "What happens to goroutines spawned inside this context when the timeout fires?"
- "If the DB query takes 4.5s and timeout is 5s, but then you do another 2s call — does it still have time?"
- "What's the difference between context cancellation and context deadline exceeded? When do you see each?"

If they used Kafka consumer:
- "FetchMessage vs ReadMessage — what's the actual difference in offset commit behavior?"
- "If your consumer crashes between FetchMessage and CommitMessages, what happens to that message?"
- "You have 6 partitions and 3 consumers. One dies. Walk me through the rebalance — what pauses, what continues, how long?"

If they used a database transaction:
- "What isolation level is this running at? What does that mean for concurrent reads?"
- "If the app crashes after the INSERT but before tx.Commit(), what happens to the row?"
- "What's the difference between `SELECT FOR UPDATE` and `SELECT FOR SHARE`? When do you need which?"

### Step 3: Evaluate answers

**They understand (score 4-5):**
- Can explain the mechanism, not just the behavior
- Can reason about edge cases unprompted
- Uses correct terminology
- Mentions tradeoffs or alternatives

→ Say: "Solid. You actually understand this." Move on.

**Partial understanding (score 3):**
- Gets the general idea but misses important details
- Can't explain WHY, only WHAT
- Doesn't consider failure modes

→ Give a 2-sentence correction. Add to learning queue as MEDIUM priority.

**Doesn't understand (score 1-2):**
- Can't explain beyond surface level
- Relies on "it just works" or "Claude told me"
- Guesses rather than reasons

→ This is the real value of /learn-check. Teach them NOW:
  1. Give a concise 5-10 sentence explanation (with diagram if spatial)
  2. Give them ONE "try this now" to solidify it
  3. Add to learning queue as HIGH priority
  4. Say: "This is a gap. It's fine — now you know. Study the material in your learn queue."

### Step 4: Save results

```bash
curl -X POST https://raghu-monitoring.vercel.app/api/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "date": "YYYY-MM-DD",
    "startTime": "<now>",
    "durationMinutes": 5,
    "project": "learn-check",
    "taskType": "learning",
    "difficulty": "medium",
    "summary": "Understanding check: <topic tested>",
    "scores": {
      "deep_understanding": <1-5 based on quiz performance>
    },
    "observations": [
      {"type": "observation", "content": "Tested: <topic>. Result: <understood|partial|gap>. Detail: <what they got wrong>"}
    ],
    "learningOpportunities": [
      {"topic": "<what to study>", "reason": "<why — what specific gap>", "priority": "<high|medium|low>"}
    ]
  }'
```

## Output format

```markdown
## /learn-check — Understanding Test

**Topic:** <what we're testing>
**Why this topic:** <you used X today but I want to verify you understand Y underneath>

---

**Q1.** <Easy question — tests basic understanding>

> <User's answer or space for them to answer>

**Q2.** <Medium — tests edge case awareness>

**Q3.** <Hard — tests under-the-hood knowledge>

**Q4.** (optional) <Expert — would stump most mid-level devs>

---

### Result

**Verdict:** <Understood ✓ | Partial ~ | Gap ✗>
**Score:** deep_understanding = X/5

<If gap: 5-10 sentence explanation with diagram>
<If gap: "Try this now: <command>">
<If gap: Added to learning queue (priority: high)>
```

## Tone

- **Curious, not interrogating.** "Let me check if this stuck" not "prove you know this."
- **No shame for gaps.** "Good — now we know where the gap is. That's the whole point."
- **If they know it:** Quick confirmation, genuine respect. "Nice. Most people can't explain that."
- **Challenge them even when they're right:** "Correct. But follow-up: what happens if <extreme edge case>?"

## When to pick which topic

**Always prefer testing:**
1. Things that would cause PRODUCTION BUGS if misunderstood
2. Things they'll use TOMORROW (not one-off experiments)
3. Things that COMPOUND (understanding X unlocks Y and Z)
4. Things where being WRONG has consequences (data loss, security, race conditions)

**Avoid testing:**
- Syntax/API signatures (that's memorization, not understanding)
- Things they explicitly said "I already know this"
- Topics from the study materials they haven't reached yet

## If called multiple times in a day

Pick a DIFFERENT topic each time. Track what was tested in the session observations. Build a broader picture of understanding gaps across different domains.
