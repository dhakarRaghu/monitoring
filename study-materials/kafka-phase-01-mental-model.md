# Kafka — Phase 1: Core Mental Model

## 1. The 5 concepts you must understand

Everything in Kafka is built from 5 primitives. Master these and every advanced topic is just a combination.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         KAFKA'S 5 BUILDING BLOCKS                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. TOPIC        — A named stream of related events (like a DB table name) │
│  2. PARTITION    — A topic split into N ordered shards (parallelism unit)   │
│  3. OFFSET       — Each message's position number within a partition        │
│  4. PRODUCER     — Writes messages to topics                                │
│  5. CONSUMER GROUP — Multiple consumers sharing partition assignments       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Topics & Partitions

**First pass (mental model):**

A topic is a named category of messages (like `mission-events` or `coaching-completed`). But a topic isn't a single log — it's split into partitions. Each partition is an independent ordered log living on a specific broker. Partitions are how Kafka achieves parallelism and horizontal scaling.

```
Topic: mission-events (3 partitions)

Broker 1              Broker 2              Broker 3
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│   Partition 0    │   │   Partition 1    │   │   Partition 2    │
│                  │   │                  │   │                  │
│ [0][1][2][3][4]  │   │ [0][1][2][3]    │   │ [0][1][2][3][4][5]│
│              ▲   │   │            ▲    │   │                ▲  │
│              │   │   │            │    │   │                │  │
│         write ptr│   │       write ptr │   │           write ptr│
└─────────────────┘   └─────────────────┘   └─────────────────┘

Key rules:
- Messages within a partition are STRICTLY ordered
- Messages ACROSS partitions have NO ordering guarantee
- Each partition lives on exactly ONE broker (leader)
- A partition is the unit of parallelism — 1 consumer per partition max
```

**Second pass (details):**

How does a message end up in a specific partition?

```
Producer sends message with key="user-123"

  hash(key) % num_partitions = partition number
  
  murmur2("user-123") % 3 = 1  →  goes to Partition 1
  murmur2("user-456") % 3 = 0  →  goes to Partition 0
  murmur2("user-789") % 3 = 2  →  goes to Partition 2

  SAME key = SAME partition = SAME order (always)
  
  If key is nil/null:
    Round-robin across partitions (sticky batching in newer clients)
    → No ordering guarantee for nil-key messages
```

This matters for Mindtickle: all events for the same user should have the same key (user ID) so they arrive in order. If mission-submitted and mission-graded have the same user key, they'll be in the same partition, and the consumer will see them in order.

**Third pass (the gotcha):**

**The sentence to remember:** Same key → same partition → guaranteed order. Different keys → different partitions → no order guarantee between them.

**The trap:** Once you create a topic with N partitions, changing N (adding partitions) breaks key→partition mapping. Messages with the same key will suddenly go to different partitions. Never add partitions to a topic that relies on key ordering in production. Plan partition count upfront.

**Try this now:**
```bash
# Create a topic with 3 partitions
docker exec kafka-learn kafka-topics.sh --bootstrap-server localhost:9092 \
  --create --topic test-keys --partitions 3 --replication-factor 1

# Send messages with keys and observe which partition they land in
echo "key1:value1" | docker exec -i kafka-learn kafka-console-producer.sh \
  --bootstrap-server localhost:9092 --topic test-keys \
  --property "parse.key=true" --property "key.separator=:"
```

---

## 3. Offsets — your position in the log

**First pass (mental model):**

Every message in a partition gets a sequential number: 0, 1, 2, 3... This is the offset. It's monotonically increasing, never reused, never goes backwards. A consumer's position is just "what offset am I at?"

```
Partition 0:

  offset: 0    1    2    3    4    5    6    7    8    9
        ┌────┬────┬────┬────┬────┬────┬────┬────┬────┬────┐
        │ m0 │ m1 │ m2 │ m3 │ m4 │ m5 │ m6 │ m7 │ m8 │ m9 │
        └────┴────┴────┴────┴────┴────┴────┴────┴────┴────┘
                              ▲                        ▲
                              │                        │
                    Consumer A (offset 3)    Consumer B (offset 8)
                    
  Consumer A is "behind" — it will read m3, m4, m5... catching up
  Consumer B is "almost caught up" — only 1 message of lag
  
  LAG = latest_offset - consumer_offset = how far behind you are
  Consumer A lag = 9 - 3 = 6 messages behind
  Consumer B lag = 9 - 8 = 1 message behind
```

