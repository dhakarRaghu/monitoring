# Phase 6 — Kafka Design Patterns: Architecture, Event Sourcing & Multi-Region

> "Knowing Kafka's API is week one. Knowing when NOT to use Kafka is the sign of a senior engineer."

---

## 6.1 — When to Use Kafka vs Alternatives

```
┌─── Technology Comparison (Real Numbers) ───────────────────────────────┐
│                                                                         │
│             │ Kafka      │ RabbitMQ   │ SQS       │ Pulsar     │ NATS  │
│ ────────────┼────────────┼────────────┼───────────┼────────────┼───────│
│ Throughput  │ 1M+ msg/s  │ 50k msg/s  │ ~3k/queue │ 1M+ msg/s  │500k+ │
│ Latency p99 │ 5-15ms     │ 1-5ms      │ 20-50ms   │ 5-15ms     │<1ms  │
│ Retention   │ Days-∞     │ Until ACK  │ 14 days   │ Days-∞     │None* │
│ Replay      │ YES        │ NO         │ NO        │ YES        │NO    │
│ Ordering    │ Per-partition│ Per-queue │ FIFO queue│ Per-partition│ No   │
│ Consumer    │ Pull       │ Push       │ Pull      │ Pull/Push  │Push  │
│ Scale model │ Partitions │ Queues     │ Queues    │ Partitions │Subj  │
│ Ops burden  │ HIGH       │ MEDIUM     │ ZERO      │ HIGH       │LOW   │
│ Exactly-once│ YES (txn)  │ NO         │ YES(FIFO) │ YES (txn)  │NO    │
│ ────────────┼────────────┼────────────┼───────────┼────────────┼───────│
│ Best for    │ Event log  │ Task queue │ Serverless│ Multi-tenant│Realtime│
│             │ Stream proc│ RPC        │ decoupling│ Geo-repl   │IoT   │
│             │ CDC, replay│ Routing    │ Simple    │ Large scale│Req/Rep│
└─────────────────────────────────────────────────────────────────────────┘
  * NATS JetStream adds persistence and replay
```

### Decision Flowchart

```
┌─── Should You Use Kafka? ──────────────────────────────────────────────┐
│                                                                         │
│  Do you need to REPLAY events?                                         │
│  ├── YES → Kafka or Pulsar                                             │
│  └── NO ──► Do you need message ROUTING (headers, topic exchange)?     │
│              ├── YES → RabbitMQ                                         │
│              └── NO ──► Is it simple queue with < 10k msg/s?           │
│                         ├── YES → SQS (zero ops)                       │
│                         └── NO ──► Do you need sub-millisecond latency?│
│                                    ├── YES → NATS or Redis Streams     │
│                                    └── NO ──► Kafka                    │
│                                                                         │
│  DO NOT use Kafka when:                                                 │
│  ├── You need request-reply (RPC) → use gRPC or RabbitMQ              │
│  ├── You have < 1000 events/day → overkill, use SQS or a DB table     │
│  ├── You need complex routing → RabbitMQ exchanges are purpose-built   │
│  ├── You want zero infrastructure → SQS, SNS, or managed Pub/Sub      │
│  └── Sub-millisecond is required → NATS, Redis, or direct connections │
└─────────────────────────────────────────────────────────────────────────┘
```

**The sentence to remember:** Use Kafka when you need an immutable, replayable, ordered event log at scale. Use something else when you just need a task queue.

**The trap:** "We use Kafka because everyone uses Kafka" — the ops cost of Kafka is significant. If SQS or RabbitMQ solves your problem, they are better choices.

---

## 6.2 — Event Sourcing + CQRS

```
┌─── Event Sourcing Architecture ────────────────────────────────────────┐
│                                                                         │
│  Command                  Event Store (Kafka)             Read Model    │
│  ┌─────────┐     ┌─────────────────────────────┐    ┌──────────────┐  │
│  │ "Place  │     │ OrderPlaced                  │    │ orders_view  │  │
│  │  Order" │────►│ OrderPaid                    │───►│ (PostgreSQL) │  │
│  │         │     │ OrderShipped                 │    │              │  │
│  │         │     │ OrderDelivered               │    │ Materialized │  │
│  └─────────┘     └─────────────────────────────┘    │ from events  │  │
│       │                     │                        └──────────────┘  │
│       ▼                     │                              ▲            │
│  ┌─────────┐               │                              │            │
│  │Command  │               └──── Event Consumer ──────────┘            │
│  │Handler  │                     (projects events into read model)     │
│  │(validate│                                                            │
│  │ + emit) │          Current state = replay all events for entity     │
│  └─────────┘          Order-123 state = fold(OrderPlaced, OrderPaid,   │
│                                              OrderShipped)             │
└─────────────────────────────────────────────────────────────────────────┘
```

