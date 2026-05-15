# Kafka Consumer Groups — Deep Internals

## 1. Why do consumer groups exist?

A single consumer reading a 6-partition topic maxes out at one machine's throughput. You need parallelism. But if 3 consumers each read all 6 partitions, you get 3x duplicate processing. Consumer groups solve this: **N consumers share the work, each partition assigned to exactly one consumer in the group.**

This is Kafka's alternative to traditional pub/sub fanout. In RabbitMQ, you'd create competing consumers on a queue. In Kafka, the "queue" is a group — but unlike RabbitMQ, you get replay, ordering guarantees per partition, and no message deletion on consume.

**The sentence to remember:** A consumer group is a logical subscriber — Kafka guarantees each partition goes to exactly one member, giving you parallel processing with per-partition ordering.

**The trap:** If you have more consumers than partitions, the extras sit idle. 6 partitions + 8 consumers = 2 consumers doing nothing. Don't over-scale consumers without adding partitions.

---

## 2. Core Mental Model

### 2.1 — Assignment: who gets which partition?

```
Topic: mission-events (6 partitions: P0, P1, P2, P3, P4, P5)
Group: ai-review (3 consumers: C1, C2, C3)

┌─────────────────────────────────────────────────────────────────┐
│                     Group Coordinator                            │
│                (Broker elected for this group)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Assignment (Range strategy):                                   │
│                                                                 │
│    C1 ──► P0, P1                                                │
│    C2 ──► P2, P3                                                │
│    C3 ──► P4, P5                                                │
│                                                                 │
│  If C3 dies:                                                    │
│                                                                 │
│    C1 ──► P0, P1, P4     (took P4)                              │
│    C2 ──► P2, P3, P5     (took P5)                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 — The Group Coordinator

Every consumer group has exactly ONE broker acting as its coordinator. Which broker? Determined by hashing the group name:

```
coordinator_partition = hash(group.id) % __consumer_offsets partitions (50)
coordinator_broker    = leader of that partition
```

The coordinator handles:
- Member joins/leaves (JoinGroup, SyncGroup, LeaveGroup RPCs)
- Heartbeat monitoring (detecting dead consumers)
- Triggering rebalances
- Storing committed offsets (in __consumer_offsets topic)

**The sentence to remember:** The coordinator is just the broker that leads the `__consumer_offsets` partition your group hashes to — it's not special, just elected.

**The trap:** If the coordinator broker goes down, a new coordinator is elected (the new leader of that offset partition). This causes a brief unavailability — consumers retry until the new coordinator responds.

### 2.3 — Rebalance Protocol (the "stop-the-world" event)

```
Timeline of an Eager Rebalance (default before cooperative):

t=0    C3 crashes (misses heartbeat)
       │
t=10s  Coordinator detects C3 dead (session.timeout.ms = 10s)
       │
       ▼
t=10s  Coordinator marks group as "rebalancing"
       ├──► Sends REBALANCE_IN_PROGRESS to C1, C2
       │
t=10s  ALL consumers STOP processing, revoke ALL partitions
       │    ← THIS IS THE PROBLEM: even C1 and C2 stop reading P0-P3
       │
t=11s  C1 sends JoinGroup (with its subscriptions)
       C2 sends JoinGroup
       │
t=11s  Coordinator picks C1 as "leader" (first joiner)
       Sends all member subscriptions to C1
       │
t=11s  C1 runs assignment algorithm (range/roundrobin/sticky)
       C1 sends SyncGroup with the assignment
       │
t=11s  Coordinator distributes assignment to C1, C2
       │
t=12s  C1, C2 resume processing with new partition assignment
       │
       Total downtime: ~2 seconds (but can be 30-60s with slow consumers)
```

**The sentence to remember:** Eager rebalance = stop-the-world. ALL consumers pause, even the ones whose partitions didn't change.

**The trap:** If your consumer handler takes 25 seconds per message and `max.poll.interval.ms` is 300s (5 min), but you're processing 500 records per poll (`max.poll.records`=500): 500 × 25s = 12,500s >> 300s → consumer is kicked → rebalance → kicked again → infinite rebalance loop.

### 2.4 — Cooperative Sticky Rebalance (the fix)

```
Timeline of Cooperative Rebalance:

t=0    C3 crashes
       │
