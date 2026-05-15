# Full Course Generation — Instruction Template

Copy this entire file, fill in the variables at the top, and paste into a new Claude session to generate a full production-grade learning course on any topic.

---

## FILL THESE VARIABLES BEFORE PASTING

```
TOPIC:               [e.g. Kafka, Kubernetes, gRPC, Redis, System Design, Go Concurrency]
MY_ROLE:             [e.g. SDE at Mindtickle, 2 yrs experience, Go+Java backend]
MY_STACK:            [e.g. Go, Java, gRPC, AWS MSK, Helm, K8s, Redis, Datadog]
PRIMARY_LANGUAGE:    [e.g. Go — use this for all code examples]
SECONDARY_LANGUAGE:  [e.g. Java — explain if library is only available here]
WORKING_DIR:         [e.g. ~/Desktop/project/mindtickle/kafka-learning/]
PRODUCTION_CODEBASE: [e.g. ~/Desktop/project/mindtickle/ — tie concepts to real files]
DAILY_TIME:          [e.g. 1 hour/day]
GOAL:                [e.g. Senior-level, able to debug prod incidents and design systems]
```

---

## WHO I AM

I'm {MY_ROLE}. My stack: {MY_STACK}. My production repos are at {PRODUCTION_CODEBASE}.

I learn best by:
- Tying every concept to production code I already work with
- Hands-on exercises BEFORE theory solidifies (do → understand → formalize)
- ASCII diagrams for anything spatial, temporal, or multi-component
- Short concept blocks (3-5 paragraphs max) then immediately code/exercise
- Checkpoint quizzes that test UNDERSTANDING not MEMORY

I do NOT want:
- Walls of theory before touching code
- Toy examples that don't reflect production patterns
- Glossing over "why" — I need the reasoning, not just the "what"
- Moving forward with shaky foundations

---

## OPERATING MODEL

### Tracker
- Single source of truth: {WORKING_DIR}/README.md
- Updated every session with: current phase, checkpoint status, my notes
- Claude reads this at start of every session to resume context

### Per-phase loop (STRICT — follow this for every phase)

```
┌─────────────────────────────────────────────────────────────────┐
│  Phase N                                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. KICKOFF             — Drop concepts + diagrams + code       │
│        ▼                  + exercises + reading list             │
│  2. I DO THE WORK       — Offline; take notes in tracker        │
│        ▼                  Ask anything anytime                  │
│  3. PRODUCTION ANCHOR   — Open 1+ real file from my codebase    │
│        ▼                  I explain it back                     │
│  4. CHECKPOINT QUIZ     — 5-7 questions testing understanding   │
│        ▼                  Vague answer = re-loop on weak bit    │
│  5. SIGN-OFF            — Tracker updated, next phase unlocked  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

Rule: NO skipping checkpoints. Every shortcut = confused face in a future incident.

### Session resume protocol
When I say "continue" or the topic name:
1. Read the tracker README.md
2. Recap where we are + last checkpoint status
3. Propose what we cover today (I can redirect)

---

## COURSE STRUCTURE (6-8 phases)

Design the course following this progression:

| Phase | Focus | Deliverable |
|-------|-------|-------------|
| 0 — Frame the Problem | WHY it exists, what came before, core insight | 3-4 framing questions answered in own words |
| 1 — Core Mental Model | 5-7 key concepts, breadth over depth, first hands-on | Can draw the system on a whiteboard from memory |
| 2 — Internals | What ACTUALLY happens under the hood. Protocols, algorithms, failure modes | Can explain any behavior from first principles |
| 3 — Tuning & Optimization | Config knobs, benchmarking, tradeoffs | Can tune for a given workload and explain why |
| 4 — Ecosystem & Integration | Adjacent tools, libraries, patterns | Can pick the right tool/pattern for a given problem |
| 5 — Production & Operations | Monitoring, alerting, debugging, capacity planning. Tie to MY env | Can operate in production confidently |
| 6 — Senior Design | When to use vs NOT use. Alternatives. Design reviews | Can make and defend architectural decisions |

Target: senior-ready in ~8 weeks at {DAILY_TIME}.

---

## CONTENT QUALITY REQUIREMENTS (NON-NEGOTIABLE)

### 1. Concept Blocks
- 3-5 paragraphs MAX per concept
- Lead with WHY before WHAT
- If counterintuitive: "This surprises most people: ..."
- If common mistake: show WRONG way first, then RIGHT way
- End each concept with **The sentence to remember:**
- End with **The trap:** (the thing that will bite you)
- Use analogies to things I already know from my stack

### 2. ASCII Diagrams — MANDATORY for every concept with structure

Quality bar:
```
┌──────────┐   request    ┌──────────┐   replicate   ┌──────────┐
│ Client   ├─────────────►│ Leader   ├──────────────►│ Follower │
│          │◄─────────────┤          │◄──────────────┤          │
└──────────┘   response   └──────────┘   ack         └──────────┘
```

NOT acceptable: `Client -> Leader -> Follower`

Use box-drawing characters (┌ ┐ └ ┘ │ ─ ├ ┤ ┬ ┴ ┼ ► ◄ ▲ ▼) for:
- Every spatial relationship → architecture diagram
- Every temporal sequence → timeline diagram  
- Every multi-component interaction → flow diagram
- Every comparison → side-by-side diagram
- Every state change → before/after diagram

### 3. Code Examples
- Language: {PRIMARY_LANGUAGE}
- Every example MUST be runnable (copy-paste-run)
- Top comment: WHAT it demonstrates + HOW to run it
- Use flags/args for configurability
- Show PRODUCTION patterns, not toy code
- Include error handling matching real-world usage
- If "wrong" and "right" way exists, show both

### 4. Exercises (per phase: 7-12)
- Numbered: E1, E2, E3...
- Format: `- [ ] **E1.** description`
- Each has: clear instruction, expected outcome, ONE concept, builds on previous
- Mix of: observation, build, break-it, debug exercises

### 5. Checkpoint Questions (per phase: 5-7)
- Test UNDERSTANDING, not MEMORY
- Cannot be answered by copying docs
- Require synthesis across concepts
- Must include: trace-a-flow, argument, design, debug, production-specific

### 6. Production Anchors (per phase: 1-3)
- Point to specific files in {PRODUCTION_CODEBASE}
- Ask me to identify patterns, explain back, spot improvements

### 7. Required Reading (per phase: 1-3)
- Only the BEST resource per concept
- Prefer: original papers, official docs, canonical blog posts
- Include estimated reading time + which sections to focus on

### 8. Cheatsheet (per phase: 1 page)
- All commands/configs/patterns from the phase
- Format: `what → command/config`
- Fits on one screen

---

## FILE STRUCTURE TO GENERATE

```
{WORKING_DIR}/
├── README.md                    ← Tracker: phase status, checkpoints, notes
├── docker-compose.yml           ← Local environment (if applicable)
├── go.mod / package.json / etc  ← Module root
│
├── phase00_framing/
│   └── README.md
├── phase01_mental_model/
│   ├── README.md
│   ├── example_01/main.go
│   ├── example_02/main.go
│   └── CHEATSHEET.md
├── phase02_internals/
│   ├── README.md
│   ├── exercise_code/
│   └── CHEATSHEET.md
├── phase03_tuning/
│   ├── README.md
│   ├── benchmarks/
│   └── CHEATSHEET.md
├── phase04_ecosystem/
│   ├── README.md
│   ├── integration_code/
│   └── CHEATSHEET.md
├── phase05_production/
│   ├── README.md
│   ├── monitoring/
│   ├── runbooks/
│   └── CHEATSHEET.md
└── phase06_design/
    ├── README.md
    ├── design_exercises/
    └── CHEATSHEET.md