### CQRS: Command Query Responsibility Segregation

```
┌─── CQRS with Kafka ───────────────────────────────────────────────────┐
│                                                                         │
│  WRITE SIDE                           READ SIDE                        │
│  ┌──────────────┐                    ┌──────────────┐                 │
│  │  Command API │                    │   Query API  │                 │
│  │  (validate)  │                    │   (fast!)    │                 │
│  └──────┬───────┘                    └──────┬───────┘                 │
│         │                                    │                         │
│         ▼                                    ▼                         │
│  ┌──────────────┐                    ┌──────────────┐                 │
│  │   Kafka      │───── consume ─────►│  Read DB     │                 │
│  │ (event log)  │                    │ (Elastic, PG)│                 │
│  └──────────────┘                    └──────────────┘                 │
│                                                                         │
│  Benefits:                                                              │
│  ├── Write model optimized for consistency (event append)              │
│  ├── Read model optimized for queries (denormalized, indexed)          │
│  ├── Multiple read models from same event stream                       │
│  └── Temporal queries (what was state at time T?)                      │
│                                                                         │
│  Costs:                                                                 │
│  ├── Eventual consistency between write and read                       │
│  ├── More infrastructure (Kafka + read DB + projectors)                │
│  └── Debugging is harder (state is distributed)                        │
└─────────────────────────────────────────────────────────────────────────┘
```

**The sentence to remember:** Event sourcing stores WHAT HAPPENED (events), not current state. Current state is derived by replaying events. Kafka is the perfect event store.

**The trap:** Event sourcing without snapshots means replaying thousands of events to rebuild state. Implement periodic snapshots for entities with long event histories.

---

## 6.3 — Saga Pattern (Distributed Transactions)

```
┌─── Choreography-Based Saga ────────────────────────────────────────────┐
│                                                                         │
│  Order Service         Payment Service        Inventory Service        │
│       │                      │                       │                  │
│       │──OrderCreated───────►│                       │                  │
│       │                      │──PaymentProcessed────►│                  │
│       │                      │                       │──StockReserved──►│
│       │◄─────────────────────┼───────────────────────│  (saga complete)│
│       │                      │                       │                  │
│  COMPENSATION (if payment fails):                                      │
│       │                      │                       │                  │
│       │◄─PaymentFailed───────│                       │                  │
│       │──OrderCancelled─────►│                       │                  │
│                                                                         │
│  Each service:                                                          │
│  1. Consumes event from previous step                                   │
│  2. Performs local transaction                                           │
│  3. Publishes result event                                              │
│  4. On failure: publishes compensation event                            │
├─────────────────────────────────────────────────────────────────────────┤
│  Orchestration-Based Saga                                               │
│                                                                         │
│  ┌─────────────────────────────────────────────┐                       │
│  │           Saga Orchestrator                  │                       │
│  │     (central coordinator service)            │                       │
│  └──┬──────────────┬──────────────┬────────────┘                       │
│     │              │              │                                     │
│     ▼              ▼              ▼                                     │
│  ┌──────┐    ┌──────────┐  ┌───────────┐                              │
│  │Order │    │ Payment  │  │ Inventory │                              │
│  │Svc   │    │ Svc      │  │ Svc       │                              │
│  └──────┘    └──────────┘  └───────────┘                              │
│                                                                         │
│  Orchestrator decides next step and compensations.                      │
│  All communication via Kafka topics.                                    │
└─────────────────────────────────────────────────────────────────────────┘

  Choreography: simpler, decoupled, but hard to debug (no single view)
  Orchestration: centralized logic, easier to debug, single point of failure
```

**The sentence to remember:** A saga replaces a distributed transaction with a sequence of local transactions + compensating actions. Kafka carries the events between steps.

**The trap:** Without an explicit "saga state" store, you cannot answer "what step is this order at?" Use a saga state topic or database to track progress.

---

## 6.4 — CDC with Debezium + Outbox Pattern

```
┌─── CDC (Change Data Capture) with Debezium ────────────────────────────┐
│                                                                         │
│  ┌──────────────┐          ┌───────────┐         ┌──────────────┐     │
│  │  PostgreSQL  │──WAL────►│ Debezium  │────────►│    Kafka     │     │
│  │              │  (async) │ Connector │         │   Topics     │     │
│  │  orders      │          │           │         │              │     │
│  │  users       │          └───────────┘         │ cdc.orders   │     │
│  │  payments    │                                 │ cdc.users    │     │
│  └──────────────┘                                 │ cdc.payments │     │
│                                                    └──────────────┘     │
│  Event structure (Debezium envelope):                                   │
│  {                                                                      │
│    "before": { "id": 1, "status": "pending" },                        │
│    "after":  { "id": 1, "status": "shipped" },                        │
│    "source": { "table": "orders", "lsn": 12345 },                     │
│    "op": "u",  // c=create, u=update, d=delete, r=read(snapshot)      │
│    "ts_ms": 1703001234567                                               │
│  }                                                                      │
└─────────────────────────────────────────────────────────────────────────┘
```