**Second pass (details):**

Offsets are PER-PARTITION. Consumer A might be at offset 100 in partition 0, offset 50 in partition 1, offset 200 in partition 2. The committed offset (stored in `__consumer_offsets` topic) tells Kafka: "if this consumer crashes, resume from here."

Two special offsets:
- `earliest` — offset 0 (start from the very beginning)
- `latest` — the current end of the log (only see new messages from now)

When a NEW consumer group starts reading a topic for the first time, `auto.offset.reset` decides where to start: `earliest` (replay everything) or `latest` (skip history).

**The sentence to remember:** Offset = your bookmark in the log. Commit it = save your place. Crash before commit = re-read from last saved place.

**The trap:** If `auto.offset.reset=latest` (the default) and your consumer group is new, it will MISS all existing messages. For a new consumer that needs historical data, you MUST set `auto.offset.reset=earliest` on first run.

**Verify your understanding:** Consumer group "ai-review" is at offset 500 in partition 0. The topic has messages up to offset 1000. You deploy a new service with group "audit-logger" that needs all historical data. What config do you set? (Answer: `auto.offset.reset=earliest`. The new group has no committed offset, so it'll start from 0.)

---

## 4. Producers — writing to Kafka

**First pass (mental model):**

A producer is just a client that appends messages to a topic. It decides which partition (via key hash or round-robin), batches messages for efficiency, and waits for acknowledgment.

```
Producer (your Go service)
┌───────────────────────────────────────────────────────────┐
│                                                           │
│  1. Serialize message (key + value + headers)             │
│  2. Determine partition:                                  │
│     - key != nil → hash(key) % partitions                │
│     - key == nil → round-robin / sticky batch            │
│  3. Batch messages destined for same partition            │
│  4. Send batch to partition leader broker                 │
│  5. Wait for ack (depending on acks setting)             │
│                                                           │
│     acks=0: don't wait (fire & forget, may lose data)    │
│     acks=1: wait for leader write (may lose on crash)    │
│     acks=all: wait for ALL replicas (no data loss)       │
│                                                           │
└───────────────────────────────────────────────────────────┘
         │
         │ batch of messages
         ▼
┌─────────────────┐
│ Broker (Leader)  │
│ Partition 0      │ → appends to log → replicates to followers
└─────────────────┘
```

**Second pass — Go code (production pattern):**

```go
// producer.go — Production-grade Kafka producer
// Run: go run producer.go -brokers=localhost:19092 -topic=mission-events -count=100
package main

import (
    "context"
    "flag"
    "fmt"
    "log"
    "time"

    "github.com/segmentio/kafka-go"
)

func main() {
    brokers := flag.String("brokers", "localhost:19092", "comma-separated broker addresses")
    topic := flag.String("topic", "mission-events", "topic to produce to")
    count := flag.Int("count", 100, "number of messages to send")
    flag.Parse()

    // RIGHT: production config with batching and acks=all
    w := &kafka.Writer{
        Addr:         kafka.TCP(*brokers),
        Topic:        *topic,
        Balancer:     &kafka.Hash{}, // key-based partitioning
        BatchSize:    100,           // batch up to 100 messages
        BatchTimeout: 10 * time.Millisecond, // or flush every 10ms
        RequiredAcks: kafka.RequireAll,      // acks=all (no data loss)
        Async:        false,                  // synchronous for reliability
    }
    defer w.Close()

    for i := 0; i < *count; i++ {
        key := fmt.Sprintf("user-%d", i%10) // 10 unique keys
        err := w.WriteMessages(context.Background(), kafka.Message{
            Key:   []byte(key),
            Value: []byte(fmt.Sprintf(`{"event":"mission_submitted","user":"%s","ts":%d}`, key, time.Now().UnixMilli())),
        })
        if err != nil {
            log.Fatalf("write failed: %v", err) // In prod: retry with backoff
        }
    }
    fmt.Printf("Sent %d messages to %s\n", *count, *topic)
}
```

**The sentence to remember:** A producer batches messages by destination partition, sends to the partition leader, and waits for the ack level you configured. `acks=all` = no data loss. `acks=0` = maximum speed, possible loss.

**The trap:** Using `Async: true` in kafka-go means `WriteMessages` returns immediately without waiting for the broker ack. If your process crashes between the return and the actual send, those messages are lost. Use `Async: false` for any data you can't afford to lose.

---

## 5. Consumer Groups — reading from Kafka in parallel

**First pass (mental model):**

A consumer group is N consumers that SHARE the work of reading a topic. Kafka assigns each partition to exactly one consumer in the group. If you have 6 partitions and 3 consumers, each consumer gets 2 partitions.

```
Topic: mission-events (6 partitions)
Consumer Group: "ai-review" (3 consumers)

┌──────────────────────────────────────────────────────────┐
│                    PARTITION ASSIGNMENT                    │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Consumer 1 (pod-0) ──► P0, P1   (reads both in order)  │
│  Consumer 2 (pod-1) ──► P2, P3                           │
│  Consumer 3 (pod-2) ──► P4, P5                           │
│                                                          │
│  Rule: 1 partition → exactly 1 consumer (never shared)   │
│  Rule: 1 consumer → can handle multiple partitions       │
│  Rule: max useful consumers = number of partitions       │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  If Consumer 3 dies:                                     │
│                                                          │
│  Consumer 1 ──► P0, P1, P4   (REBALANCE: took P4)       │
│  Consumer 2 ──► P2, P3, P5   (REBALANCE: took P5)       │
│                                                          │
│  Processing pauses briefly during rebalance (~5-10s)     │
└──────────────────────────────────────────────────────────┘
```

**Second pass — two groups reading the SAME topic:**

```
Topic: mission-events (6 partitions)

Group "ai-review" (3 consumers):        Group "audit-log" (2 consumers):
  C1 → P0, P1                              A1 → P0, P1, P2
  C2 → P2, P3                              A2 → P3, P4, P5
  C3 → P4, P5

BOTH groups see ALL messages.
Each group tracks its own offsets independently.
Group "ai-review" can be at offset 1000 while "audit-log" is at offset 500.

This is how you get multi-consumer without duplication:
- Same group = messages split (parallel processing)
- Different groups = messages duplicated (independent readers)
```

**Third pass — Go code (production consumer):**

```go
// consumer.go — Production-grade Kafka consumer with manual commit
// Run: go run consumer.go -brokers=localhost:19092 -topic=mission-events -group=ai-review
package main

import (
    "context"
    "flag"
    "fmt"
    "log"
    "os"
    "os/signal"
    "time"

    "github.com/segmentio/kafka-go"
)

func main() {
    brokers := flag.String("brokers", "localhost:19092", "broker addresses")
    topic := flag.String("topic", "mission-events", "topic to consume")
    group := flag.String("group", "ai-review", "consumer group ID")
    flag.Parse()

    r := kafka.NewReader(kafka.ReaderConfig{
        Brokers:        []string{*brokers},
        Topic:          *topic,
        GroupID:        *group,
        MinBytes:       1,                    // fetch even 1 byte
        MaxBytes:       10e6,                 // 10MB max per fetch
        CommitInterval: 0,                    // DISABLE auto-commit
        StartOffset:    kafka.FirstOffset,    // earliest if no committed offset
    })
    defer r.Close()

    ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt)
    defer cancel()

    fmt.Printf("Consumer started: group=%s topic=%s\n", *group, *topic)

    for {
        // FetchMessage does NOT auto-commit (unlike ReadMessage)
        msg, err := r.FetchMessage(ctx)
        if err != nil {
            if ctx.Err() != nil {
                break // graceful shutdown
            }
            log.Printf("fetch error: %v", err)
            continue
        }

        // Process the message (your business logic)
        fmt.Printf("P%d offset=%d key=%s value=%s\n",
            msg.Partition, msg.Offset, string(msg.Key), string(msg.Value))

        // Simulate processing time
        time.Sleep(10 * time.Millisecond)

        // Commit AFTER successful processing (at-least-once)
        if err := r.CommitMessages(ctx, msg); err != nil {
            log.Printf("commit failed: %v", err)
        }
    }
    fmt.Println("Consumer stopped gracefully")
}
```

**The sentence to remember:** Same group = split the work (each partition to one consumer). Different group = independent copy (each group sees all messages). Max consumers in a group = number of partitions.

**The trap:** `ReadMessage()` in kafka-go auto-commits the offset BEFORE you process it. If you crash during processing, that message is LOST. Always use `FetchMessage()` + manual `CommitMessages()` for at-least-once delivery.

---

## 6. Putting it all together — the complete flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    COMPLETE KAFKA DATA FLOW                                │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  PRODUCER (missions-service)                                             │
│  ┌─────────────────────────┐                                            │
│  │ Event: mission_submitted │                                            │
│  │ Key: "user-123"          │                                            │
│  │ Value: {json payload}    │                                            │
│  └───────────┬─────────────┘                                            │
│              │                                                           │
│              │ hash("user-123") % 6 = partition 2                        │
│              ▼                                                           │
│  KAFKA CLUSTER (3 brokers, topic: mission-events, 6 partitions, RF=3)   │
│  ┌─────────────────────────────────────────────────────────────┐        │
│  │  Broker1: P0(L), P1(F), P2(F), P3(L), P4(F), P5(F)        │        │
│  │  Broker2: P0(F), P1(L), P2(L), P3(F), P4(F), P5(L)        │        │
│  │  Broker3: P0(F), P1(F), P2(F), P3(F), P4(L), P5(F)        │        │
│  │                                                              │        │
│  │  L=Leader (handles reads/writes)  F=Follower (replicates)   │        │
│  │  Message lands on P2 Leader (Broker2) → replicated to F     │        │
│  └─────────────────────────────────────────────────────────────┘        │
│              │                                                           │
│         ┌────┴────────────────────┐                                     │
│         ▼                         ▼                                      │
│  GROUP "ai-review"          GROUP "audit-log"                            │
│  (3 consumers)              (1 consumer)                                 │
│  ┌──────────┐               ┌──────────────┐                            │
│  │C1: P0,P1 │               │A1: P0,P1,P2, │                            │
│  │C2: P2,P3 │◄─ C2 gets it  │    P3,P4,P5  │◄─ A1 also gets it         │
│  │C3: P4,P5 │               └──────────────┘                            │
│  └──────────┘                                                           │
│                                                                          │
│  Both groups read the SAME message independently.                        │
│  Each tracks its own offset in __consumer_offsets.                        │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Exercises

### Setup
```bash
cd ~/Desktop/project/mindtickle/kafka-learning
docker compose up -d
# Create topic
docker exec kafka-learn kafka-topics.sh --bootstrap-server localhost:9092 \
  --create --topic mission-events --partitions 6 --replication-factor 1
go mod tidy
```

- [ ] **E1.** Run the producer with `-count=1000 -keys=10`. Check kafka-ui (localhost:8080): confirm 1000 messages distributed across 6 partitions. Note which keys land in which partition.
  - Expected: ~166 messages per partition (not perfectly even — depends on hash)
  - Teaches: key-based partitioning

- [ ] **E2.** Run 2 consumers with `-group=ai-review`. Confirm each gets different partitions (3 each). Kill one — watch the other pick up all 6 partitions.
  - Expected: first consumer gets P0,P1,P2. Second gets P3,P4,P5. After kill, survivor gets all 6.
  - Teaches: consumer group partition assignment + rebalance

- [ ] **E3.** Run a consumer with `-group=audit-log`. Confirm it receives ALL 1000 messages from offset 0 (independent of the ai-review group).
  - Expected: all 1000 messages from the beginning
  - Teaches: different groups are independent readers

- [ ] **E4.** Run producer with `-keys=0` (nil keys). Watch messages spread round-robin across all partitions instead of clustering by key.
  - Expected: roughly even distribution across all 6 partitions
  - Teaches: nil key = no ordering guarantee

- [ ] **E5.** Kill one consumer in `ai-review`. Use `kafka-consumer-groups.sh --describe --group ai-review` to watch the rebalance. Time how long partitions are unassigned.
  - Run: `docker exec kafka-learn kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe --group ai-review`
  - Expected: ~10-15s until rebalance completes
  - Teaches: rebalance cost

- [ ] **E6.** With consumer stopped, produce 500 more messages. Check lag with `--describe`. Restart consumer. Watch lag drop to 0.
  - Expected: lag = 500 initially, drops to 0 as consumer catches up
  - Teaches: consumer lag monitoring

- [ ] **E7.** Reset offset to earliest: `kafka-consumer-groups.sh --reset-offsets --to-earliest --topic mission-events --group ai-review --execute` (group must be stopped). Restart consumer — it replays everything.
  - Expected: consumer re-reads all messages from offset 0
  - Teaches: offset manipulation for replay/reprocessing

---

## 8. Checkpoint Questions

**Q1.** You have a topic with 6 partitions and a consumer group with 8 consumers. How many consumers are idle? What would you do to utilize all 8?

**Q2.** Producer sends events: `mission-submitted` (key=user-123), then `mission-graded` (key=user-123). Can you guarantee the consumer sees `submitted` before `graded`? Why or why not? What if the keys were different?

**Q3.** Two consumer groups read `mission-events`: group "grading" (processes missions) and group "analytics" (counts completions). Grading is at offset 1000, analytics is at offset 500. Does grading's progress affect analytics? Why?

**Q4.** Your consumer uses `ReadMessage()` (auto-commit). It reads a message, starts an LLM call that takes 30 seconds, then crashes at second 15. What happens to that message? Now answer for `FetchMessage()` + manual commit.

**Q5.** You need to add a new service that needs all historical `mission-events` from the last 3 months. What consumer group config gets you the full history? What happens if you accidentally use the default?

---

## 9. References & Further Learning

**Must-read:**
- 📄 [Kafka Documentation: Design](https://kafka.apache.org/documentation/#design) — Official design docs. Focus on: "Persistence" and "The Producer" sections. (20 min)
  - Read AFTER doing exercises E1-E4.

- 🎥 [Apache Kafka in 6 Minutes — Tim Berglund](https://www.youtube.com/watch?v=PzPXRmVHMxI) — Fastest accurate overview of topics/partitions/groups. (6 min)
  - Watch BEFORE the exercises — visual reinforcement of the mental model.

**Deep dives:**
- 🎥 [How Kafka Handles Millions of Messages Per Second — Confluent](https://www.youtube.com/watch?v=UEg40Te8pnE) — Why Kafka is fast: sequential I/O, zero-copy, batching. (25 min)
  - Watch AFTER Phase 1 complete. Prepares you for Phase 2 internals.

- 📄 [Kafka: The Definitive Guide, Chapter 3: Kafka Producers](https://www.oreilly.com/library/view/kafka-the-definitive/9781492043072/) — O'Reilly book, chapter on producer internals. Best explanation of batching, acks, retries.
  - Read chapter 3 and 4 only. Skip the rest until Phase 3.

**Official docs (bookmark):**
- [Topic Configuration](https://kafka.apache.org/documentation/#topicconfigs) — Every topic-level config explained

---

## 10. Cheatsheet

```
CREATE TOPIC:
  kafka-topics.sh --create --topic <name> --partitions <N> --replication-factor <RF>

DESCRIBE TOPIC:
  kafka-topics.sh --describe --topic <name>

LIST TOPICS:
  kafka-topics.sh --list

PRODUCE (CLI):
  kafka-console-producer.sh --topic <name> --property "parse.key=true" --property "key.separator=:"

CONSUME (CLI):
  kafka-console-consumer.sh --topic <name> --from-beginning --group <group>

CONSUMER GROUP STATUS:
  kafka-consumer-groups.sh --describe --group <name>

RESET OFFSETS:
  kafka-consumer-groups.sh --reset-offsets --to-earliest --topic <t> --group <g> --execute

KEY CONCEPTS:
  same key         → same partition → ordered
  nil key          → round-robin → no order guarantee
  same group       → split work (parallel)
  different group  → independent copy
  max consumers    = number of partitions
  lag              = end_offset - committed_offset
  FetchMessage     → manual commit (safe)
  ReadMessage      → auto-commit (dangerous)
  
PRODUCER CONFIG:
  RequiredAcks=All → no data loss
  Async=false      → wait for broker ack
  BatchSize=100    → messages before flush
  BatchTimeout=10ms→ time before flush
  
CONSUMER CONFIG:
  CommitInterval=0 → disable auto-commit (use manual)
  StartOffset=FirstOffset → read from beginning
  GroupID="name"   → join this consumer group

NEXT: Phase 2 — Internals (storage, replication, ISR, delivery semantics)
```
