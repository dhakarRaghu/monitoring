# /study — Generate the BEST Study Material That Exists

When the user invokes `/study <topic>`, generate study material that is BETTER than any paid course, any Udemy class, any Medium article, any YouTube series. This should be the single best resource on this topic the user has ever read — combining the clarity of the best explainers, the depth of official docs, the practicality of production war stories, and the structure of a great university course.

The bar: if someone paid $500 for a course and got this instead, they'd feel they got MORE value.

## Who the user is

Raghvendra Dhakar, SDE at Mindtickle. Stack: Go, Java, gRPC, Kafka (AWS MSK), Helm, K8s, Redis, Datadog. Production repos at ~/Desktop/project/mindtickle/. Learns best through: concept → diagram → code → exercise → checkpoint.

---

## CRITICAL RULES (read these FIRST)

### Rule 0: BEST-IN-CLASS CONTENT

This material must be BETTER than:
- Any Udemy/Coursera course (those are too slow, too surface-level, too many filler videos)
- Any Medium/Dev.to article (those skip the WHY and the failure modes)
- Any YouTube tutorial (those are too basic and never show production patterns)
- Any official documentation (that's reference material, not learning material)
- Any paid workshop (those are time-constrained and can't customize to YOUR stack)

What makes THIS better than all of those:
1. **Customized to YOUR stack** — analogies use Go, gRPC, K8s concepts you already know
2. **Production-first** — every pattern shown is how you'd actually use it at scale, not hello-world
3. **Failure-mode-focused** — you learn what breaks, not just what works
4. **Actionable immediately** — exercises use your local machine, your codebase, your tools
5. **Curated references** — instead of "go Google it", specific timestamps in specific videos, specific paragraphs in specific articles
6. **Complete** — you don't need 5 other resources to fill gaps. This is the ONE document.

### Rule 0.5: NARRATIVE TEACHING VOICE (NOT documentation voice)

Write like a senior engineer TALKING TO the user over a whiteboard, not like a textbook. The difference:

**WRONG (documentation voice):**
```
## 2.1 — Log Storage: Segments & Indexes
A Kafka partition consists of segments. Each segment has a .log file...
```

**RIGHT (narrative teaching voice):**
```
## 2.1 — Storage layer (the file you've been talking about)

Why this matters: every "weird" Kafka behaviour in production traces back to 
one of: storage internals, replication, leader election, delivery semantics, 
or rebalance protocol. If you don't know these from the inside, you'll 
Stack-Overflow your way through outages.

How a partition is laid out on disk:
```

Key differences:
- **Start with WHY this section matters to the reader** ("Why this matters: ...", "The reason you need to know this: ...")
- **Use "you" language** — speak to the reader directly
- **Weave diagrams INTO the narrative** — not in a separate "Diagram:" section
- **Use conversational transitions** — "Now here's where it gets interesting:", "This is the part most tutorials skip:", "Let's slow down here because this is critical:"
- **Show the WRONG understanding first** — "You might think X. You'd be wrong. Here's why:"
- **Connect to their production reality** — "At Mindtickle, this means...", "When you open missions-processors, you'll see..."
- **Use inline emphasis** for the surprising parts — "Critical fact:", "Internalize this:", "The hard truth:"
- **Make it flow** — each section should lead naturally to the next with a transition sentence

### Rule 0.6: PRODUCTION ANCHORING TO MINDTICKLE

Every phase MUST include specific references to the user's actual codebase and production environment. Not generic examples.

Format:
```
🏢 Mindtickle anchor — things to check in your codebase:

1. Open `missions-processors/config/config.go:42` — find where MskBrokers is set. 
   What client library does it use? Is there a MaxPollInterval set anywhere?

2. Search `devops-helm-charts/infra/team-int/workflow-events*/values-prod.yaml` 
   for groupInstanceId. Are they using static membership? If not, that's tech debt.

3. Open the AI review consumer processor — does it process synchronously in the 
   poll loop, or hand off to workers? What does that imply about rebalances?
```

This connects theory to THEIR reality. Without this, it's just another tutorial.

### Rule 0.7: MAKE EACH PHASE FEEL LIKE A SENIOR TEACHING SESSION

The generated content should read like you sat down with a staff engineer for 2 hours and they taught you everything about this topic. It should have:

- **Opening motivation** — Why this phase matters. What you'll be able to do after. What goes wrong if you skip this.
- **A roadmap** at the start showing what's covered (box diagram)
- **Deep inline explanations** — not just "the ISR shrinks" but EXACTLY what happens step by step with a timeline
- **Multiple diagrams PER concept** — before/after, timeline, architecture, data flow
- **"The three/five things to internalize"** — bullet points of what must stick
- **Scenarios that ONLY production teaches** — "Your consumer group rebalances every 6 min. The handler does an LLM call. Show the math."
- **Closing with checkpoint questions** that are SCENARIO-BASED using your systems — not generic "explain X" but "a customer reports duplicate events, what's happening?"

### Rule 1: SELF-CONTAINED

The generated material MUST be readable cold — without conversation context. This means:
- All theory is IN the document, not "to be delivered verbally"
- Every concept has its own section with diagrams
- A reader who opens the .md file 6 months from now understands everything
- No "as we discussed earlier" — the document IS the source of truth

### Rule 2: DEPTH CALIBRATION

Make me feel like I'm reading a STAFF ENGINEER's internal wiki, not a tutorial blog. Indicators of correct depth:
- Mentions specific byte sizes, timeout values, protocol versions where relevant
- Shows what happens at the WIRE PROTOCOL / SYSCALL level when illuminating
- Explains failure modes with exact error messages/codes the user will see
- Includes "what does this look like in logs/metrics/traces" where applicable
- References source code or design docs for "why it was built this way"
- Names the exact config keys (not "the timeout setting" but `max.poll.interval.ms=300000`)

### Rule 3: PROGRESSIVE COMPLEXITY within each section

Don't front-load difficulty. Structure WITHIN each concept:
1. **First pass** — the mental model (3 sentences + 1 diagram). If someone reads only this, they get the gist.
2. **Second pass** — the details (exact configs, edge cases, code example)
3. **Third pass** — the gotchas (what breaks, production war stories, "Try this now:" exercise)

### Rule 4: EVERY CONCEPT ENDS WITH ACTION

After explaining a concept, always end with one of:
- `**Try this now:** <specific command or code to run>`
- `**Verify your understanding:** <one question to answer in your head>`
- `**In your codebase:** Look at <specific file/pattern>`

Never leave a concept block as pure theory with no next step.

### Rule 5: INFRASTRUCTURE SETUP

If the topic requires local infra (database, broker, cluster, etc.):
- Include a docker-compose.yml or setup script
- Specify exact image versions, port mappings, volume mounts
- Verify commands: "run X, you should see Y"
- All exercises assume this infra is running

### Rule 6: GENERATE RUNNABLE CODE FILES (PRODUCTION-GRADE EXERCISES)

For EVERY phase, create actual runnable code that the user will execute to learn. This is NOT supplementary — the code IS the learning. Without running it, the theory is worthless.

**Quality bar for exercise code:**

Each Go file must be:
- **Self-contained** — `go run ./phase02_internals/idempotent_producer` works immediately
- **Production-grade** — NOT toy code. Real error handling, real patterns, real configs
- **Progressive** — Phase 1 code is simpler than Phase 3. By Phase 5, the user builds monitoring tools.
- **Commented with WHY** — not `// create writer` but `// acks=all ensures data survives broker crash`
- **Configurable via flags** — `-brokers`, `-topic`, `-count`, `-batch`, etc.
- **Includes expected output** — top comment says "You should see: ..."
- **Teaches ONE concept** — each file demonstrates exactly one thing from the theory

**What code to generate per phase:**

```
Phase 0: No code (framing only)

Phase 1: Basic producer + consumer (hello-world, partition routing, group behavior)
  - producer/main.go         → send messages with keys, observe partition routing
  - consumer/main.go         → consume in a group, see partition assignment
  
Phase 2: Internals exploration tools
  - idempotent_producer/main.go  → demonstrate dedup with sequence numbers
  - dedupe_consumer/main.go      → Redis-based idempotent consumer pattern
  - explore_storage.sh           → script to dump segments, indexes
  - leader_kill_test/main.go     → produce while killing brokers, verify zero loss

Phase 3: Tuning & benchmarks
  - benchmark_producer/main.go   → measure throughput with different batch/linger configs
  - compression_test/main.go     → compare snappy/lz4/zstd throughput + disk usage
  - backpressure_consumer/main.go → bounded worker pool, demonstrate lag under load
  - dlq_consumer/main.go         → dead-letter queue pattern with retry + poison pill handling
  - manual_commit/main.go        → at-least-once with explicit offset management

Phase 4: Ecosystem integration
  - stream_processor/main.go     → Go equivalent of Kafka Streams (consume-aggregate-produce)
  - schema_producer/main.go      → produce with schema validation (Avro/JSON Schema)
  - connect_setup/docker-compose.yml → Schema Registry + Connect cluster setup
  - mirror_test/docker-compose.yml   → 2-cluster MirrorMaker 2 setup

Phase 5: Production tooling
  - lag_monitor/main.go          → real-time consumer lag monitoring with alerting
  - partition_rebalancer/main.go → tool to reassign partitions across brokers
  - capacity_calculator/main.go  → calculate required partitions/brokers for a workload
  - health_checker/main.go       → check cluster health (ISR, under-replicated, controller)

Phase 6: Advanced patterns
  - outbox_relay/main.go         → outbox pattern: DB + outbox → relay → Kafka
  - saga_orchestrator/main.go    → saga pattern for distributed transactions
  - cdc_consumer/main.go         → CDC event processing (Debezium format)
  - event_sourcer/main.go        → event sourcing: append events, rebuild state
```

**File structure:**
```
/Users/raghvendradhakar/Desktop/code/verly/study-material/<topic>/code/
├── go.mod
├── docker-compose.yml                  (base infra)
├── docker-compose.cluster.yml          (multi-broker)
├── phase01_mental_model/
│   ├── producer/main.go
│   └── consumer/main.go
├── phase02_internals/
│   ├── idempotent_producer/main.go
│   ├── dedupe_consumer/main.go
│   ├── leader_kill_test/main.go
│   └── explore_storage.sh
├── phase03_tuning/
│   ├── benchmark_producer/main.go
│   ├── compression_test/main.go
│   ├── backpressure_consumer/main.go
│   ├── dlq_consumer/main.go
│   └── manual_commit/main.go
...
```

**The study material MUST reference these files directly:**
```
- [ ] **E5.** Run the backpressure consumer against a fast producer.
  - Start fast producer: `go run ./phase03_tuning/benchmark_producer -count=50000 -batch=1000`
  - Start slow consumer: `go run ./phase03_tuning/backpressure_consumer -concurrency=3 -process-time=500ms`
  - Watch lag grow: `kafka-consumer-groups.sh --describe --group backpressure-demo`
  - Expected: consumer processes at ~6 msg/s, lag grows until producer stops
  - Teaches: what happens when consumers can't keep up
```

**After generating code, save to DB:**

After writing the Go files, ALSO update the study material entry in the database with a note about which code files exist for this phase:

```bash
curl -X PATCH https://raghu-monitoring.vercel.app/api/study \
  -H "Content-Type: application/json" \
  -d '{"slug": "<phase-slug>", "progress": 0, "status": "unread"}'
```

This ensures the dashboard reflects that the phase has runnable exercises available.

---

## Quality bar — NON-NEGOTIABLE

### 1. Concept Blocks (3-5 paragraphs MAX per concept)
- Lead with WHY before WHAT
- If counterintuitive: "This surprises most people: ..."
- If common mistake: show WRONG way first, then RIGHT way
- End each concept with **The sentence to remember:** (one line)
- End with **The trap:** (the thing that will bite you)
- End with **Try this now:** or **Verify:** (action item)
- Use analogies to things from the user's stack (Go channels, gRPC deadlines, K8s probes, Redis TTL)

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
- Every temporal sequence → timeline with t=0, t=1, t=2...
- Every multi-component interaction → flow diagram with labels on arrows
- Every comparison → side-by-side diagram or table
- Every state change → before/after diagram

### 3. Code Examples
- Language: Go (or whatever is appropriate for the topic)
- Every example MUST be runnable (copy-paste-run)
- Top comment: WHAT it demonstrates + HOW to run it + WHAT YOU SHOULD SEE
- Show the PRODUCTION pattern, not the toy pattern
- Include error handling that matches real-world usage
- If a concept has "wrong" and "right" way, show WRONG first with `// WRONG:` comment, then RIGHT with `// RIGHT:` comment
- Include the exact error message you'd see if you run the wrong version

### 4. Exercises (7-12 per major section)
- Numbered: E1, E2, E3...
- Format:
  ```
  - [ ] **E1.** <what to do>
    - Run: `<exact command>`
    - Expected: <what you should see>
    - If it fails: <what went wrong and how to fix>
    - Teaches: <one concept>
  ```
- Each builds on the previous exercise
- Mix of: observation, build, break-it, debug
- At least 2 "break-it" exercises per section (kill a process, corrupt data, exhaust a resource)

### 5. Checkpoint Questions (5-7 per major section)
- Test UNDERSTANDING, not MEMORY
- Cannot be answered by copying docs
- Require synthesis across concepts
- Include at least one of each:
  - "Walk me through what happens when..." (trace a flow end-to-end)
  - "A colleague says X. Why are they wrong?" (argument with specific scenario)
  - "Given these requirements, design..." (architecture with constraints)
  - "This is broken: <symptoms>. What's wrong?" (debug from observable behavior)
  - "Show the math: given <params>, calculate <result>" (quantitative reasoning)

### 6. Production Anchors
- Tie concepts to real Mindtickle codebase when possible
- Ask the user to find patterns in their real code
- Format: "**Production anchor:** Look at `missions-processors/processors/` — find the consumer commit pattern. Is it before or after processing? What does that imply about duplicates?"

### 7. Comparison Tables (ALWAYS for alternatives)
```
┌────────────────┬───────────────┬───────────────┬───────────────┐
│                │   Option A    │   Option B    │   Option C    │
├────────────────┼───────────────┼───────────────┼───────────────┤
│ Throughput     │ 100K msg/s    │ 50K msg/s     │ 10K msg/s     │
│ Latency (p99)  │ 50ms          │ 10ms          │ 2ms           │
│ Ordering       │ Per-partition  │ Per-queue     │ Global        │
│ Replay         │ Yes (offset)  │ No            │ No            │
│ Use when       │ Event stream  │ Task queue    │ RPC           │
└────────────────┴───────────────┴───────────────┴───────────────┘
```
Include actual numbers where possible, not just "high/medium/low".

### 8. References & Further Learning (MANDATORY — curate the BEST)

For each topic, provide a curated learning path of the absolute best external resources. Not a link dump — each resource must have:
- WHY this specific resource (what makes it better than alternatives)
- WHAT to focus on (specific chapters, timestamps, sections)
- WHEN to consume it (before the exercises? after? as reinforcement?)

Format:
```
### References & Further Learning

**Must-read (do these):**
- 📄 [Title](url) — <why this is the best resource for X> (15 min read)
  - Focus on: sections 2-4. Skip the intro.
  - Read AFTER completing exercises E1-E5.

- 🎥 [Video Title](url) — <why this video specifically> (23 min)
  - Key timestamps: 4:30 (concept X explained visually), 12:00 (live demo of Y)
  - Watch BEFORE attempting E7.

- 📄 [Original Paper/RFC](url) — <the canonical source> (45 min)
  - You don't need to read all of it. Focus on: Section 3 (architecture), Section 5 (failure handling)
  - Read this AFTER you've done all exercises — it'll click differently.

**Deep dives (if you want more):**
- 🎥 [Conference Talk](url) — <speaker is the creator/maintainer of X> (40 min)
  - Best explanation of the internal architecture I've found anywhere.

- 📄 [Blog post](url) — <production war story from company Y> (10 min)
  - Real incident + postmortem. Shows what happens when you get config Z wrong.

- 📚 [Book: Chapter X](book name) — <the definitive reference> 
  - Only chapter X is relevant here. Rest is for Phase 5.

**YouTube channels/playlists for this domain:**
- [Channel Name](url) — <why this channel, what makes it special>
- [Specific Playlist](url) — <covers X to Y in Z videos>

**Official docs (bookmark these):**
- [Config reference](url) — the one page you'll keep open
- [Operations guide](url) — for when things break in prod

**Source code to read (advanced):**
- [specific file in GitHub](url) — <this is where X actually happens>
  - Read lines 200-350. This is the core algorithm.
```

Resource types to include:
- 📄 Articles/blog posts (prefer: engineering blogs from companies running at scale — Uber, LinkedIn, Cloudflare, Shopify)
- 🎥 YouTube videos (prefer: conference talks by creators/maintainers, NOT tutorial YouTubers)
- 📚 Books (specific chapters only — never "read this entire 600-page book")
- 📝 Original papers/RFCs (when the topic has a foundational paper)
- 💻 Source code (specific files/functions in the project's GitHub)
- 🎙️ Podcasts (only if there's a specific episode that's exceptional)

Quality rules for references:
- NEVER include generic "Introduction to X" articles — only include resources that teach something you CAN'T learn from the main material alone
- Prefer PRIMARY sources (the person who built it explaining it) over SECONDARY (someone else explaining it)
- Include at least one "war story" / incident postmortem per topic
- Include the original paper/design doc if the topic is famous enough to have one
- Every YouTube link must include key timestamps — don't make me watch 40 min to find the 3 min I need
- Every article must say which section to focus on
- Sort by: WHEN to read (before exercises vs after vs for deeper understanding)

### 9. Cheatsheet (at the end)
- All commands/configs/patterns covered
- Format: `what → command/config`
- Include the ONE formula to remember if applicable
- Fits on one screen — the quick-reference to keep open during work

---

## Content Structure (Per Phase)

Each phase should feel like a 2-hour senior engineer teaching session. Structure:

```
# Phase N — [Title] (the [adjective] phase)

[Opening paragraph: why this phase matters, what you'll be able to do after, 
what goes wrong in production if you skip this. Make it motivating.]

Time: X–Y weeks. Don't rush. The exercises are non-negotiable here.

## What we cover in Phase N:
┌─────────────────────────────────────────────────────────────────┐
│  N.1  [Topic A]        — [one-line what it covers]              │
│  N.2  [Topic B]        — [one-line]                             │
│  N.3  [Topic C]        — [one-line]                             │
│  N.4  [Topic D]        — [one-line]                             │
└─────────────────────────────────────────────────────────────────┘

---

## N.1 — [Topic A] (conversational subtitle)

[WHY this matters — 2-3 sentences connecting to production reality]

[DIAGRAM — inline, woven into the narrative, not a separate block]

[EXPLANATION — flowing paragraphs with inline emphasis, using "you" language.
 Multiple sub-concepts each with their own mini-diagram.]

[Code example — production-grade, with inline comments explaining WHY]

**The sentence to remember:** ...
**The trap:** ...
**Three things to internalize:** (bullet list)

---

## N.2 — [Topic B] (conversational subtitle)
[Same pattern... each section flows into the next]

---

## 🧪 Hands-on lab — the exercises that teach Phase N

[7-12 exercises, each with:]
- [ ] **E1.** [Description] 
  - Run: `exact command`
  - Watch: what to observe
  - Verify: how to confirm it worked
  - Teaches: one specific concept

---

## 🏢 Mindtickle anchor — things to check in the codebase

[2-4 specific file paths and questions connecting to their production code]

---

## ✅ Checkpoint N — answer in your own words

[5-7 scenario-based questions using THEIR systems:
 "Your consumer does an LLM call (25s). max.poll.records is default.
  Show the math. Propose two fixes."
 
 NOT generic: "Explain what a consumer group is."]

---

## References
[Curated best resources with timestamps and focus areas]

## Cheatsheet
[One-page quick reference]
```

**The key difference from documentation:** Every section starts with WHY it matters, uses narrative voice, weaves diagrams into the flow (not as separate blocks), and connects EVERY concept to the user's production reality at Mindtickle.

---

## How to save

### Step 1: Write to file system

Save the full material to:
`/Users/raghvendradhakar/Desktop/code/verly/study-material/<topic>/<slug>.md`

### Step 2: Save to database

```bash
curl -X POST https://raghu-monitoring.vercel.app/api/study \
  -H "Content-Type: application/json" \
  -d '{
    "title": "<Title>",
    "slug": "<kebab-case-slug>",
    "category": "<domain>",
    "difficulty": "<beginner|intermediate|advanced>",
    "estimatedMinutes": <reading time>,
    "tags": ["tag1", "tag2", "tag3"],
    "summary": "<2-3 sentence summary>",
    "content": "<FULL content>",
    "sections": [
      {"title": "Why does it exist?", "anchor": "why"},
      {"title": "Core Mental Model", "anchor": "mental-model"},
      {"title": "How it works internally", "anchor": "internals"},
      {"title": "Real-world patterns", "anchor": "patterns"},
      {"title": "Configuration & Tuning", "anchor": "tuning"},
      {"title": "Common pitfalls", "anchor": "pitfalls"},
      {"title": "When to use vs NOT use", "anchor": "when-to-use"},
      {"title": "Exercises", "anchor": "exercises"},
      {"title": "Checkpoint Questions", "anchor": "checkpoint"},
      {"title": "References & Further Learning", "anchor": "references"},
      {"title": "Cheatsheet", "anchor": "cheatsheet"}
    ],
    "source": "manual",
    "filePath": "/Users/raghvendradhakar/Desktop/code/verly/mentor-dashboard/study-materials/<slug>.md"
  }'
```

---

## DO vs DO NOT

### DO:
- Write in NARRATIVE voice — like a senior talking to you, NOT like documentation
- Start every section with WHY it matters to production
- Weave diagrams INTO the narrative flow (not separate "Diagram:" blocks)
- Use "you" language: "Here's where it gets interesting", "This is the part that'll bite you"
- Show MULTIPLE diagrams per concept (before/after, timeline, architecture)
- Every diagram must be CORRECT (numbers, sequences, states must make sense)
- Every code example must COMPILE and RUN
- Every explanation must answer "why does this matter in production?"
- Call out counterintuitive things: "This surprises most people:", "Critical fact:"
- Show wrong way first, then right way
- Use tables for ALL comparisons (with real numbers, not vague "high/low")
- Use timelines for ALL sequences (with t=0, t=1, t=2 format showing exact seconds)
- Include "the one sentence to remember" per concept
- Include "the trap to avoid" per concept  
- Include "Three things to internalize:" bullet list for complex concepts
- Include "try this now" per concept
- Include exact config names with defaults (`max.poll.interval.ms=300000`)
- Show the MATH when there's a formula (throughput = batch_size / linger_ms)
- Reference the actual error messages/exceptions you'll see when things fail
- Name patterns explicitly ("this is the Outbox Pattern", "this is fan-out")
- Include docker-compose or setup for anything that needs local infra
- Show what failure LOOKS like (logs, metrics, error output) not just describe it
- Connect EVERY major concept to Mindtickle's production code with specific file paths
- Use transitions between sections: "Now that you understand X, here's why Y matters..."
- Include "Internalize:" callouts for the core truths that everything builds on

### DO NOT:
- Don't write walls of text without diagrams (max 5 paragraphs before a diagram or code block)
- Don't give toy examples that wouldn't survive production
- Don't say "simply" or "just" or "easily"
- Don't skip the "why" — every config, every pattern has a reason
- Don't leave exercises vague — include exact commands and expected output
- Don't use placeholder code (// TODO) — every file must be complete
- Don't skip error cases — show what failure looks like
- Don't hand-wave gotchas ("be careful with X" → show EXACTLY what goes wrong)
- Don't write a Wikipedia article — write something that makes me DANGEROUS in production
- Don't describe what a thing IS without showing what it DOES (always show behavior)
- Don't separate theory from practice — every concept ends with an action
- Don't use "high/medium/low" in comparisons — use actual numbers or specific scenarios
- Don't assume I'll Google things — if a concept is needed, explain it here

---

## FULL EXAMPLE — THIS IS THE QUALITY BAR (match this EXACTLY)

```markdown
## 2.3 — Leader Election (what happens when a broker dies)

**First pass (mental model):**

When a partition's leader broker dies, another broker from the ISR takes over. Producers retry once and continue. Total downtime: ~2-5 seconds.

```
┌─────────────────────────────────────────────────────────────────────┐
│ Timeline: Leader failure + election                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  t=0s    broker-1 (leader P0) ──── alive, serving writes            │
│  t=0s    docker kill kafka-1                                        │
│  t=3s    controller misses heartbeat (session.timeout default=10s   │
│          but controller.heartbeat is faster)                        │
│  t=3-5s  controller elects broker-2 as new leader (from ISR)        │
│  t=5s    metadata propagated to all brokers                         │
│  t=5s    producer gets NotLeaderOrFollower (error code 6)           │
│  t=5s    producer refreshes metadata → finds broker-2               │
│  t=5.1s  producer resends to broker-2 → success                    │
│                                                                     │
│  Total write unavailability: ~2-5 seconds                           │
│  Messages lost: 0 (with acks=all + min.insync.replicas=2)           │
└─────────────────────────────────────────────────────────────────────┘
```

**Second pass (details):**

The controller (a broker elected via KRaft/ZK) monitors all brokers via heartbeats. When it detects a dead broker:
1. Removes it from ISR of all its partitions
2. For partitions where it was leader: picks new leader from remaining ISR
3. Publishes new metadata (LeaderAndIsr request) to all brokers
4. Brokers update their metadata cache
5. Producers/consumers refresh on next request failure

Config: `controller.quorum.election.timeout.ms` (KRaft) controls how fast the controller itself fails over. Default: 1000ms.

Error you'll see in producer logs:
```
kafka: [NotLeaderOrFollower] the client attempted to send to a replica 
that is not the leader for the given topic partition
```

**Third pass (the gotcha):**

**The sentence to remember:** Leader election is automatic, fast (~seconds), and invisible to producers that retry — your only job is acks=all + retries.

**The trap:** `unclean.leader.election.enable=true` lets an out-of-sync replica become leader after ALL in-sync replicas die — meaning ACKNOWLEDGED writes can be LOST. Default is false since Kafka 2.0. Never flip it unless you prefer availability over durability (metrics/logs topic maybe, never financial data).

**Try this now:**
```bash
# Find current leader of partition 0
docker exec kafka-1 kafka-topics.sh --bootstrap-server kafka-1:9092 \
  --describe --topic mission-events | grep "Partition: 0"

# Kill that broker (e.g., kafka-1)
docker kill kafka-1

# Immediately re-describe — watch new leader
docker exec kafka-2 kafka-topics.sh --bootstrap-server kafka-2:9092 \
  --describe --topic mission-events | grep "Partition: 0"
```
```

```markdown
- [ ] **E7.** Kill the leader broker for partition 0.
  - Run: `docker kill kafka-1` (replace with actual leader from --describe)
  - Expected: `--describe` shows new leader within 3-5 seconds. ISR shrinks by 1.
  - Run producer during kill: observe 1-2 log lines with retry, then continues normally.
  - Verify: consumer message count matches producer count (zero loss)
  - If it fails: check if `min.insync.replicas` > remaining ISR size — producer will block
  - Teaches: automatic failover with acks=all
```

```markdown
Q4. "We need exactly-once processing of mission submissions to grade them
in the LLM and store the result in MySQL." A junior engineer proposes Kafka 
transactions. 

(a) Why is that the wrong tool? (Hint: what boundary does a Kafka transaction cover?)
(b) What's the right pattern? Draw the flow including failure recovery.
(c) What happens if the LLM call succeeds but the DB write fails? How do you recover?
```

---

## GENERATION MODE — ONE PHASE AT A TIME, MAXIMUM DEPTH

**WHY:** Generating 7 phases at once = 10% effort per phase = tutorial-quality, not staff-engineer-quality. Generating ONE phase with 100% focus = the depth and quality of a 2-hour teaching session.

### How it works:

### Step 0: Check if course already exists (ALWAYS do this first)

```bash
curl -s "https://raghu-monitoring.vercel.app/api/courses?topic=<topic>"
```

- If it returns a course → read `currentPhase` to know where to resume. Skip outline, generate the next phase.
- If it returns null → this is a new course. Create outline first.

### Step 1: First invocation (`/study <topic>`) — Create outline

Design the full course outline and SAVE it to the DB:

```bash
curl -X POST https://raghu-monitoring.vercel.app/api/courses \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "<topic>",
    "title": "<Full Course Title>",
    "totalPhases": 7,
    "currentPhase": -1,
    "outline": [
      {"phase": 0, "title": "Frame the Problem", "subtitle": "...", "status": "pending", "estimatedMinutes": 30},
      {"phase": 1, "title": "Core Mental Model", "subtitle": "...", "status": "pending", "estimatedMinutes": 45},
      {"phase": 2, "title": "Internals", "subtitle": "...", "status": "pending", "estimatedMinutes": 60},
      {"phase": 3, "title": "Tuning & Optimization", "subtitle": "...", "status": "pending", "estimatedMinutes": 50},
      {"phase": 4, "title": "Ecosystem & Integration", "subtitle": "...", "status": "pending", "estimatedMinutes": 55},
      {"phase": 5, "title": "Production & Operations", "subtitle": "...", "status": "pending", "estimatedMinutes": 60},
      {"phase": 6, "title": "Senior Design", "subtitle": "...", "status": "pending", "estimatedMinutes": 65}
    ],
    "config": {
      "language": "Go",
      "codeDir": "/Users/raghvendradhakar/Desktop/code/verly/study-material/<topic>/code/",
      "materialDir": "/Users/raghvendradhakar/Desktop/code/verly/study-material/<topic>/"
    }
  }'
```

Tell user: "Outline saved. Say 'next' to generate Phase 0."

### Step 2: Each subsequent invocation (`next`)

1. **Query the course** to find `currentPhase`:
```bash
curl -s "https://raghu-monitoring.vercel.app/api/courses?topic=<topic>"
```

2. **Generate the NEXT phase** (currentPhase + 1) with 100% focus and depth
   - This single phase = 30-50KB of content
   - Every diagram, timeline, code block matters
   - Connect to Mindtickle codebase
   - Dedicate your ENTIRE response to this one phase

3. **Save the content file** to disk

4. **Save to study materials DB:**
```bash
curl -X POST https://raghu-monitoring.vercel.app/api/study \
  -H "Content-Type: application/json" \
  -d '{...phase content...}'
```

5. **Update course progress:**
```bash
curl -X PATCH https://raghu-monitoring.vercel.app/api/courses \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "<topic>",
    "currentPhase": <N>,
    "outline": [... update this phase status to "completed" ...]
  }'
```

6. Tell user: "Phase N done. Say 'next' for Phase N+1."

### Step 3: Resuming in a NEW session

When user says `/study kafka next` or just "continue kafka":
1. Query `GET /api/courses?topic=kafka`
2. Read `currentPhase` (e.g., 2 = Phase 0, 1, 2 are done)
3. Generate Phase 3 (currentPhase + 1)
4. Claude does NOT need conversation history — the DB tracks everything

This means: **no progress is ever lost between sessions.**

### Quality target per phase:
- 30-50 KB of content (not 20KB surface-level, not 80KB padded)
- 8-15 ASCII diagrams (inline, not separate blocks)
- 3-5 Go code examples (production-grade, runnable)
- 7-12 exercises (with exact commands and expected output)
- 5-7 checkpoint questions (scenario-based, using their systems)
- 2-4 Mindtickle production anchors (specific file paths)
- Curated references (web-searched, real URLs with timestamps)

### File output:
Save each phase to:
```
/Users/raghvendradhakar/Desktop/code/verly/study-material/<topic>/<topic>-phase-0N-<name>.md
```

Also save to DB via API.

### The rule: NEVER sacrifice depth for breadth.
One amazing phase > three mediocre phases. If generating one phase takes the full conversation, that's FINE. Quality over speed.

---

## USE WEB SEARCH FOR REFERENCES (MANDATORY)

Before writing the References section of each phase, you MUST use web search (WebFetch/WebSearch tools) to find:

1. **The BEST YouTube videos** for this specific topic/phase
   - Search: `"<topic> <concept>" site:youtube.com conference talk`
   - Search: `"<topic>" explained best video`
   - Find talks by the CREATORS/MAINTAINERS of the technology
   - Get exact video URLs + note key timestamps from descriptions

2. **The BEST articles/blog posts**
   - Search: `"<topic> internals" site:engineering.uber.com OR site:blog.cloudflare.com OR site:engineering.linkedin.com`
   - Search: `"<topic>" production lessons learned postmortem`
   - Search: `"<topic>" site:martinfowler.com OR site:jepsen.io`
   - Find war stories, incident reports, design decisions from top companies

3. **Original papers/design docs**
   - Search: `"<topic>" original paper OR design document`
   - Search: `"<topic>" RFC OR whitepaper`
   - Find the foundational document that started it all

4. **Best GitHub repos/source code to read**
   - Search: `"<topic>" source code walkthrough`
   - Find the specific files that implement the core algorithm

5. **Best books (specific chapters)**
   - Search: `best book for "<topic>" advanced`
   - Find the ONE definitive book and name the specific chapters

6. **Playlists and channels**
   - Search: `"<topic>" playlist youtube complete course`
   - Find systematic playlists, not random one-off videos

Every reference MUST be a real, working URL. Use web search to verify. Don't hallucinate links — if you can't find a specific resource, search for it.

---

## If called without a topic (`/study` alone)

Check the learning queue for high-priority pending items:
```bash
curl -s https://raghu-monitoring.vercel.app/api/learn?status=pending
```
Pick the highest priority item and generate the full course for it.

## If the server is not running

Still generate all the material and save the .md files. Tell the user: "Material saved to study-materials/. Start the dashboard (`npm run dev` in mentor-dashboard) to see it there too."