### The Outbox Pattern

```
┌─── Problem: Dual-Write Inconsistency ─────────────────────────────────┐
│                                                                         │
│  BAD (dual write):                                                      │
│  ┌──────────┐     1. Write DB     ┌──────────┐                        │
│  │  Service │────────────────────►│   DB     │  ✓                     │
│  │          │     2. Publish Kafka ┌──────────┐                        │
│  │          │────────────────────►│  Kafka   │  ✗ (network error!)    │
│  └──────────┘                     └──────────┘                        │
│  Result: DB has the data, Kafka does NOT. Inconsistency!               │
├─────────────────────────────────────────────────────────────────────────┤
│  GOOD (outbox pattern):                                                 │
│                                                                         │
│  ┌──────────┐    Single transaction:    ┌──────────────────────────┐  │
│  │  Service │───────────────────────────│  PostgreSQL              │  │
│  │          │    1. INSERT orders(...)   │  ┌────────────────────┐  │  │
│  │          │    2. INSERT outbox(...)   │  │  orders table      │  │  │
│  └──────────┘    (same TX!)             │  ├────────────────────┤  │  │
│                                          │  │  outbox table      │  │  │
│                                          │  │  id, topic, key,   │  │  │
│                                          │  │  payload, created  │  │  │
│                                          │  └────────────────────┘  │  │
│                                          └────────────┬─────────────┘  │
│                                                       │                 │
│                                              Debezium CDC               │
│                                                       │                 │
│                                                       ▼                 │
│                                          ┌──────────────────┐          │
│                                          │     Kafka        │          │
│                                          │  (guaranteed to  │          │
│                                          │   have the event)│          │
│                                          └──────────────────┘          │
│                                                                         │
│  Guarantee: If the DB write succeeds, the event WILL reach Kafka       │
│  (Debezium reads the WAL, which includes the outbox insert)            │
└─────────────────────────────────────────────────────────────────────────┘
```

### Outbox Table Schema

```sql
CREATE TABLE outbox (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregatetype VARCHAR(255) NOT NULL,  -- e.g., "Order"
    aggregateid   VARCHAR(255) NOT NULL,  -- e.g., "order-123"
    type          VARCHAR(255) NOT NULL,  -- e.g., "OrderCreated"
    payload       JSONB NOT NULL,
    created_at    TIMESTAMP DEFAULT NOW()
);

-- Debezium reads this via CDC, publishes to Kafka, then either:
-- 1. outbox table is truncated periodically (log-based CDC does not need rows to persist)
-- 2. Or use Debezium's outbox event router (SMT) for clean topic routing
```

**The sentence to remember:** The outbox pattern guarantees "DB write + event publish" atomicity by writing both to the DB in one transaction, then letting CDC relay the event to Kafka.

**The trap:** Without the outbox pattern, ANY service that writes to a DB AND publishes to Kafka has a dual-write bug. It WILL cause inconsistency under failures.

---

## 6.5 — Ordering at Scale: Partition Key Design

```
┌─── Partition Key Strategies ───────────────────────────────────────────┐
│                                                                         │
│  Strategy 1: Entity ID as key (most common)                            │
│  Key = "order-123" → always same partition → ordered per order          │
│  ├── Good: all events for one order are strictly ordered               │
│  └── Risk: one popular entity creates a "hot partition"                │
│                                                                         │
│  Strategy 2: Composite key                                              │
│  Key = "tenant-A:order-123" → spread across partitions by tenant       │
│  ├── Good: ordering within tenant+entity                               │
│  └── Risk: large tenants still cause hot partitions                    │
│                                                                         │
│  Strategy 3: Random/null key (no ordering needed)                      │
│  Key = null → round-robin across partitions                            │
│  ├── Good: perfect load distribution                                   │
│  └── Risk: NO ordering guarantee (events for same entity scatter)      │
│                                                                         │
│  Strategy 4: Bucketed key (for hot entities)                           │
│  Key = "user-whale" + hash(eventId) % 4 → spread across 4 partitions  │
│  ├── Good: hot entities distributed                                    │
│  └── Risk: per-entity ordering lost (need downstream re-ordering)      │
└─────────────────────────────────────────────────────────────────────────┘

┌─── Hot Partition Problem ──────────────────────────────────────────────┐
│                                                                         │
│  12 partitions, key = user_id                                          │
│                                                                         │
│  P0: ████████████████████  (whale user: 40% of traffic)                │
│  P1: ███                                                                │
│  P2: ████                                                               │
│  P3: ██                                                                 │
│  P4: ███                                                                │
│  P5: ██                                                                 │
│  ...                                                                    │
│                                                                         │
│  Result: Consumer for P0 is overwhelmed, others idle.                  │
│  Fix: Use composite key or partition-aware routing for whale users.     │
└─────────────────────────────────────────────────────────────────────────┘
```

