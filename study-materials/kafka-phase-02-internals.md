# Phase 2 — Kafka Internals: Storage, Replication & Delivery

> "You cannot tune what you do not understand at the byte level."

---

## 2.1 — Log Storage: Segments & Indexes

```
┌─────────────────────────── Topic: orders ─────────────────────────────┐
│  Partition 0 directory: /var/kafka-logs/orders-0/                      │
│                                                                        │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐    │
│  │ 00000000000.log   │  │ 00000000500.log   │  │ 00000001000.log  │    │
│  │ 00000000000.index │  │ 00000000500.index │  │ 00000001000.index│    │
│  │ 00000000000.timeindex│ 00000000500.timeindex│ 00000001000.timeindex│ │
│  │   (CLOSED)        │  │   (CLOSED)        │  │   (ACTIVE)       │    │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘    │
│         ▲                       ▲                       ▲              │
│    segment.bytes=1GB      rolls when full         currently writing    │
└────────────────────────────────────────────────────────────────────────┘
```

### Log File Format (on disk)

```
┌─────────────────────────────────────────────────────────────┐
│  Record Batch Header (61 bytes)                              │
├─────────────────────────────────────────────────────────────┤
│  baseOffset: int64        │  offset of first record         │
│  batchLength: int32       │  total bytes in batch           │
│  partitionLeaderEpoch: int32                                │
│  magic: int8 = 2          │  current format version         │
│  crc: uint32              │  CRC of remaining bytes         │
│  attributes: int16        │  compression, timestamp type    │
│  lastOffsetDelta: int32   │  (lastOffset - baseOffset)      │
│  firstTimestamp: int64                                       │
│  maxTimestamp: int64                                         │
│  producerId: int64        │  for idempotence/transactions   │
│  producerEpoch: int16                                        │
│  baseSequence: int32      │  deduplication sequence         │
│  recordCount: int32                                          │
├─────────────────────────────────────────────────────────────┤
│  Record 0 │ Record 1 │ ... │ Record N                       │
└─────────────────────────────────────────────────────────────┘
```

### Index Structure (sparse)

```
┌────────────── 00000000500.index ──────────────┐
│  Relative Offset  │  Physical Position (bytes) │
├───────────────────┼────────────────────────────┤
│        0          │         0                  │
│       12          │      4096                  │
│       25          │      8192                  │
│       38          │     12288                  │
│  (every 4KB by default: log.index.interval.bytes) │
└───────────────────┴────────────────────────────┘

Lookup offset 530:
  1. File = 00000000500.log (largest base <= 530)
  2. Index: relative 25 → position 8192 (largest entry <= 30)
  3. Scan forward from position 8192 until offset 530
```

**The sentence to remember:** Kafka's log is append-only, immutable once rolled, and indexed sparsely — giving O(1) writes and O(log N + scan) reads.

**The trap:** Setting `segment.bytes` too small creates millions of files; too large makes compaction and retention slow. Start with 1GB.

### Dump commands

```bash
# Dump log segment contents
kafka-dump-log.sh --files /var/kafka-logs/orders-0/00000000000.log --print-data-log

# Dump index
kafka-dump-log.sh --files /var/kafka-logs/orders-0/00000000000.index

# Dump timeindex
kafka-dump-log.sh --files /var/kafka-logs/orders-0/00000000000.timeindex
```

---

## 2.2 — Log Compaction

```
┌─── Before Compaction ─────────────────────────────────────────┐
│ Offset: 0    1    2    3    4    5    6    7    8    9         │
│ Key:    A    B    A    C    B    A    D    C    A    B         │
│ Value:  v1   v1   v2   v1   v2   v3   v1   v2   v4   v3      │
└───────────────────────────────────────────────────────────────┘
                            │
                    compaction runs
                            ▼
┌─── After Compaction ──────────────────────────────────────────┐
│ Offset: 6    7    8    9       (latest value per key kept)    │
│ Key:    D    C    A    B                                       │
│ Value:  v1   v2   v4   v3                                     │
└───────────────────────────────────────────────────────────────┘

Tombstone: Key=A, Value=null → eventually removed after delete.retention.ms
```