t=10s  Coordinator detects C3 dead
       │
       ▼
t=10s  Coordinator sends REBALANCE to C1, C2
       BUT: C1, C2 do NOT revoke their current partitions
       │
t=10s  C1 says: "I have P0,P1 and I'm happy to keep them"
       C2 says: "I have P2,P3 and I'm happy to keep them"
       │
t=11s  Leader (C1) assigns: C1→P0,P1,P4  C2→P2,P3,P5
       │
t=11s  C1 picks up P4 (new). C2 picks up P5 (new).
       Neither ever stopped reading P0-P3.
       │
       Downtime for P0-P3: ZERO
       Downtime for P4,P5: ~1 second (time to reassign)
```

**The sentence to remember:** Cooperative rebalance only revokes partitions that are actually moving. Everyone else keeps working.

**The trap:** Cooperative rebalance requires ALL consumers in the group to use it. One consumer on eager + others on cooperative = crash. You must roll it out atomically.

---

## 3. How it works internally — Offset Storage

When a consumer commits offsets, where do they go?

```
Consumer C1                    Coordinator Broker
┌──────────┐   OffsetCommit   ┌─────────────────────────────────┐
│ offset=  │   {P0: 1042,    │ __consumer_offsets               │
│   P0:1042├──────────────────►│ Partition 12 (for this group)   │
│   P1: 887│    P1: 887}     │                                  │
└──────────┘                  │ Log entry:                       │
                              │   key: (group, topic, partition) │
                              │   val: (offset, metadata, ts)    │
                              │                                  │
                              │ This is a COMPACTED topic —      │
                              │ only latest offset per key kept  │
                              └─────────────────────────────────┘
```

**The sentence to remember:** Offsets are stored in `__consumer_offsets` — a compacted internal topic. The coordinator is just the leader of the relevant partition.

**The trap:** If you never commit offsets (or commit too infrequently) and your consumer crashes, it will re-read from the last committed offset — potentially reprocessing hours of messages. Always commit after successful processing, not before.

---

## 4. Real-world patterns

### Pattern 1: Manual commit after DB write (at-least-once)

```go
// WRONG: auto-commit (messages marked "done" before actually processed)
reader := kafka.NewReader(kafka.ReaderConfig{
    GroupID:           "ai-review",
    CommitInterval:    time.Second, // ← commits every second regardless
})

// RIGHT: manual commit after successful processing
reader := kafka.NewReader(kafka.ReaderConfig{
    GroupID:           "ai-review",
    CommitInterval:    0, // ← disable auto-commit
})

for {
    msg, err := reader.FetchMessage(ctx)
    if err != nil { break }
    
    // Process first
    if err := processAndWriteToDB(msg); err != nil {
        log.Error("processing failed", "err", err, "offset", msg.Offset)
        continue // don't commit — will retry on next fetch
    }
    
    // Commit only after success
    if err := reader.CommitMessages(ctx, msg); err != nil {
        log.Error("commit failed", "err", err)
        // Message will be re-delivered — your handler must be idempotent
    }
}
```

### Pattern 2: Static membership (avoid rebalances on deploys)

```go
// Without static membership: every deploy → consumer leaves → rebalance → rejoin
// With K8s rolling deploys of 5 pods: 5 rebalances in 5 minutes

// With static membership:
reader := kafka.NewReader(kafka.ReaderConfig{
    GroupID:         "ai-review",
    GroupInstanceID: os.Getenv("POD_NAME"), // ← e.g. "ai-review-0", "ai-review-1"
    SessionTimeout:  30 * time.Second,       // ← consumer has 30s to come back
})

// Now: pod restarts within 30s → NO rebalance (same instance ID reclaims partitions)
// Helm values.yaml: set terminationGracePeriodSeconds < session.timeout
```

### Pattern 3: Handling slow processing (LLM calls)

```go
// Problem: LLM calls take 25s. max.poll.interval.ms=300s (default).
// max.poll.records=500 (default). 500 × 25s = 12,500s >> 300s → kicked.

// Fix 1: Reduce max.poll.records
reader := kafka.NewReader(kafka.ReaderConfig{
    GroupID:        "ai-review",
    MaxPollRecords: 5, // ← process 5 at a time, not 500
})
// 5 × 25s = 125s < 300s → safe