**The sentence to remember:** The partition key determines ordering scope AND load distribution. Choose it based on "what must be ordered together" — nothing more.

**The trap:** Using a low-cardinality key (e.g., country code with 5 values across 12 partitions) means 7 partitions are permanently empty.

---

## 6.6 — Multi-Region Architectures

```
┌─── Active-Passive (DR Failover) ───────────────────────────────────────┐
│                                                                         │
│  US-EAST (PRIMARY)                    EU-WEST (STANDBY)                │
│  ┌────────────────────┐              ┌────────────────────┐            │
│  │  Kafka Cluster A   │───MM2───────►│  Kafka Cluster B   │            │
│  │  (all writes here) │              │  (read-only mirror)│            │
│  └────────────────────┘              └────────────────────┘            │
│        ▲                                      │                         │
│   Producers                             Consumers (only                 │
│   + Consumers                           during failover)                │
│                                                                         │
│  RPO (data loss) = replication lag (typically seconds)                  │
│  RTO (recovery time) = DNS switch + consumer offset translation        │
├─────────────────────────────────────────────────────────────────────────┤
│  Active-Active (Multi-Region Write) ──────────────────────────────────│
│                                                                         │
│  US-EAST                              EU-WEST                          │
│  ┌────────────────────┐              ┌────────────────────┐            │
│  │  Kafka Cluster A   │◄────MM2────►│  Kafka Cluster B   │            │
│  │                    │──────MM2───►│                    │            │
│  └────────────────────┘              └────────────────────┘            │
│        ▲     │                              ▲     │                    │
│   Local     Local                      Local     Local                 │
│   Producers Consumers                  Producers Consumers             │
│                                                                         │
│  Challenge: CONFLICT RESOLUTION                                         │
│  ├── Same key written in both regions simultaneously                   │
│  ├── Solutions: last-writer-wins, vector clocks, CRDTs                 │
│  └── OR: partition keys by region (user region → write to local)       │
│                                                                         │
│  Avoiding infinite replication loops:                                   │
│  ├── MM2 adds source prefix: us-east.orders, eu-west.orders            │
│  ├── Consumers read from BOTH: local + remote prefix                   │
│  └── MM2 does NOT replicate already-prefixed topics (no loop)          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Stretch Cluster (Single Cluster, Multi-AZ)

```
┌─── Stretch Cluster (rack-aware) ───────────────────────────────────────┐
│                                                                         │
│  AZ-1                    AZ-2                    AZ-3                  │
│  ┌──────────┐           ┌──────────┐           ┌──────────┐           │
│  │ Broker 1 │           │ Broker 2 │           │ Broker 3 │           │
│  │ rack=az1 │           │ rack=az2 │           │ rack=az3 │           │
│  └──────────┘           └──────────┘           └──────────┘           │
│                                                                         │
│  broker.rack=az1 (configured per broker)                               │
│  replica.selector.class=org.apache.kafka.common.replica.RackAwareReplicaSelector│
│                                                                         │
│  With rf=3, min.insync.replicas=2:                                     │
│  ├── Each replica in a different AZ                                    │
│  ├── Survive entire AZ failure with zero data loss                     │
│  └── Cross-AZ latency adds ~1-3ms to acks=all                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**The sentence to remember:** Active-passive is simpler (one direction, no conflicts); active-active enables local writes everywhere but requires conflict resolution strategy.

**The trap:** Active-active without partition-by-region guarantees conflicts. Design your key space so each region "owns" its keys, or accept last-writer-wins semantics.

---

## 6.7 — Exactly-Once Across Services