**The sentence to remember:** Compaction guarantees the LAST value for every key survives — it is a key-value changelog, not a queue.

**The trap:** Compaction is NOT instant. The `min.cleanable.dirty.ratio` and cleaner threads control when it runs. Never assume a key is "gone" immediately.

---

## 2.3 — Replication & ISR

```
┌─────────────── Partition 0 (replication.factor=3) ────────────────────┐
│                                                                        │
│   Broker 1 (LEADER)        Broker 2 (FOLLOWER)    Broker 3 (FOLLOWER) │
│   ┌───────────────┐        ┌───────────────┐      ┌───────────────┐   │
│   │ offset 0..100 │◄───────│ offset 0..100 │      │ offset 0..98  │   │
│   │  (writes here)│  fetch │  (in-sync)    │      │  (lagging!)   │   │
│   └───────────────┘        └───────────────┘      └───────────────┘   │
│                                                                        │
│   ISR = {1, 2}   ← broker 3 removed (lag > replica.lag.time.max.ms)  │
│   HW  = 100      ← high watermark (min offset in ISR)                │
│   LEO = 100      ← log end offset (leader)                           │
└────────────────────────────────────────────────────────────────────────┘
```

### ISR Shrink & Expand Timeline

```
t=0s    ISR = {1, 2, 3}    All caught up
t=5s    Broker-3 GC pause starts
t=15s   replica.lag.time.max.ms (10s) exceeded for broker-3
t=15s   Controller removes broker-3 from ISR → ISR = {1, 2}
        ► UnderReplicatedPartitions metric increments
t=20s   Broker-3 GC pause ends, resumes fetching
t=22s   Broker-3 catches up to HW
t=22s   Controller adds broker-3 back → ISR = {1, 2, 3}
        ► UnderReplicatedPartitions decrements
```

**The sentence to remember:** ISR is the set of replicas close enough to the leader that promoting any of them loses zero acknowledged data.

**The trap:** `min.insync.replicas=1` with `acks=all` gives you NO redundancy — the leader alone satisfies "all". Use `min.insync.replicas=2` with `replication.factor=3`.

---

## 2.4 — Leader Election

```
t=0:    Leader of P0 = broker-1, ISR = {1,2,3}
t=1:    docker kill kafka-1
t=3s:   Controller detects death (via ZooKeeper session timeout)
t=3s:   Controller picks new leader from ISR: broker-2
t=5s:   Metadata propagated to all brokers
t=6s:   Producer retries (retry.backoff.ms) → success on broker-2
        Zero acknowledged data loss.

┌──────── Election Decision Tree ────────────────────────────┐
│                                                             │
│  Leader dies                                                │
│      │                                                      │
│      ▼                                                      │
│  ISR non-empty?                                             │
│   ├── YES → pick first broker in ISR → clean election      │
│   └── NO  → unclean.leader.election.enable?                │
│              ├── true  → pick ANY replica → DATA LOSS risk  │
│              └── false → partition goes OFFLINE              │
└─────────────────────────────────────────────────────────────┘
```

**The sentence to remember:** Leader election is automatic, fast (~seconds), and invisible to producers that retry.

**The trap:** `unclean.leader.election.enable=true` lets out-of-sync replicas become leader — ACKNOWLEDGED data can be LOST.

---

## 2.5 — Delivery Semantics