// Fix 2: Process async with bounded concurrency
sem := make(chan struct{}, 10) // 10 concurrent LLM calls
for {
    msg, _ := reader.FetchMessage(ctx)
    sem <- struct{}{} // acquire
    go func(m kafka.Message) {
        defer func() { <-sem }() // release
        processLLM(m)
        reader.CommitMessages(ctx, m)
    }(msg)
}
// Warning: out-of-order commits. Only safe if idempotent processing.
```

---

## 5. Configuration & Tuning

| Config | Default | What it controls | Tune when |
|--------|---------|-----------------|-----------|
| `session.timeout.ms` | 10s | How long before dead consumer detected | Increase if GC pauses cause false kicks |
| `heartbeat.interval.ms` | 3s | How often consumer pings coordinator | Always keep < session.timeout/3 |
| `max.poll.interval.ms` | 300s (5min) | Max time between polls before kick | Increase if processing is slow |
| `max.poll.records` | 500 | Messages returned per poll | Decrease if per-message processing is slow |
| `partition.assignment.strategy` | range | How partitions are distributed | Use cooperative-sticky for zero-downtime deploys |
| `group.instance.id` | null | Static membership ID | Set in K8s to avoid rebalance on rolling deploy |
| `auto.offset.reset` | latest | Where to start if no committed offset | Use earliest for new groups that need history |

### The math you must do:

```
max_processing_time = max.poll.records × per_message_time
MUST BE < max.poll.interval.ms

Example:
  max.poll.records = 500
  per_message_time = 25s (LLM call)
  500 × 25s = 12,500s = 208 minutes >> 5 minutes
  
  RESULT: consumer kicked every 5 minutes, infinite rebalance
  
  FIX: set max.poll.records = 10 → 10 × 25s = 250s < 300s ✓
```

---

## 6. Common pitfalls

### Pitfall 1: The rebalance storm

```
┌─────────────────────────────────────────────────────────────────┐
│  What happens:                                                  │
│                                                                 │
│  1. Consumer slow → exceeds max.poll.interval.ms → kicked       │
│  2. Rebalance assigns its partitions to others                  │
│  3. Others now have MORE work → THEY get slow                   │
│  4. They exceed max.poll.interval.ms → kicked                   │
│  5. Cascade: eventually 1 consumer has all partitions → dies    │
│  6. Group is effectively dead. Lag grows to infinity.           │
│                                                                 │
│  Fix: max.poll.records × processing_time < max.poll.interval    │
└─────────────────────────────────────────────────────────────────┘
```

### Pitfall 2: Committing before processing

```go
// WRONG — lost messages on crash:
msg, _ := reader.ReadMessage(ctx) // ← auto-commits on read!
processSlowly(msg) // ← crash here = message lost forever

// RIGHT — at-least-once:
msg, _ := reader.FetchMessage(ctx) // ← does NOT auto-commit
processSlowly(msg)
reader.CommitMessages(ctx, msg) // ← explicit commit after success
```

### Pitfall 3: Too many consumers

```
6 partitions, 8 consumers in the group:

C1 → P0    C5 → (idle)
C2 → P1    C6 → (idle)
C3 → P2    C7 → (idle — error in your scaling logic)
C4 → P3    C8 → (idle)
C5 → P4
C6 → P5