```
┌─── End-to-End Exactly-Once ────────────────────────────────────────────┐
│                                                                         │
│  Kafka alone: Exactly-once via transactions (produce + consume atomic) │
│                                                                         │
│  Kafka + External DB: NOT automatic. You need ONE of:                  │
│                                                                         │
│  Pattern 1: Idempotent Consumer                                        │
│  ┌─────────────┐     ┌──────────────┐     ┌──────────────┐           │
│  │   Kafka     │────►│  Consumer    │────►│  DB          │           │
│  │             │     │ (dedup by    │     │ (UPSERT or   │           │
│  │             │     │  event ID)   │     │  check ID)   │           │
│  └─────────────┘     └──────────────┘     └──────────────┘           │
│                                                                         │
│  Pattern 2: Transactional Outbox (consume → process → produce)         │
│  ┌─────────────┐     ┌──────────────┐     ┌──────────────┐           │
│  │ Input Topic │────►│  Consumer    │────►│ Output Topic │           │
│  │             │     │ (Kafka txn:  │     │ (atomically  │           │
│  │             │     │  read+write) │     │  committed)  │           │
│  └─────────────┘     └──────────────┘     └──────────────┘           │
│                                                                         │
│  Pattern 3: Store offset in same DB transaction                        │
│  ┌─────────────┐     ┌──────────────────────────────────────┐        │
│  │   Kafka     │────►│  BEGIN TX                             │        │
│  │             │     │    INSERT INTO results(...)           │        │
│  │             │     │    UPDATE offsets SET offset=N        │        │
│  │             │     │  COMMIT                               │        │
│  └─────────────┘     └──────────────────────────────────────┘        │
│                       (on restart: SELECT offset FROM offsets table)   │
│                       (seek consumer to that offset — skip Kafka's)    │
└─────────────────────────────────────────────────────────────────────────┘
```

**The sentence to remember:** Exactly-once across services requires EITHER idempotent operations OR storing the Kafka offset atomically with the side-effect.

**The trap:** Kafka's `exactly_once` transaction guarantee stops at the Kafka boundary. The moment you write to an external system, you need your own deduplication.

---

## Go Code: Outbox Pattern Implementation

```go
package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"time"

	_ "github.com/lib/pq"
	"github.com/segmentio/kafka-go"
)

type OutboxEvent struct {
	ID            string    `json:"id"`
	AggregateType string    `json:"aggregate_type"`
	AggregateID   string    `json:"aggregate_id"`
	EventType     string    `json:"event_type"`
	Payload       json.RawMessage `json:"payload"`
	CreatedAt     time.Time `json:"created_at"`
}

// CreateOrderWithOutbox demonstrates atomic DB write + event publish via outbox
func CreateOrderWithOutbox(db *sql.DB, orderID string, amount float64) error {
	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback()

	// 1. Write the business data
	_, err = tx.Exec(
		`INSERT INTO orders (id, amount, status, created_at) VALUES ($1, $2, $3, NOW())`,
		orderID, amount, "created",
	)
	if err != nil {
		return fmt.Errorf("insert order: %w", err)
	}

	// 2. Write the outbox event (same transaction!)
	payload, _ := json.Marshal(map[string]interface{}{
		"order_id": orderID,
		"amount":   amount,
		"status":   "created",
	})

	_, err = tx.Exec(
		`INSERT INTO outbox (id, aggregatetype, aggregateid, type, payload)
		 VALUES (gen_random_uuid(), $1, $2, $3, $4)`,
		"Order", orderID, "OrderCreated", payload,
	)
	if err != nil {
		return fmt.Errorf("insert outbox: %w", err)
	}

	// 3. Commit atomically — both succeed or both fail
	return tx.Commit()
}

// IdempotentConsumer demonstrates deduplication on the consume side
func IdempotentConsumer(db *sql.DB) {
	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers: []string{"localhost:9092"},
		GroupID: "order-processor",
		Topic:   "cdc.public.outbox",
	})
	defer reader.Close()

	ctx := context.Background()

	for {
		msg, err := reader.FetchMessage(ctx)
		if err != nil {
			log.Printf("fetch: %v", err)
			continue
		}

		var event OutboxEvent
		if err := json.Unmarshal(msg.Value, &event); err != nil {
			log.Printf("unmarshal: %v", err)
			reader.CommitMessages(ctx, msg)
			continue
		}

		// Idempotent processing: check if already processed
		var exists bool
		err = db.QueryRow(
			`SELECT EXISTS(SELECT 1 FROM processed_events WHERE event_id = $1)`,
			event.ID,
		).Scan(&exists)
		if err != nil {
			log.Printf("check idempotency: %v", err)
			continue
		}

		if exists {
			log.Printf("Skipping duplicate event %s", event.ID)
			reader.CommitMessages(ctx, msg)
			continue
		}

		// Process in a transaction with idempotency record
		tx, err := db.Begin()
		if err != nil {
			log.Printf("begin: %v", err)
			continue
		}

		// Business logic here
		_, err = tx.Exec(
			`INSERT INTO order_projections (order_id, amount, status) VALUES ($1, $2, $3)
			 ON CONFLICT (order_id) DO UPDATE SET status = $3`,
			event.AggregateID, 0, event.EventType,
		)
		if err != nil {
			tx.Rollback()
			continue
		}

		// Record as processed (idempotency key)
		_, err = tx.Exec(
			`INSERT INTO processed_events (event_id, processed_at) VALUES ($1, NOW())`,
			event.ID,
		)
		if err != nil {
			tx.Rollback()
			continue
		}

		if err := tx.Commit(); err != nil {
			log.Printf("commit: %v", err)
			continue
		}

		reader.CommitMessages(ctx, msg)
		log.Printf("Processed event %s for %s", event.EventType, event.AggregateID)
	}
}

func main() {
	db, err := sql.Open("postgres", "postgres://localhost:5432/orders?sslmode=disable")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// Example: create order with outbox
	if err := CreateOrderWithOutbox(db, "order-999", 149.99); err != nil {
		log.Fatal(err)
	}
	fmt.Println("Order created with outbox event")

	// In production, run IdempotentConsumer in a separate service
	// IdempotentConsumer(db)
}
```