```
┌────────────────────────────────────────────────────────────────────────┐
│  Semantic          │ Producer Config          │ Consumer Config         │
├────────────────────┼──────────────────────────┼─────────────────────────┤
│  At-most-once      │ acks=0 or acks=1         │ auto.commit=true        │
│                    │ retries=0                │ (commit before process) │
├────────────────────┼──────────────────────────┼─────────────────────────┤
│  At-least-once     │ acks=all                 │ auto.commit=false       │
│                    │ retries=MAX              │ (commit after process)  │
│                    │ enable.idempotence=false │                         │
├────────────────────┼──────────────────────────┼─────────────────────────┤
│  Exactly-once      │ acks=all                 │ isolation.level=        │
│  (within Kafka)    │ enable.idempotence=true  │   read_committed        │
│                    │ transactional.id=X       │ (consume from txn)      │
└────────────────────┴──────────────────────────┴─────────────────────────┘
```

### Idempotent Producer Deduplication

```
┌─── Producer (PID=7, epoch=0) ────────────────────────────────────┐
│                                                                    │
│  Send: {PID=7, epoch=0, seq=0, value="order-1"} → broker ACKs    │
│  Send: {PID=7, epoch=0, seq=1, value="order-2"} → network timeout│
│  Retry: {PID=7, epoch=0, seq=1, value="order-2"} → broker sees   │
│          seq=1 already written → returns ACK, does NOT duplicate  │
└────────────────────────────────────────────────────────────────────┘
```

**The sentence to remember:** Exactly-once = idempotent producer (dedup by sequence) + transactions (atomic multi-partition writes) + read_committed consumers.

**The trap:** Exactly-once does NOT extend outside Kafka. Writing to a database after consume can still duplicate unless you implement the outbox/dedup pattern.

---

## 2.6 — Zero-Copy & Page Cache

```
┌─── Traditional Read Path ──────────────┐    ┌─── Zero-Copy (sendfile) ─────────┐
│                                         │    │                                    │
│  Disk → Kernel Buffer → User Buffer     │    │  Disk → Kernel Buffer → NIC       │
│       → Kernel Buffer → NIC             │    │  (skips user-space entirely)       │
│                                         │    │                                    │
│  4 copies, 4 context switches           │    │  2 copies, 2 context switches      │
└─────────────────────────────────────────┘    └────────────────────────────────────┘

┌─── Page Cache Flow ──────────────────────────────────────────────┐
│                                                                    │
│  Producer writes  ─► OS page cache ─► (async flush) ─► Disk      │
│                         │                                          │
│  Consumer reads   ◄────┘  (if data is recent, never hits disk!)  │
│                                                                    │
│  This is why Kafka consumers at tail read at MEMORY speed.        │
└────────────────────────────────────────────────────────────────────┘
```

**The sentence to remember:** Kafka achieves millions of msg/sec because it treats the OS page cache as its primary read cache and uses sendfile() to skip user-space entirely.

**The trap:** Running Kafka on a machine with too little RAM starves the page cache. Rule of thumb: leave 50%+ RAM free for page cache (do not over-allocate JVM heap).

---

## 2.7 — Segment Rolling Timeline

```
┌─── Segment Rolling Triggers ─────────────────────────────────────┐
│                                                                    │
│  Active segment rolls to a new file when ANY of these is true:    │
│                                                                    │
│  1. Size >= segment.bytes (default 1 GB)                          │
│  2. Age  >= segment.ms   (default 7 days)                         │
│  3. Index full (segment.index.bytes, default 10 MB)               │
│                                                                    │
│  Timeline:                                                         │
│  ────────────────────────────────────────────────────────►        │
│  │ seg-0 created │ ... 1GB written ... │ seg-1 created │          │
│  │   t=0         │                     │  t=12h        │          │
│  │               │                     │               │          │
│  │  Retention applies only to CLOSED segments!         │          │
│  │  Active segment is NEVER deleted by retention.      │          │
└────────────────────────────────────────────────────────────────────┘
```

**The sentence to remember:** Retention and compaction only operate on closed (rolled) segments — the active segment is sacred.

**The trap:** If `segment.ms` is longer than `retention.ms`, data in the active segment can live far beyond your retention policy.

---

