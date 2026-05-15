# Phase 3 — Kafka Tuning: Producer, Consumer & Backpressure

> "Default configs are for demos. Production configs are for engineers who measured."

---

## 3.1 — Producer Batching

```
┌─── Producer Batching Timeline ─────────────────────────────────────────┐
│                                                                         │
│  Message arrives     Batch buffer (per partition)                       │
│       │              ┌─────────────────────────────────────┐           │
│       ▼              │ msg1 │ msg2 │ msg3 │ ... │ msg N    │           │
│  send() called       └─────────────────────────────────────┘           │
│                              │                                          │
│                      Send triggers when EITHER:                         │
│                      ├── batch.size reached (bytes)                     │
│                      └── linger.ms timer expires                        │
│                              │                                          │
│                              ▼                                          │
│                      ┌─────────────┐                                   │
│                      │  Network    │  One request = one batch           │
│                      │  Send       │  per partition per broker          │
│                      └─────────────┘                                   │
└─────────────────────────────────────────────────────────────────────────┘

Throughput formula:
  Messages/sec = batch.size / avg_msg_size / max(linger.ms, fill_time)
  
  Example: batch.size=64KB, avg_msg=200B, linger.ms=5ms
  → 320 msgs/batch, if linger triggers: 320/0.005 = 64,000 msg/sec per partition
```

### Tuning Matrix

```
┌────────────────┬───────────────┬─────────────────────────────────────┐
│ Parameter      │ Default       │ Recommendation                      │
├────────────────┼───────────────┼─────────────────────────────────────┤
│ batch.size     │ 16384 (16KB)  │ 65536-131072 (64-128KB) for throughput│
│ linger.ms      │ 0             │ 5-20ms (trade latency for throughput)│
│ buffer.memory  │ 33554432(32MB)│ Increase if producers block         │
│ max.block.ms   │ 60000         │ How long send() blocks when full    │
└────────────────┴───────────────┴─────────────────────────────────────┘
```

**The sentence to remember:** `linger.ms > 0` trades a few milliseconds of latency for dramatically better throughput by filling batches before sending.

**The trap:** Setting `batch.size` huge but `linger.ms=0` means batches send immediately with 1 message — you get no batching benefit.

---

## 3.2 — Compression

```
┌─── Compression Comparison ─────────────────────────────────────────────┐
│                                                                         │
│  Algorithm  │ Ratio   │ Compress Speed │ Decompress Speed │ CPU Cost   │
│  ───────────┼─────────┼────────────────┼──────────────────┼────────────│
│  none       │ 1.0x    │ N/A            │ N/A              │ zero       │
│  snappy     │ 1.5-2x  │ ~250 MB/s      │ ~500 MB/s        │ LOW        │
│  lz4        │ 2-3x    │ ~400 MB/s      │ ~800 MB/s        │ LOW        │
│  zstd       │ 3-5x    │ ~150 MB/s      │ ~400 MB/s        │ MEDIUM     │
│  gzip       │ 3-5x    │ ~50 MB/s       │ ~200 MB/s        │ HIGH       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Decision tree:                                                         │
│  ├── CPU constrained? → snappy or lz4                                  │
│  ├── Network/disk constrained? → zstd (best ratio)                     │
│  ├── Already compressed data (images, video)? → none                   │
│  └── Default choice for JSON/text payloads? → lz4                      │
│                                                                         │
│  Compression happens at BATCH level:                                    │
│  ┌──────────────────────────────────────┐                              │
│  │ Batch: [msg1, msg2, msg3, ..., msgN] │ ← compressed as one unit    │
│  └──────────────────────────────────────┘                              │
│  Larger batches = better compression ratio (more redundancy to exploit)│
└─────────────────────────────────────────────────────────────────────────┘
```

**The sentence to remember:** Compression is per-batch — larger batches (via `linger.ms`) compound the compression benefit.

**The trap:** Broker can re-compress if `compression.type` on the topic differs from the producer. Set topic to `producer` to avoid this.

---

## 3.3 — Acks Deep-Dive