Wasted resources. HPA scaling consumers beyond partition count = waste.
Rule: max consumers in a group = number of partitions.
```

---

## 7. When to use consumer groups vs alternatives

| Use case | Consumer Group | Individual Consumer | Kafka Streams |
|----------|---------------|--------------------:|:-------------:|
| Simple parallel processing | Yes | No | Overkill |
| Need all messages (audit) | Separate group | Yes | No |
| Stateful aggregation | Awkward | No | Yes |
| Exactly-once processing | Manual (idempotent handler) | Manual | Built-in |
| Low latency (<10ms) | Possible with tuning | Better | Overhead |
| Need replay from offset X | Yes (reset offsets) | Yes | Yes |

---

## 8. Exercises

- [ ] **E1.** Start 3 consumers in group `ai-review` on a 6-partition topic. Confirm each gets exactly 2 partitions. Use `kafka-consumer-groups.sh --describe` to verify assignment.
  - Expected: 6 partitions split evenly, 2 per consumer

- [ ] **E2.** Kill one consumer (Ctrl+C). Time how long until the other two pick up the dead consumer's partitions. Note: this is the rebalance duration.
  - Expected: ~10-15 seconds with default settings
  - Teaches: session.timeout.ms determines detection speed

- [ ] **E3.** Add `group.instance.id` to all consumers (e.g., "c1", "c2", "c3"). Kill one and restart within 5 seconds. Confirm NO rebalance occurs.
  - Expected: same consumer reclaims its partitions silently
  - Teaches: static membership avoids rebalance on restarts

- [ ] **E4.** Set `max.poll.records=2` and add a `time.Sleep(3*time.Second)` per message. Calculate: does this exceed `max.poll.interval.ms`? Verify by observing whether the consumer gets kicked.
  - Expected: 2 × 3s = 6s per poll. Default max.poll.interval = 300s. Safe.
  - Teaches: the math behind poll timing

- [ ] **E5.** Now set `max.poll.records=200` with the same 3s sleep. Predict what happens. Run it. Watch the rebalance storm.
  - Expected: 200 × 3s = 600s > 300s → consumer kicked → rebalance → repeat
  - Teaches: why max.poll.records matters for slow handlers

- [ ] **E6.** Switch from `ReadMessage` (auto-commit) to `FetchMessage` + manual `CommitMessages`. Kill the consumer mid-processing. Restart. Confirm the uncommitted message is re-delivered.
  - Expected: message re-delivered after restart
  - Teaches: at-least-once semantics via manual commit

- [ ] **E7.** Run `kafka-consumer-groups.sh --describe --group ai-review`. Identify: current-offset, log-end-offset, lag per partition. Create lag by pausing consumers, observe numbers grow.
  - Expected: lag = log-end-offset - current-offset
  - Teaches: monitoring consumer health

- [ ] **E8.** Reset offsets to earliest: `--reset-offsets --to-earliest --execute`. Restart consumers. Confirm they replay ALL messages from partition beginning.
  - Expected: all historical messages re-consumed
  - Teaches: offset manipulation for replay/recovery

---

## 9. Checkpoint Questions

**Q1.** Your consumer group has 6 consumers and 6 partitions. You deploy a new version with rolling restart (one pod at a time, 30s between). Using eager rebalance, how many rebalances happen? How long is total processing downtime? Now answer the same for cooperative-sticky with `group.instance.id` set and `session.timeout.ms=45s`.

**Q2.** A consumer commits offset 1000, then crashes while processing offset 1001. On restart, what offset does it receive? What does this imply about your handler's requirements?

**Q3.** `__consumer_offsets` is a compacted topic with 50 partitions. You have 200 consumer groups. Explain: how does Kafka decide which partition stores which group's offsets? What happens if the broker hosting partition 12 dies?

**Q4.** Your consumer calls an LLM API (avg 20s response). `max.poll.records=100`, `max.poll.interval.ms=300000`. Show the math. Will this work? What are two ways to fix it without increasing `max.poll.interval.ms`?

**Q5.** A teammate says: "We should set `session.timeout.ms=60s` to avoid false rebalances during GC." What's the downside of this? When IS it the right call?

---

## 10. Cheatsheet

```
Describe group assignment    → kafka-consumer-groups.sh --describe --group <name>
List all groups              → kafka-consumer-groups.sh --list
Reset to earliest            → kafka-consumer-groups.sh --reset-offsets --to-earliest --topic <t> --group <g> --execute
Reset to timestamp           → --to-datetime 2024-01-15T00:00:00.000
Reset to offset              → --to-offset <n>
Delete group                 → kafka-consumer-groups.sh --delete --group <name>
Find coordinator             → kafka-consumer-groups.sh --describe --group <name> (shows coordinator in output)

session.timeout.ms           → How fast dead consumer detected (default: 10s)
heartbeat.interval.ms        → Heartbeat frequency (keep < session.timeout/3)
max.poll.interval.ms         → Max time between polls (default: 300s/5min)
max.poll.records             → Messages per poll (default: 500)
partition.assignment.strategy → range | roundrobin | cooperative-sticky
group.instance.id            → Set for static membership (K8s pod name)
auto.offset.reset            → earliest | latest (for new groups)

THE FORMULA: max.poll.records × per_msg_time < max.poll.interval.ms
```