## Go Code: Inspecting Partition Offsets

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
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	conn, err := kafka.DialLeader(ctx, "tcp", "localhost:9092", "orders", 0)
	if err != nil {
		log.Fatal("dial leader:", err)
	}
	defer conn.Close()

	// Read partition offsets — equivalent of querying segment boundaries
	first, err := conn.ReadFirstOffset()
	if err != nil {
		log.Fatal("first offset:", err)
	}

	last, err := conn.ReadLastOffset()
	if err != nil {
		log.Fatal("last offset:", err)
	}

	fmt.Printf("Partition 0: first=%d, last=%d, depth=%d messages\n", first, last, last-first)
}
```

## Go Code: Transactional (Exactly-Once) Writing

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
	// kafka-go does not natively support transactions, but idempotent writes
	// are supported via the Writer with RequiredAcks and retriable config.
	// For full EOS, use confluent-kafka-go. Here we show idempotent pattern:

	w := &kafka.Writer{
		Addr:         kafka.TCP("localhost:9092"),
		Topic:        "orders",
		Balancer:     &kafka.Murmur2Balancer{},
		RequiredAcks: kafka.RequireAll,       // acks=all
		MaxAttempts:  10,                      // retries
		BatchTimeout: 5 * time.Millisecond,   // linger.ms equivalent
		Async:        false,                   // synchronous for safety
	}
	defer w.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	err := w.WriteMessages(ctx,
		kafka.Message{
			Key:   []byte("order-123"),
			Value: []byte(`{"status":"completed","amount":99.50}`),
		},
	)
	if err != nil {
		log.Fatal("write:", err)
	}
	fmt.Println("Message written with acks=all, retries=10")
}
```

---

## Exercises

- [ ] **Exercise 1:** Run `kafka-dump-log.sh` on a segment file and identify: baseOffset, batchLength, compression type, and record count.
  - Expected output: A decoded batch showing `baseOffset: 0 ... codec: none ... record count: 15`
  - Teaches: Physical log format and how batching works on disk.

- [ ] **Exercise 2:** Set `segment.bytes=1024` (1KB) on a test topic, produce 100 messages, then `ls` the partition directory. Count the segment files.
  - Expected output: ~10-20 segment files depending on message size.
  - Teaches: Segment rolling trigger and why tiny segments are wasteful.

- [ ] **Exercise 3:** Create a compacted topic (`cleanup.policy=compact`), produce 50 messages with 5 unique keys, wait for compaction, consume from offset 0. Verify only 5 messages remain.
  - Expected output: 5 messages (latest value for each key).
  - Teaches: Compaction semantics and that offsets are NOT contiguous after compaction.

- [ ] **Exercise 4:** Kill the leader broker for a partition, observe `--describe` output, measure election time with timestamps.
  - Expected output: New leader elected within 1-5 seconds, ISR shrinks by 1.
  - Teaches: Leader election speed and ISR dynamics.

- [ ] **Exercise 5:** Set `min.insync.replicas=2` with `replication.factor=3`, kill 2 followers, attempt to produce with `acks=all`. Observe the error.
  - Expected output: `NOT_ENOUGH_REPLICAS` error on produce.
  - Teaches: The min.insync.replicas safety net.

- [ ] **Exercise 6:** Write a Go program that produces 10,000 messages with `RequiredAcks: kafka.RequireAll`, then reads them back verifying zero duplicates using a map of message keys.
  - Expected output: `Produced: 10000, Consumed unique: 10000, Duplicates: 0`
  - Teaches: Idempotent delivery guarantees in practice.

- [ ] **Exercise 7:** Monitor `UnderReplicatedPartitions` JMX metric, introduce a 15-second GC pause on one broker (using `kill -STOP`/`kill -CONT`), observe ISR shrink and expand.
  - Expected output: Metric goes from 0 → N → 0 as broker pauses and recovers.
  - Teaches: ISR dynamics and monitoring importance.