```
┌─── Acks Tradeoff Matrix ──────────────────────────────────────────────┐
│                                                                        │
│  acks=0                  acks=1                 acks=all              │
│  ┌──────────────┐       ┌──────────────┐       ┌──────────────┐      │
│  │ Fire & forget│       │ Leader wrote │       │ All ISR wrote│      │
│  │              │       │              │       │              │      │
│  │ Latency: ~0 │       │ Latency: 1ms │       │ Latency: 5ms│      │
│  │ Durability: 0│       │ Durability: ░│       │ Durability: █│      │
│  │ Throughput: █│       │ Throughput: ▓│       │ Throughput: ░│      │
│  └──────────────┘       └──────────────┘       └──────────────┘      │
│                                                                        │
│  Data loss scenarios:                                                  │
│  acks=0: Any failure → lost (never confirmed)                         │
│  acks=1: Leader dies before replication → lost                        │
│  acks=all: Only if ALL ISR die simultaneously → extremely unlikely    │
├────────────────────────────────────────────────────────────────────────┤
│  USE CASES:                                                            │
│  acks=0: Metrics, logs where loss is acceptable                       │
│  acks=1: Low-latency, moderate durability (clickstream)               │
│  acks=all: Financial transactions, orders, anything you cannot lose   │
└────────────────────────────────────────────────────────────────────────┘
```

**The sentence to remember:** `acks=all` only guarantees durability when combined with `min.insync.replicas >= 2` — otherwise "all" means "just the leader."

**The trap:** `acks=all` with `min.insync.replicas=1` is functionally equivalent to `acks=1`. You get the latency penalty with no extra safety.

---

## 3.4 — Retries & Idempotence

```
┌─── Retry Flow ─────────────────────────────────────────────────────────┐
│                                                                         │
│  Producer                              Broker                          │
│     │                                     │                            │
│     │──── send(msg, seq=5) ──────────────►│                            │
│     │                                     │── write to log             │
│     │◄─── TIMEOUT (ACK lost) ────────────│                            │
│     │                                     │                            │
│     │──── retry(msg, seq=5) ─────────────►│                            │
│     │                                     │── seq=5 already? DEDUP!    │
│     │◄─── ACK (success) ─────────────────│                            │
│     │                                     │                            │
│  Result: exactly one copy in the log      │                            │
└─────────────────────────────────────────────────────────────────────────┘

Required config for idempotent producer:
  enable.idempotence=true    (implies acks=all, retries=MAX, max.in.flight=5)
```

### Ordering Guarantee with Retries

```
┌─── Without idempotence, max.in.flight.requests > 1 ───────────────────┐
│                                                                         │
│  Send batch A (offset 0-4)  ──► FAIL                                  │
│  Send batch B (offset 5-9)  ──► SUCCESS (written first!)              │
│  Retry batch A              ──► SUCCESS (written second!)              │
│                                                                         │
│  Log order: B, A  ← OUT OF ORDER!                                      │
├─────────────────────────────────────────────────────────────────────────┤
│  With idempotence (max.in.flight.requests.per.connection <= 5):        │
│  Broker rejects out-of-sequence batches → producer re-queues in order  │
│  Log order: A, B  ← GUARANTEED                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**The sentence to remember:** `enable.idempotence=true` gives you exactly-once per partition AND ordering, with no meaningful performance cost. Always enable it.

**The trap:** Without idempotence, setting `retries > 0` with `max.in.flight.requests.per.connection > 1` can reorder messages.

---

## 3.5 — Consumer Tuning

```
┌─── Consumer Poll Loop Timing ──────────────────────────────────────────┐
│                                                                         │
│  ┌────── max.poll.interval.ms (default 300,000 = 5 min) ──────────┐   │
│  │                                                                  │   │
│  │  poll() ──► process N records ──► commit ──► poll()             │   │
│  │    │              │                  │          │                │   │
│  │    │  max.poll.records              │          │                │   │
│  │    │  (default 500)                 │          │                │   │
│  └────┼────────────────────────────────┼──────────┼────────────────┘   │
│       │                                │          │                     │
│  If time between polls > max.poll.interval.ms:                         │
│  → Consumer considered DEAD → rebalance triggered!                     │
│                                                                         │
│  ┌────── session.timeout.ms (default 45,000 = 45s) ──────┐            │
│  │  Heartbeat thread sends every heartbeat.interval.ms    │            │
│  │  If no heartbeat for session.timeout.ms → DEAD         │            │
│  └────────────────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────────────────┘
```

### Tuning Formulas

```
Rule 1: max.poll.records * processing_time_per_record < max.poll.interval.ms
  Example: 500 records * 200ms/record = 100s < 300s ✓