---

## 6.8 — Design Exercises

### Exercise A: Design a Notification System

```
┌─── Requirements ───────────────────────────────────────────────────────┐
│  - 10M users, 100k events/sec peak                                     │
│  - Channels: email, SMS, push                                          │
│  - User preferences (opt-out, quiet hours)                             │
│  - Deduplication (same notification not sent twice)                    │
│  - Priority levels (urgent bypasses quiet hours)                       │
│  - Audit trail (what was sent, when, to whom)                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─── Proposed Architecture ──────────────────────────────────────────────┐
│                                                                         │
│  ┌──────────┐    ┌──────────────────┐    ┌──────────────────┐         │
│  │ Services │───►│ notification-    │───►│ notification-    │         │
│  │          │    │ requests (Kafka) │    │ router           │         │
│  └──────────┘    └──────────────────┘    └────────┬─────────┘         │
│                   Key: user_id                     │                    │
│                   Partitions: 24                   │ checks preferences │
│                                                    │ deduplicates       │
│                          ┌─────────────────────────┼──────────┐        │
│                          ▼                         ▼          ▼        │
│                   ┌────────────┐   ┌────────────┐  ┌────────────┐     │
│                   │ email-send │   │  sms-send  │  │ push-send  │     │
│                   │  (topic)   │   │  (topic)   │  │  (topic)   │     │
│                   └─────┬──────┘   └─────┬──────┘  └─────┬──────┘     │
│                         ▼                ▼                ▼            │
│                   ┌────────────┐   ┌────────────┐  ┌────────────┐     │
│                   │ Email      │   │ SMS Worker │  │ Push Worker│     │
│                   │ Worker     │   │ (Twilio)   │  │ (FCM/APNs)│     │
│                   │ (SendGrid) │   └────────────┘  └────────────┘     │
│                   └────────────┘                                       │
│                                                                         │
│  Deduplication: notification-router stores sent IDs in Redis (TTL 24h)│
│  DLQ: Each channel has its own DLQ for failed sends                    │
│  Audit: All events flow to notification-audit topic (compacted)        │
└─────────────────────────────────────────────────────────────────────────┘
```

### Exercise B: Debug Duplicate Events

```
┌─── Scenario ───────────────────────────────────────────────────────────┐
│  Your payment service is charging customers TWICE for the same order.  │
│  The architecture: Order Service → Kafka → Payment Service → Stripe   │
│                                                                         │
│  Investigation checklist:                                               │
│  ├── 1. Is the producer sending duplicates?                            │
│  │      Check: enable.idempotence=true? producer retries configured?  │
│  │      Tool: consume with --from-beginning, grep for duplicate keys  │
│  ├── 2. Is the consumer processing twice?                              │
│  │      Check: auto.commit? commit before or after processing?        │
│  │      Scenario: crash after Stripe charge, before commit → reprocess│
│  ├── 3. Is there a rebalance causing re-delivery?                      │
│  │      Check: max.poll.interval.ms vs actual processing time          │
│  │      Check: consumer group stability (rebalance-rate metric)        │
│  └── 4. Fix options:                                                    │
│         ├── Idempotency key to Stripe (charge_idempotency_key=order_id)│
│         ├── Dedup table: processed_payments(order_id UNIQUE)           │
│         └── Exactly-once: store offset with payment record in same TX  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Exercise C: Implement Outbox Pattern

```
┌─── Task ───────────────────────────────────────────────────────────────┐
│  Given:                                                                 │
│  - Order service with PostgreSQL                                       │
│  - Requirement: when order is created, event must reach Kafka          │
│  - Must survive: app crash, network partition, Kafka downtime          │
│                                                                         │
│  Implementation steps:                                                  │
│  1. Create outbox table (see schema above)                             │
│  2. Write order + outbox INSERT in same transaction                    │
│  3. Deploy Debezium connector pointing at outbox table                 │
│  4. Use Debezium outbox SMT to route to correct topic                  │
│  5. Consumers must be idempotent (outbox relay can have duplicates)    │
│                                                                         │
│  Debezium outbox SMT config:                                           │
│  "transforms": "outbox",                                               │
│  "transforms.outbox.type":                                             │
│    "io.debezium.transforms.outbox.EventRouter",                        │
│  "transforms.outbox.table.fields.additional.placement":                │
│    "type:header:eventType",                                            │
│  "transforms.outbox.route.by.field": "aggregatetype"                   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Exercises