- [ ] **Exercise 8:** Compare read throughput with page cache warm (second read of same data) vs cold (after `echo 3 > /proc/sys/vm/drop_caches`). Measure MB/s difference.
  - Expected output: Warm read 2-10x faster than cold read.
  - Teaches: Page cache is Kafka's secret weapon for tail consumers.

- [ ] **Exercise 9:** Set `unclean.leader.election.enable=true`, kill ALL ISR members, bring back only an out-of-sync replica, produce and consume. Observe data loss.
  - Expected output: Messages produced before the kill are gone — acknowledged data lost.
  - Teaches: Why unclean election is dangerous in production.

- [ ] **Exercise 10:** Send a tombstone (null value) to a compacted topic, wait for `delete.retention.ms` to pass, verify the key is completely gone.
  - Expected output: Consumer from beginning returns no record for that key.
  - Teaches: Tombstone lifecycle in compacted topics.

---

## Checkpoint Questions

1. Why does Kafka use a sparse index instead of indexing every message? What is the tradeoff?
2. If `replica.lag.time.max.ms=10000` and a follower takes 12 seconds to fetch, what happens to the ISR?
3. With `acks=all` and `min.insync.replicas=2` and `replication.factor=3`, how many brokers can die without data loss? How many before the partition goes read-only?
4. Explain why a consumer at the "tail" of a topic reads faster than one reading historical data.
5. What is the difference between `log.retention.bytes` and `log.retention.ms`? Which takes priority?
6. Why can a producer sequence number prevent duplicates even after a network timeout?
7. What happens if `segment.ms < retention.ms`? What if `segment.ms > retention.ms`?

---

## References

- [Kafka Storage Internals](https://kafka.apache.org/documentation/#design_filesystem)
- [Log Compaction](https://kafka.apache.org/documentation/#compaction)
- [Replication Design](https://kafka.apache.org/documentation/#replication)
- [Exactly-Once Semantics in Kafka](https://www.confluent.io/blog/exactly-once-semantics-are-possible-heres-how-apache-kafka-does-it/)
- [The Log: What Every Engineer Should Know](https://engineering.linkedin.com/distributed-systems/log-what-every-software-engineer-should-know-about-real-time-datas-unifying)
- [Zero-Copy in Kafka](https://kafka.apache.org/documentation/#design_sendfile)
- [Kafka Broker Configs](https://kafka.apache.org/documentation/#brokerconfigs)

---

## Cheatsheet

```
┌──────────────────────────────────────────────────────────────────────┐
│  STORAGE                                                              │
│  segment.bytes=1073741824      Segment size (1GB default)            │
│  segment.ms=604800000          Segment roll time (7 days)            │
│  log.index.interval.bytes=4096 Index entry every 4KB                 │
│  cleanup.policy=delete|compact Topic retention strategy              │
│  retention.ms=604800000        Delete after 7 days                   │
│  delete.retention.ms=86400000  Tombstone linger time (compaction)    │
├──────────────────────────────────────────────────────────────────────┤
│  REPLICATION                                                          │
│  replication.factor=3          Standard production setting            │
│  min.insync.replicas=2         Safety with acks=all                  │
│  replica.lag.time.max.ms=10000 ISR removal threshold                 │
│  unclean.leader.election=false NEVER enable in production            │
├──────────────────────────────────────────────────────────────────────┤
│  DELIVERY                                                             │
│  acks=all                      Strongest durability                   │
│  enable.idempotence=true       Dedup by PID+seq                      │
│  transactional.id=X            Exactly-once multi-partition           │
│  isolation.level=read_committed Consumer sees only committed txns    │
├──────────────────────────────────────────────────────────────────────┤
│  DEBUG COMMANDS                                                        │
│  kafka-dump-log.sh --files X.log --print-data-log                    │
│  kafka-log-dirs.sh --describe --bootstrap-server localhost:9092      │
│  kafka-topics.sh --describe --under-replicated-partitions            │
└──────────────────────────────────────────────────────────────────────┘
```