Rule 2: session.timeout.ms > 3 * heartbeat.interval.ms
  Example: 45000 > 3 * 10000 = 30000 ✓ (gives 3 missed heartbeats)

Rule 3: For high-throughput, low-latency:
  fetch.min.bytes = 1 (default, return immediately)
  fetch.max.wait.ms = 100 (max wait if min.bytes not met)
  max.partition.fetch.bytes = 1048576 (1MB per partition per fetch)
```

**The sentence to remember:** `max.poll.interval.ms` is the contract: "I promise to call poll() within this time, or you can assume I'm dead."

**The trap:** Slow message processing triggers a rebalance. If one message takes 6 minutes, the consumer is kicked out even though it is alive. Reduce `max.poll.records` or increase `max.poll.interval.ms`.

---

## 3.6 — The Rebalance Problem & Math

```
┌─── Rebalance Timeline (Eager/Stop-the-World) ─────────────────────────┐
│                                                                         │
│  t=0     Consumer C3 crashes                                           │
│  t=10s   session.timeout.ms expires, coordinator detects               │
│  t=10s   Coordinator sends REBALANCE to all consumers                  │
│  t=10s   ALL consumers STOP processing, revoke ALL partitions          │
│  t=11s   JoinGroup from C1, C2                                         │
│  t=11s   Leader (C1) assigns partitions: C1=[P0,P1,P2], C2=[P3,P4,P5]│
│  t=12s   SyncGroup → consumers resume                                  │
│                                                                         │
│  DOWNTIME = session.timeout.ms + rebalance_duration ≈ 12-15 seconds   │
├─────────────────────────────────────────────────────────────────────────┤
│  Cooperative Sticky (incremental):                                      │
│  t=10s   Only P4, P5 (from dead C3) are revoked                       │
│  t=11s   P4, P5 assigned to C1, C2                                     │
│  t=11s   C1, C2 NEVER stopped processing their original partitions    │
│                                                                         │
│  DOWNTIME for existing partitions = 0                                   │
└─────────────────────────────────────────────────────────────────────────┘

Rebalance cost formula:
  Cost = (num_partitions * state_restore_time) + (catchup_lag * processing_rate)
  
  Example: 100 partitions, 50ms state restore each, 10k lag per partition
  Cost = (100 * 50ms) + (10000 * 1ms) = 5s + 10s = 15s of catch-up