```

---

## DELIVERY INSTRUCTIONS

1. First: create tracker README.md with all phases listed (locked)
2. Deliver ONE phase at a time
3. For each phase, output in order:
   a. Full README.md (theory + diagrams + exercises + checkpoint + anchors)
   b. Each code file separately (runnable)
   c. Any additional configs (docker-compose, etc.)
   d. CHEATSHEET.md
4. Wait for confirmation before next phase
5. "continue" or "next" → move to next phase
6. Questions mid-phase → answer, then ask "ready to continue?"

---

## QUALITY BARS

### DO:
- Every diagram must be CORRECT
- Every code example must COMPILE and RUN
- Every explanation must answer "why does this matter in production?"
- Assume prior phases completed — don't re-explain basics
- Call out counterintuitive things explicitly
- Show wrong way first, then right way
- Use tables for ALL comparisons
- Use timelines for ALL sequences
- Include "the one sentence to remember" per concept
- Include "the trap to avoid" per concept

### DO NOT:
- Don't write walls of text without diagrams
- Don't give toy examples
- Don't say "simply" or "just"
- Don't skip the "why"
- Don't leave exercises vague — make them verifiable
- Don't use placeholder code (// TODO)
- Don't skip error cases
- Don't hand-wave gotchas
- Don't repeat concepts from earlier phases

---

## EXAMPLE QUALITY REFERENCE

### Concept block:
```
## 2.3 — Leader Election (what happens when a broker dies)

   t=0:    Leader of P0 = broker-1, ISR = {1,2,3}
   t=1:    docker kill kafka-1
   t=2:    Heartbeats stop reaching controller.
   t=3:    Controller picks new leader from ISR.
   t=4:    Metadata updated: P0 leader = broker-2.
   t=5:    Producer retries once → continues. No data loss.

**The sentence to remember:** Leader election is automatic, fast (~seconds),
and invisible to producers that retry.

**The trap:** unclean.leader.election.enable=true lets out-of-sync replicas
become leader — ACKNOWLEDGED data can be LOST. Default false. Never flip it.
```

### Exercise:
```
- [ ] **E7.** Kill the leader broker for partition 0.
  - Run: `docker kill kafka-1`
  - Observe: new leader elected within seconds
  - Observe: producer logs show 1-2 retries then continues
  - Verify: no messages lost (consumer count matches producer count)
  - Teaches: automatic failover with acks=all
```

### Checkpoint:
```
Q4. "We need exactly-once processing of events to store results in MySQL."
A junior proposes Kafka transactions. Why is that the wrong tool?
What's the right pattern? Draw the flow.
```

---

## START

Now:
1. Design the full phase outline for {TOPIC} (phase titles + one-line descriptions + estimated sessions)
2. Create the tracker README.md
3. Begin Phase 0

Let's go.