- [ ] **Exercise 1:** Design a partition key strategy for an e-commerce platform. Consider: orders (need per-customer ordering), inventory updates (need per-SKU ordering), and analytics events (need maximum throughput, no ordering).
  - Expected output: Document with key choices, partition counts, and hot-partition mitigation for top-1% customers.
  - Teaches: Partition key is the most consequential design decision in Kafka.

- [ ] **Exercise 2:** Implement the outbox pattern: create a service that writes to PostgreSQL + outbox table, deploy Debezium to capture outbox events, consume them in a second service. Verify zero data loss during service restart.
  - Expected output: 1000 orders created, 1000 events in Kafka, zero lost even after killing the service mid-batch.
  - Teaches: Atomic DB+event publishing.

- [ ] **Exercise 3:** Build an idempotent consumer: produce 100 messages with intentional duplicates (same key, same payload). Consumer must write each unique event exactly once to a database.
  - Expected output: 100 messages consumed, database has exactly N unique records (< 100 due to deduplication).
  - Teaches: Consumer-side exactly-once with idempotency keys.

- [ ] **Exercise 4:** Implement a choreography-based saga for: CreateOrder → ReserveInventory → ProcessPayment. Include compensation events. Test the case where payment fails and inventory is released.
  - Expected output: On payment failure, OrderCancelled and InventoryReleased events emitted. Final state is consistent.
  - Teaches: Distributed transaction pattern without 2PC.

- [ ] **Exercise 5:** Create a hot-partition detector: consume from a topic's `__consumer_offsets` or use admin API to measure messages-per-partition. Alert when any partition has > 3x the average.
  - Expected output: Tool prints per-partition rates and flags imbalanced partitions.
  - Teaches: Observability for partition-key imbalance.

- [ ] **Exercise 6:** Set up MirrorMaker 2 between two local clusters. Write to cluster A, failover consumers to cluster B using offset translation. Measure messages lost during failover.
  - Expected output: < 5 seconds of data loss (depends on replication lag). Consumer resumes near-correct offset.
  - Teaches: DR failover procedure and RPO expectations.

- [ ] **Exercise 7:** Implement event sourcing for a bank account: events are Deposited, Withdrawn, TransferSent, TransferReceived. Build the projection (current balance) by replaying events. Add snapshots every 100 events.
  - Expected output: Balance calculated correctly from event replay. With snapshot, rebuild takes < 10ms regardless of event count.
  - Teaches: Event sourcing mechanics and snapshot optimization.

- [ ] **Exercise 8:** Compare SQS vs Kafka for a task queue use case: 10 worker nodes processing image thumbnails. Measure: setup complexity, cost at 1M messages/day, and behavior when a worker dies.
  - Expected output: Written comparison showing SQS is simpler/cheaper for this specific use case.
  - Teaches: Not everything needs Kafka.

- [ ] **Exercise 9:** Implement exactly-once across services: consume from Kafka, write to PostgreSQL, and store the offset in the SAME PostgreSQL transaction. On restart, seek to the stored offset.
  - Expected output: Kill the consumer mid-batch 10 times. Database has exactly the right number of rows (no duplicates, no gaps).
  - Teaches: The "store offset with side-effect" pattern.

- [ ] **Exercise 10:** Design and implement a CDC pipeline: PostgreSQL → Debezium → Kafka → Elasticsearch. Insert/update/delete rows and verify Elasticsearch stays in sync within 5 seconds.
  - Expected output: ES index matches PG table state after all mutations. Latency < 5 seconds.
  - Teaches: End-to-end CDC pipeline construction.