```

**The sentence to remember:** Use `partition.assignment.strategy=cooperative-sticky` to eliminate stop-the-world rebalances in Kafka 2.4+.

**The trap:** Eager rebalance revokes ALL partitions from ALL consumers even if only one consumer changed — this causes cascading lag spikes.

---

## 3.7 — Backpressure Patterns

```
┌─── Backpressure Architecture ──────────────────────────────────────────┐
│                                                                         │
│  Pattern 1: Reduce poll batch                                          │
│  ┌─────────────┐     ┌──────────────┐     ┌──────────────┐           │
│  │   Kafka     │────►│  Consumer    │────►│  Slow DB     │           │
│  │  (fast)     │     │  poll(100)   │     │  (bottleneck)│           │
│  └─────────────┘     └──────────────┘     └──────────────┘           │
│                       max.poll.records=50   ← reduce until stable      │
│                                                                         │
│  Pattern 2: Pause/Resume partitions                                    │
│  ┌─────────────┐     ┌──────────────┐     ┌──────────────┐           │
│  │   Kafka     │────►│  Consumer    │────►│  Worker Pool │           │
│  │             │     │  pause(P0)   │     │  (full)      │           │
│  └─────────────┘     └──────────────┘     └──────────────┘           │
│                       When pool drains, resume(P0)                      │
│                                                                         │
│  Pattern 3: Internal buffered channel (Go)                             │
│  ┌─────────────┐     ┌──────────────┐     ┌──────────────┐           │
│  │   Kafka     │────►│  chan(1000)  │────►│  Workers     │           │
│  │             │     │  (backpress) │     │  (N goroutines)│          │
│  └─────────────┘     └──────────────┘     └──────────────┘           │
│                       If chan full, pause consumer                      │
└─────────────────────────────────────────────────────────────────────────┘
```

**The sentence to remember:** Backpressure means "slow down the source when the sink cannot keep up" — in Kafka, use `pause()`/`resume()` on partitions.

**The trap:** Ignoring backpressure leads to OOM (unbounded internal buffers) or rebalances (poll timeout exceeded while stuck on slow processing).

---

## 3.8 — Manual Offset Commit Strategies

```
┌─── Strategy 1: Commit after every batch ──────────────────────────────┐
│  poll() → process all → commitSync() → poll()                         │
│  ├── Simple, safe                                                      │
│  └── At-least-once: crash between process and commit → re-process     │
├────────────────────────────────────────────────────────────────────────┤
│  Strategy 2: Commit per message (slow but precise)                     │
│  poll() → for msg in msgs: process(msg), commitSync(msg.offset+1)    │
│  ├── Minimum re-processing on crash                                    │
│  └── Very slow (one network round-trip per message)                    │
├────────────────────────────────────────────────────────────────────────┤
│  Strategy 3: Async commit with sync on rebalance                       │
│  poll() → process → commitAsync() → poll()                            │
│  onPartitionsRevoked: commitSync()  ← guarantee before handoff        │
│  ├── Best throughput                                                    │
│  └── Small window for re-processing if async commit fails              │
├────────────────────────────────────────────────────────────────────────┤
│  Strategy 4: Commit to external store (exactly-once)                   │
│  poll() → process + write offset to same DB transaction               │
│  ├── True exactly-once (offset and data atomically committed)          │
│  └── Requires transactional data store                                 │
└────────────────────────────────────────────────────────────────────────┘
```

**The sentence to remember:** The safest pattern is "process, then commit" — you may re-process on failure, but you never lose data.

**The trap:** `commitAsync()` failures are silent by default. Always provide a callback and handle errors, or use `commitSync()` on rebalance.

---

## 3.9 — Dead-Letter Queues (DLQ)

```
┌─── DLQ Pattern ────────────────────────────────────────────────────────┐
│                                                                         │
│  ┌─────────┐     ┌──────────────┐     ┌──────────────┐               │
│  │  Main   │────►│   Consumer   │────►│  Process     │               │
│  │  Topic  │     │              │     │              │               │
│  └─────────┘     └──────────────┘     └──────┬───────┘               │
│                                              │                         │
│                                    ┌─────────┼──────────┐             │
│                                    │ Success │          │ Failure     │
│                                    ▼         │          ▼             │
│                              ┌─────────┐    │    ┌──────────┐        │
│                              │  Commit │    │    │  Retry   │        │
│                              │  Offset │    │    │  (N times)│        │
│                              └─────────┘    │    └────┬─────┘        │
│                                             │         │ Still fails   │
│                                             │         ▼              │
│                                             │   ┌──────────┐        │
│                                             │   │   DLQ    │        │
│                                             │   │  Topic   │        │
│                                             │   └──────────┘        │
│                                             │         │              │
│                                             │         ▼              │
│                                             │   Alert + manual       │
│                                             │   investigation        │
└─────────────────────────────────────────────────────────────────────────┘
```

**The sentence to remember:** A DLQ lets you commit the offset and move forward — poison messages do not block the entire consumer.

**The trap:** DLQ messages lose ordering context. Include the original topic, partition, offset, timestamp, and error reason as headers.

---

## Go Code: Tuned Producer with Benchmarking

```go
package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/segmentio/kafka-go"
	"github.com/segmentio/kafka-go/snappy"
)