- [ ] **Exercise 11:** Build an active-active multi-region simulation: two Kafka clusters (different ports), MM2 replicating both directions. Produce to both. Consume merged stream. Handle conflict (same key written to both).
  - Expected output: Merged consumer sees all events from both clusters. Conflicts resolved by timestamp (last-writer-wins).
  - Teaches: Multi-region complexity and conflict resolution.

- [ ] **Exercise 12:** Debug a "duplicate charges" scenario. Given: consumer group with 3 members, max.poll.interval.ms=30s, processing takes 45s per batch. Identify root cause and fix.
  - Expected output: Root cause identified (poll timeout → rebalance → re-delivery). Fix: reduce batch size or increase interval.
  - Teaches: The most common production bug pattern.

---

## Checkpoint Questions

1. When would you choose RabbitMQ over Kafka? Give two concrete scenarios.
2. Explain why "write to DB then publish to Kafka" is unsafe. What failure mode causes inconsistency?
3. In event sourcing, what is the purpose of a snapshot? When would you NOT need one?
4. What is the difference between choreography and orchestration sagas? Which is easier to debug?
5. A topic has 12 partitions, key is user_id. One user generates 50% of traffic. What are your options?
6. In active-active multi-region, what causes an "infinite replication loop" and how does MirrorMaker 2 prevent it?
7. How does the "store offset in same DB transaction" pattern achieve exactly-once without Kafka transactions?

---

## References

- [Kafka Documentation: Design](https://kafka.apache.org/documentation/#design)
- [Confluent Blog: Event Sourcing with Kafka](https://www.confluent.io/blog/event-sourcing-cqrs-stream-processing-apache-kafka-whats-connection/)
- [Confluent Blog: Saga Pattern](https://www.confluent.io/blog/saga-pattern-in-apache-kafka/)
- [Debezium Documentation](https://debezium.io/documentation/)
- [Confluent Blog: Outbox Pattern](https://www.confluent.io/blog/outbox-pattern-confluent-cloud-apache-kafka/)
- [The Log: What Every Engineer Should Know](https://engineering.linkedin.com/distributed-systems/log-what-every-software-engineer-should-know-about-real-time-datas-unifying)
- [Uber: Kafka Multi-Region](https://www.uber.com/blog/kafka/)
- [Kafka MirrorMaker 2](https://kafka.apache.org/documentation/#georeplication)

---

## Cheatsheet

```
┌──────────────────────────────────────────────────────────────────────────┐
│  WHEN TO USE KAFKA                                                        │
│  Event log / replay needed        → Kafka                                │
│  Stream processing                → Kafka                                │
│  CDC / data pipeline              → Kafka + Debezium                     │
│  Simple task queue < 10k/s        → SQS or RabbitMQ                     │
│  Request-reply (RPC)              → gRPC or RabbitMQ                     │
│  Sub-millisecond pub/sub          → NATS or Redis                        │
├──────────────────────────────────────────────────────────────────────────┤
│  PATTERNS                                                                 │
│  Outbox: DB write + outbox INSERT in same TX → Debezium → Kafka          │
│  Saga: sequence of local TXs + compensation events via Kafka             │
│  CQRS: write to Kafka, project to read-optimized store                   │
│  Idempotent consumer: dedup by event ID before processing                │
│  EOS across services: store offset in same DB TX as side-effect          │
├──────────────────────────────────────────────────────────────────────────┤
│  PARTITION KEY RULES                                                      │
│  1. Key = smallest ordering unit (entity ID)                             │
│  2. High cardinality = good distribution                                 │
│  3. null key = round-robin (no ordering)                                 │
│  4. Hot key? → bucket or composite key                                   │
│  5. NEVER change key strategy on existing topic (breaks ordering)        │
├──────────────────────────────────────────────────────────────────────────┤
│  MULTI-REGION                                                             │
│  Active-passive: one-way MM2, failover on disaster                       │
│  Active-active: bidirectional MM2, partition keys by region              │
│  Stretch cluster: single cluster across AZs (broker.rack)               │
│  RPO: typically seconds (MM2 replication lag)                            │
│  RTO: DNS switch + offset translation (minutes)                          │
├──────────────────────────────────────────────────────────────────────────┤
│  ANTI-PATTERNS                                                            │
│  Dual-write (DB + Kafka separately)  → use outbox pattern               │
│  Kafka as database                    → it is a log, not a DB            │
│  Kafka for RPC                        → use gRPC                         │
│  Too many partitions (>10k/cluster)   → controller bottleneck            │
│  Shared topic for unrelated events    → separate topics per domain       │
└──────────────────────────────────────────────────────────────────────────┘
```