func main() {
	w := &kafka.Writer{
		Addr:         kafka.TCP("localhost:9092"),
		Topic:        "benchmark-topic",
		Balancer:     &kafka.Murmur2Balancer{},
		RequiredAcks: kafka.RequireAll,
		Compression:  snappy.NewCompressionCodec(),
		BatchSize:    1000,                   // max messages per batch
		BatchBytes:   1048576,                // 1MB max batch size
		BatchTimeout: 10 * time.Millisecond,  // linger.ms equivalent
		MaxAttempts:  10,
		Async:        false,
	}
	defer w.Close()

	ctx := context.Background()
	msgCount := 100_000
	payload := make([]byte, 200) // 200-byte messages

	start := time.Now()
	messages := make([]kafka.Message, msgCount)
	for i := range messages {
		messages[i] = kafka.Message{
			Key:   []byte(fmt.Sprintf("key-%d", i%1000)),
			Value: payload,
		}
	}

	// Write in batches of 10,000
	batchSize := 10_000
	for i := 0; i < msgCount; i += batchSize {
		end := i + batchSize
		if end > msgCount {
			end = msgCount
		}
		if err := w.WriteMessages(ctx, messages[i:end]...); err != nil {
			log.Fatal("write:", err)
		}
	}

	elapsed := time.Since(start)
	throughput := float64(msgCount) / elapsed.Seconds()
	mbPerSec := float64(msgCount*200) / elapsed.Seconds() / 1024 / 1024

	fmt.Printf("Produced %d messages in %v\n", msgCount, elapsed)
	fmt.Printf("Throughput: %.0f msg/sec, %.1f MB/sec\n", throughput, mbPerSec)
}
```

## Go Code: Consumer with Backpressure and DLQ

```go
package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/segmentio/kafka-go"
)

func main() {
	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers:        []string{"localhost:9092"},
		GroupID:        "tuned-consumer-group",
		Topic:          "orders",
		MinBytes:       1e3,              // fetch.min.bytes = 1KB
		MaxBytes:       1e6,              // fetch.max.bytes = 1MB
		MaxWait:        100 * time.Millisecond,
		CommitInterval: 0,                // manual commit only
	})
	defer reader.Close()

	dlqWriter := &kafka.Writer{
		Addr:         kafka.TCP("localhost:9092"),
		Topic:        "orders-dlq",
		RequiredAcks: kafka.RequireAll,
	}
	defer dlqWriter.Close()

	ctx := context.Background()
	maxRetries := 3

	for {
		msg, err := reader.FetchMessage(ctx)
		if err != nil {
			log.Printf("fetch error: %v", err)
			continue
		}

		// Process with retry
		var processErr error
		for attempt := 1; attempt <= maxRetries; attempt++ {
			processErr = processMessage(msg)
			if processErr == nil {
				break
			}
			log.Printf("retry %d/%d for offset %d: %v", attempt, maxRetries, msg.Offset, processErr)
			time.Sleep(time.Duration(attempt*100) * time.Millisecond) // exponential-ish backoff
		}

		if processErr != nil {
			// Send to DLQ with context headers
			dlqMsg := kafka.Message{
				Key:   msg.Key,
				Value: msg.Value,
				Headers: []kafka.Header{
					{Key: "original-topic", Value: []byte(msg.Topic)},
					{Key: "original-partition", Value: []byte(fmt.Sprintf("%d", msg.Partition))},
					{Key: "original-offset", Value: []byte(fmt.Sprintf("%d", msg.Offset))},
					{Key: "error", Value: []byte(processErr.Error())},
					{Key: "timestamp", Value: []byte(time.Now().Format(time.RFC3339))},
				},
			}
			if err := dlqWriter.WriteMessages(ctx, dlqMsg); err != nil {
				log.Printf("CRITICAL: failed to write to DLQ: %v", err)
				continue // do not commit — will retry on next poll
			}
			log.Printf("Sent offset %d to DLQ after %d retries", msg.Offset, maxRetries)
		}

		// Commit offset (message processed or sent to DLQ)
		if err := reader.CommitMessages(ctx, msg); err != nil {
			log.Printf("commit error: %v", err)
		}
	}
}

func processMessage(msg kafka.Message) error {
	// Simulate processing — replace with real logic
	_ = msg.Value
	return nil
}
```

---

## Exercises

- [ ] **Exercise 1:** Benchmark producer throughput with `linger.ms=0` vs `linger.ms=10` vs `linger.ms=50`. Produce 1M messages of 100 bytes each.
  - Expected output: 0ms ~50k msg/s, 10ms ~200k msg/s, 50ms ~300k msg/s (numbers vary by hardware).
  - Teaches: The dramatic impact of batching on throughput.

- [ ] **Exercise 2:** Compare compression algorithms by producing 100k JSON messages with none/snappy/lz4/zstd. Measure: produce time, topic size on disk, consume time.
  - Expected output: zstd smallest on disk (60-70% reduction), lz4 fastest overall, snappy close to lz4.
  - Teaches: Compression tradeoffs are measurable, not theoretical.

- [ ] **Exercise 3:** Set `acks=0`, produce 10,000 messages, kill the leader mid-stream. Count how many messages are actually on the topic.
  - Expected output: Less than 10,000. Some messages were "sent" but never written.
  - Teaches: acks=0 means fire-and-forget — no delivery guarantee.

- [ ] **Exercise 4:** Implement a consumer that takes 2 seconds per message, set `max.poll.interval.ms=10000` and `max.poll.records=10`. Verify it does NOT rebalance. Then increase to `max.poll.records=50` and observe the rebalance.
  - Expected output: 10 records * 2s = 20s > 10s → rebalance triggered.
  - Teaches: The poll interval contract and how to size poll batches.

- [ ] **Exercise 5:** Write a consumer using `pause()`/`resume()` backpressure. Use a buffered channel of size 10 as the "slow downstream". Verify that Kafka lag stays bounded.
  - Expected output: Lag never exceeds ~1000 even under burst, because consumer pauses when buffer is 80% full.
  - Teaches: Partition-level flow control without rebalances.

- [ ] **Exercise 6:** Implement the DLQ pattern: produce 100 messages where every 10th message has invalid JSON. Consumer should retry 3 times, then DLQ. Verify 10 messages land in the DLQ topic.
  - Expected output: Main topic fully consumed, DLQ contains exactly 10 messages with error headers.
  - Teaches: Graceful poison-message handling.

- [ ] **Exercise 7:** Enable cooperative-sticky assignment, add a 4th consumer to a group of 3, observe that existing consumers do NOT stop processing during rebalance.
  - Expected output: Consumer logs show no gap in processing for existing partition assignments.
  - Teaches: Incremental rebalance superiority.

- [ ] **Exercise 8:** Produce with `enable.idempotence=true`, inject network failures (using toxiproxy or iptables), verify zero duplicates in the topic.
  - Expected output: Produced 10,000, consumed 10,000 unique (verified by sequence in value).
  - Teaches: Idempotent producer deduplication under real network failures.

- [ ] **Exercise 9:** Compare `commitSync()` after every message vs `commitSync()` after every batch of 100. Measure throughput difference.
  - Expected output: Per-batch commit is 5-10x faster (fewer network round-trips).
  - Teaches: Commit granularity vs throughput tradeoff.

- [ ] **Exercise 10:** Set `buffer.memory=1MB` on a producer, produce faster than the broker can accept. Observe `max.block.ms` timeout and the `BufferExhaustedException`.
  - Expected output: Producer blocks for `max.block.ms` then returns error.
  - Teaches: Producer-side backpressure via buffer memory limits.

- [ ] **Exercise 11:** Write a throughput calculator: given message size, batch.size, linger.ms, and partition count, predict max msg/sec. Validate against actual benchmark.
  - Expected output: Prediction within 20% of actual measured throughput.
  - Teaches: Capacity planning from first principles.

- [ ] **Exercise 12:** Configure a consumer with `auto.offset.reset=latest`, stop it, produce 1000 messages, restart. Then repeat with `auto.offset.reset=earliest`. Compare behavior.
  - Expected output: `latest` skips the 1000 messages, `earliest` replays from the start (if no committed offset).
  - Teaches: What happens when a consumer group has no committed offset.

---

## Checkpoint Questions

1. Why does `linger.ms=0` effectively disable batching even with a large `batch.size`?
2. Compression happens at the batch level. Why does this mean larger batches compress better?
3. With `acks=all`, `min.insync.replicas=2`, `replication.factor=3`: what happens if 1 broker is down? What if 2 are down?
4. Explain why `enable.idempotence=true` requires `max.in.flight.requests.per.connection <= 5`.
5. A consumer processes each message in 500ms. `max.poll.interval.ms=60000`. What is the maximum safe `max.poll.records` value?
6. What is the difference between `session.timeout.ms` and `max.poll.interval.ms`? Which one detects a stuck consumer?
7. When should you use `commitSync()` vs `commitAsync()`? What is the risk of each?

---

## References

- [Kafka Producer Configs](https://kafka.apache.org/documentation/#producerconfigs)
- [Kafka Consumer Configs](https://kafka.apache.org/documentation/#consumerconfigs)
- [Incremental Cooperative Rebalancing](https://www.confluent.io/blog/incremental-cooperative-rebalancing-in-kafka/)
- [Kafka Idempotent Producer](https://www.confluent.io/blog/exactly-once-semantics-are-possible-heres-how-apache-kafka-does-it/)
- [Compression in Kafka](https://www.confluent.io/blog/apache-kafka-message-compression/)
- [The Log: What Every Engineer Should Know](https://engineering.linkedin.com/distributed-systems/log-what-every-software-engineer-should-know-about-real-time-datas-unifying)
- [Uber's Kafka Tuning](https://www.uber.com/blog/kafka/)

---

## Cheatsheet

```
┌──────────────────────────────────────────────────────────────────────────┐
│  PRODUCER TUNING                                                          │
│  linger.ms=10-20              Trade ms of latency for batch throughput    │
│  batch.size=65536-131072      64-128KB per partition batch                │
│  compression.type=lz4         Best speed/ratio for text/JSON             │
│  acks=all                     Strongest guarantee                         │
│  enable.idempotence=true      ALWAYS enable (no real downside)           │
│  buffer.memory=67108864       64MB producer buffer                       │
│  max.in.flight.requests=5     Max with idempotence                       │
├──────────────────────────────────────────────────────────────────────────┤
│  CONSUMER TUNING                                                          │
│  max.poll.records=100-500     Match to processing speed                  │
│  max.poll.interval.ms=300000  5 min (increase for slow processing)       │
│  session.timeout.ms=45000     Heartbeat-based liveness                   │
│  heartbeat.interval.ms=15000  < session.timeout / 3                      │
│  auto.offset.reset=earliest   For new groups that need history           │
│  enable.auto.commit=false     Manual commit for at-least-once            │
│  partition.assignment.strategy=cooperative-sticky                         │
├──────────────────────────────────────────────────────────────────────────┤
│  FORMULAS                                                                 │
│  max_poll_records < max_poll_interval / processing_time_per_msg          │
│  throughput ≈ batch_size / msg_size / linger_ms * 1000 * num_partitions  │
│  rebalance_cost = num_partitions * state_restore + lag * process_rate    │
├──────────────────────────────────────────────────────────────────────────┤
│  DLQ HEADERS TO INCLUDE                                                   │
│  original-topic, original-partition, original-offset                      │
│  error-message, retry-count, timestamp, consumer-group                   │
└──────────────────────────────────────────────────────────────────────────┘
```
