# Phase 4 — Kafka Ecosystem: Connect, Schema Registry, Streams & MirrorMaker

> "Kafka alone is a log. Kafka with its ecosystem is a data platform."

---

## 4.1 — Kafka Connect

```
┌─── Kafka Connect Architecture ─────────────────────────────────────────┐
│                                                                         │
│   External Systems              Kafka              External Systems     │
│  ┌──────────────┐     ┌──────────────────┐     ┌──────────────┐       │
│  │  PostgreSQL  │────►│                  │────►│ Elasticsearch│       │
│  │  (Source)    │     │   Kafka Connect  │     │  (Sink)      │       │
│  └──────────────┘     │                  │     └──────────────┘       │
│  ┌──────────────┐     │  ┌────────────┐  │     ┌──────────────┐       │
│  │  MongoDB     │────►│  │  Workers   │  │────►│  S3 Bucket   │       │
│  │  (Source)    │     │  │  (JVMs)    │  │     │  (Sink)      │       │
│  └──────────────┘     │  └────────────┘  │     └──────────────┘       │
│                        │                  │                             │
│                        └──────────────────┘                             │
│                                                                         │
│  Modes:                                                                 │
│  ├── Standalone: single process, for dev/testing                       │
│  └── Distributed: multiple workers, fault-tolerant, for production     │
└─────────────────────────────────────────────────────────────────────────┘
```

### Connector vs Task vs Worker

```
┌─── Hierarchy ──────────────────────────────────────────────────────────┐
│                                                                         │
│  Connector (logical)                                                    │
│  ├── Task 0 ──► assigned to Worker A                                   │
│  ├── Task 1 ──► assigned to Worker B                                   │
│  └── Task 2 ──► assigned to Worker C                                   │
│                                                                         │
│  Worker A          Worker B          Worker C                          │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐                      │
│  │ Task 0   │     │ Task 1   │     │ Task 2   │                      │
│  │ Task 5   │     │ Task 3   │     │ Task 4   │                      │
│  │(from other│     │          │     │          │                      │
│  │connector) │     │          │     │          │                      │
│  └──────────┘     └──────────┘     └──────────┘                      │
│                                                                         │
│  Internal topics (distributed mode):                                    │
│  ├── connect-configs  (connector configurations)                       │
│  ├── connect-offsets  (source connector position tracking)             │
│  └── connect-status   (connector/task status)                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**The sentence to remember:** Kafka Connect moves data IN and OUT of Kafka without writing code — just JSON config for source/sink connectors.

**The trap:** Connect stores offsets internally. If you delete the `connect-offsets` topic, source connectors will re-read everything from the beginning (full re-sync).

### Connect REST API

```bash
# List installed connector plugins
curl http://localhost:8083/connector-plugins | jq

# Create a source connector
curl -X POST http://localhost:8083/connectors -H "Content-Type: application/json" -d '{
  "name": "postgres-source",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": "postgres",
    "database.port": "5432",
    "database.user": "kafka",
    "database.password": "kafka",
    "database.dbname": "orders",
    "topic.prefix": "cdc",
    "table.include.list": "public.orders",
    "plugin.name": "pgoutput"
  }
}'

# Check connector status
curl http://localhost:8083/connectors/postgres-source/status | jq

# Pause / Resume / Delete
curl -X PUT http://localhost:8083/connectors/postgres-source/pause
curl -X PUT http://localhost:8083/connectors/postgres-source/resume
curl -X DELETE http://localhost:8083/connectors/postgres-source
```

---

## 4.2 — Schema Registry

```
┌─── Schema Registry Architecture ──────────────────────────────────────┐
│                                                                         │
│  Producer                     Schema Registry            Consumer       │
│  ┌──────────┐                ┌──────────────┐           ┌──────────┐  │
│  │ Serialize│───register────►│  _schemas    │◄──fetch───│Deserialize│ │
│  │ (Avro)   │   schema       │  (internal   │  schema   │ (Avro)   │  │
│  │          │◄──schema_id────│   topic)     │───id+────►│          │  │
│  └────┬─────┘                └──────────────┘   schema  └────┬─────┘  │
│       │                                                       │        │
│       ▼                                                       ▼        │
│  ┌──────────────────── Kafka Message Format ───────────────────────┐  │
│  │ [0x00] [4-byte schema_id] [Avro/Protobuf/JSON encoded payload] │  │
│  │  magic    (big-endian)         (no schema embedded!)            │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Compatibility Modes

```
┌─── Schema Compatibility Matrix ────────────────────────────────────────┐
│                                                                         │
│  Mode              │ Add Field │ Remove Field │ Change Type │ Use Case │
│  ──────────────────┼───────────┼──────────────┼─────────────┼──────────│
│  BACKWARD          │ + default │ ✓ (reader    │ ✗           │ Consumer │
│  (new reads old)   │   only    │   ignores)   │             │ upgrades │
│  ──────────────────┼───────────┼──────────────┼─────────────┼──────────│
│  FORWARD           │ ✓ (old    │ + default    │ ✗           │ Producer │
│  (old reads new)   │  ignores) │   only       │             │ upgrades │
│  ──────────────────┼───────────┼──────────────┼─────────────┼──────────│
│  FULL              │ + default │ + default    │ ✗           │ Both     │
│  (both directions) │   only    │   only       │             │ upgrade  │
│  ──────────────────┼───────────┼──────────────┼─────────────┼──────────│
│  NONE              │ ✓         │ ✓            │ ✓           │ Dev only │
│  (no checking)     │           │              │             │          │
└─────────────────────────────────────────────────────────────────────────┘

  BACKWARD_TRANSITIVE: checked against ALL previous versions (not just latest)
  FORWARD_TRANSITIVE:  checked against ALL previous versions
  FULL_TRANSITIVE:     checked against ALL previous versions (RECOMMENDED)
```

**The sentence to remember:** Schema Registry decouples schema from payload — producers register, consumers fetch by ID, and compatibility rules prevent breaking changes.

**The trap:** `BACKWARD` compatibility only checks against the LATEST version. Use `BACKWARD_TRANSITIVE` or `FULL_TRANSITIVE` to guarantee compatibility with ALL historical versions.

### Schema Registry REST API

```bash
# List subjects
curl http://localhost:8081/subjects | jq

# Get latest schema for a subject
curl http://localhost:8081/subjects/orders-value/versions/latest | jq

# Register a new schema
curl -X POST http://localhost:8081/subjects/orders-value/versions \
  -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  -d '{"schema": "{\"type\":\"record\",\"name\":\"Order\",\"fields\":[{\"name\":\"id\",\"type\":\"string\"},{\"name\":\"amount\",\"type\":\"double\"},{\"name\":\"status\",\"type\":\"string\"}]}"}'

# Test compatibility
curl -X POST http://localhost:8081/compatibility/subjects/orders-value/versions/latest \
  -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  -d '{"schema": "{\"type\":\"record\",\"name\":\"Order\",\"fields\":[{\"name\":\"id\",\"type\":\"string\"},{\"name\":\"amount\",\"type\":\"double\"},{\"name\":\"status\",\"type\":\"string\"},{\"name\":\"region\",\"type\":[\"null\",\"string\"],\"default\":null}]}"}'

# Set compatibility level
curl -X PUT http://localhost:8081/config/orders-value \
  -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  -d '{"compatibility": "FULL_TRANSITIVE"}'
```

---

## 4.3 — Kafka Streams (Concepts + Go Equivalent)

```
┌─── Kafka Streams Topology ─────────────────────────────────────────────┐
│                                                                         │
│  Source ──► Processor ──► Processor ──► Sink                           │
│  (topic)    (filter)      (aggregate)   (topic)                        │
│                                                                         │
│  ┌─────────┐    ┌──────────┐    ┌───────────┐    ┌─────────┐         │
│  │ orders  │───►│  Filter  │───►│ GroupByKey│───►│ counts  │         │
│  │ (input) │    │status=OK │    │  + Count  │    │ (output)│         │
│  └─────────┘    └──────────┘    └───────────┘    └─────────┘         │
│                                        │                               │
│                                        ▼                               │
│                                  ┌───────────┐                         │
│                                  │  State    │                         │
│                                  │  Store    │                         │
│                                  │ (RocksDB) │                         │
│                                  └───────────┘                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### KStream vs KTable

```
┌─── KStream (Event Stream) ──────────────────────────────────────────┐
│  Each record is an independent event (append-only)                   │
│                                                                       │
│  offset 0: {user: "alice", action: "login"}                          │
│  offset 1: {user: "alice", action: "purchase"}                       │
│  offset 2: {user: "alice", action: "logout"}                         │
│                                                                       │
│  All 3 records exist independently. Processing sees ALL events.      │
├─────────────────────────────────────────────────────────────────────┤
│  KTable (Changelog / Materialized View)                              │
│  Each record is an UPDATE for that key (latest wins)                 │
│                                                                       │
│  offset 0: {user: "alice", balance: 100}                             │
│  offset 1: {user: "alice", balance: 75}   ← replaces previous       │
│  offset 2: {user: "alice", balance: 50}   ← replaces previous       │
│                                                                       │
│  Current state: alice.balance = 50 (only latest matters)             │
└─────────────────────────────────────────────────────────────────────┘
```

### Windowing Types

```
┌─── Tumbling Window (fixed, non-overlapping) ───────────────────────┐
│  ┌─────┐┌─────┐┌─────┐┌─────┐                                     │
│  │ 0-5 ││ 5-10││10-15││15-20│  (5-second windows)                 │
│  └─────┘└─────┘└─────┘└─────┘                                     │
├────────────────────────────────────────────────────────────────────┤
│  Hopping Window (fixed, overlapping)                                │
│  ┌─────────┐                                                        │
│  │  0-10   │   window size=10s, advance=5s                         │
│  └───┌─────────┐                                                    │
│      │  5-15   │                                                    │
│      └───┌─────────┐                                                │
│          │  10-20  │                                                 │
│          └─────────┘                                                │
├────────────────────────────────────────────────────────────────────┤
│  Session Window (gap-based, per key)                                │
│  ┌──────┐      ┌──────────────┐   ┌───┐                           │
│  │events│ gap  │   events     │gap│evt│                            │
│  └──────┘      └──────────────┘   └───┘                           │
│  (inactivity gap closes the window)                                 │
└────────────────────────────────────────────────────────────────────┘
```

**The sentence to remember:** KStream = every event matters (clickstream); KTable = only latest state matters (account balance). Choose based on your read pattern.

**The trap:** Kafka Streams is Java-only. In Go, you build equivalent topologies manually using kafka-go consumers, local state (BoltDB/BadgerDB), and kafka-go producers.

### Go Equivalent: Stream Processing with State

```go
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/segmentio/kafka-go"
)

// Equivalent of KTable: in-memory state store
type CountStore struct {
	mu     sync.RWMutex
	counts map[string]int64
}

func (s *CountStore) Increment(key string) int64 {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.counts[key]++
	return s.counts[key]
}

func (s *CountStore) Get(key string) int64 {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.counts[key]
}

type OrderEvent struct {
	UserID string `json:"user_id"`
	Status string `json:"status"`
	Amount float64 `json:"amount"`
}

func main() {
	store := &CountStore{counts: make(map[string]int64)}

	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers: []string{"localhost:9092"},
		GroupID: "order-counter",
		Topic:   "orders",
	})
	defer reader.Close()

	writer := &kafka.Writer{
		Addr:  kafka.TCP("localhost:9092"),
		Topic: "order-counts",
	}
	defer writer.Close()

	ctx := context.Background()

	for {
		msg, err := reader.FetchMessage(ctx)
		if err != nil {
			log.Printf("fetch: %v", err)
			continue
		}

		var order OrderEvent
		if err := json.Unmarshal(msg.Value, &order); err != nil {
			log.Printf("unmarshal: %v", err)
			reader.CommitMessages(ctx, msg)
			continue
		}

		// Filter: only completed orders (equivalent of .filter())
		if order.Status != "completed" {
			reader.CommitMessages(ctx, msg)
			continue
		}

		// GroupByKey + Count (equivalent of .groupByKey().count())
		newCount := store.Increment(order.UserID)

		// Emit to output topic (equivalent of .toStream().to())
		output, _ := json.Marshal(map[string]interface{}{
			"user_id": order.UserID,
			"count":   newCount,
			"updated": time.Now().Unix(),
		})

		writer.WriteMessages(ctx, kafka.Message{
			Key:   []byte(order.UserID),
			Value: output,
		})

		reader.CommitMessages(ctx, msg)
		fmt.Printf("User %s: %d completed orders\n", order.UserID, newCount)
	}
}
```

---

## 4.4 — MirrorMaker 2

```
┌─── MirrorMaker 2 Architecture ────────────────────────────────────────┐
│                                                                         │
│  Cluster A (US-East)              Cluster B (EU-West)                  │
│  ┌──────────────────┐            ┌──────────────────┐                 │
│  │  orders          │────MM2────►│  us-east.orders  │                 │
│  │  users           │────MM2────►│  us-east.users   │                 │
│  │  payments        │────MM2────►│  us-east.payments│                 │
│  └──────────────────┘            └──────────────────┘                 │
│                                                                         │
│  MM2 Components (built on Kafka Connect):                              │
│  ├── MirrorSourceConnector:  replicates topic data                     │
│  ├── MirrorCheckpointConnector: replicates consumer offsets            │
│  └── MirrorHeartbeatConnector: monitors replication health             │
│                                                                         │
│  Key features vs MM1:                                                   │
│  ├── Automatic topic creation with prefix (source.topic)               │
│  ├── Consumer offset translation (for failover)                        │
│  ├── No rebalance storms (uses Connect framework)                      │
│  └── Supports active-active replication                                │
└─────────────────────────────────────────────────────────────────────────┘
```

**The sentence to remember:** MirrorMaker 2 replicates topics AND consumer offsets between clusters, enabling disaster recovery with minimal data loss.

**The trap:** Topic names are prefixed with source cluster alias (e.g., `us-east.orders`). Consumer applications in the DR cluster need config to read from prefixed topics.

---

## 4.5 — Dead-Letter Patterns in Connect

```
┌─── Connect Error Handling ─────────────────────────────────────────────┐
│                                                                         │
│  Source/Sink Connector                                                  │
│       │                                                                 │
│       ▼                                                                 │
│  ┌─────────────────────┐                                               │
│  │  errors.tolerance   │                                               │
│  │  = none (default)   │──► Connector FAILS on first bad record        │
│  │  = all              │──► Connector skips bad records                 │
│  └─────────────────────┘                                               │
│            │ (when errors.tolerance=all)                                │
│            ▼                                                            │
│  ┌─────────────────────────────┐                                       │
│  │  errors.deadletterqueue     │                                       │
│  │  .topic.name = "dlq-sink"  │──► Bad records go to DLQ topic        │
│  │  .topic.replication.factor=3│                                       │
│  └─────────────────────────────┘                                       │
│            │                                                            │
│            ▼                                                            │
│  ┌─────────────────────────────┐                                       │
│  │  errors.deadletterqueue     │                                       │
│  │  .context.headers.enable    │                                       │
│  │  = true                     │──► Adds error context as headers      │
│  └─────────────────────────────┘                                       │
│                                                                         │
│  DLQ message headers include:                                          │
│  ├── __connect.errors.topic                                            │
│  ├── __connect.errors.partition                                        │
│  ├── __connect.errors.offset                                           │
│  ├── __connect.errors.connector.name                                   │
│  ├── __connect.errors.task.id                                          │
│  ├── __connect.errors.stage                                            │
│  └── __connect.errors.exception.message                                │
└─────────────────────────────────────────────────────────────────────────┘
```

**The sentence to remember:** Set `errors.tolerance=all` + DLQ topic in production sinks — a single bad record should not halt your entire pipeline.

**The trap:** Without `context.headers.enable=true`, DLQ messages have no context about WHY they failed. Always enable headers.

---

## 4.6 — Docker Compose: Full Ecosystem

```yaml
# docker-compose.yml - Kafka + Schema Registry + Connect + Control Center
version: '3.8'

services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    ports:
      - "2181:2181"

  kafka-1:
    image: confluentinc/cp-kafka:7.5.0
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka-1:29092,EXTERNAL://localhost:9092
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,EXTERNAL:PLAINTEXT
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: "false"

  schema-registry:
    image: confluentinc/cp-schema-registry:7.5.0
    depends_on:
      - kafka-1
    ports:
      - "8081:8081"
    environment:
      SCHEMA_REGISTRY_HOST_NAME: schema-registry
      SCHEMA_REGISTRY_KAFKASTORE_BOOTSTRAP_SERVERS: kafka-1:29092
      SCHEMA_REGISTRY_LISTENERS: http://0.0.0.0:8081

  kafka-connect:
    image: confluentinc/cp-kafka-connect:7.5.0
    depends_on:
      - kafka-1
      - schema-registry
    ports:
      - "8083:8083"
    environment:
      CONNECT_BOOTSTRAP_SERVERS: kafka-1:29092
      CONNECT_REST_ADVERTISED_HOST_NAME: kafka-connect
      CONNECT_REST_PORT: 8083
      CONNECT_GROUP_ID: connect-cluster
      CONNECT_CONFIG_STORAGE_TOPIC: connect-configs
      CONNECT_OFFSET_STORAGE_TOPIC: connect-offsets
      CONNECT_STATUS_STORAGE_TOPIC: connect-status
      CONNECT_CONFIG_STORAGE_REPLICATION_FACTOR: 1
      CONNECT_OFFSET_STORAGE_REPLICATION_FACTOR: 1
      CONNECT_STATUS_STORAGE_REPLICATION_FACTOR: 1
      CONNECT_KEY_CONVERTER: org.apache.kafka.connect.storage.StringConverter
      CONNECT_VALUE_CONVERTER: io.confluent.connect.avro.AvroConverter
      CONNECT_VALUE_CONVERTER_SCHEMA_REGISTRY_URL: http://schema-registry:8081
      CONNECT_PLUGIN_PATH: /usr/share/java,/usr/share/confluent-hub-components
    command:
      - bash
      - -c
      - |
        confluent-hub install --no-prompt debezium/debezium-connector-postgresql:2.4.0
        confluent-hub install --no-prompt confluentinc/kafka-connect-elasticsearch:14.0.0
        /etc/confluent/docker/run

  # Optional: Confluent Control Center for UI
  control-center:
    image: confluentinc/cp-enterprise-control-center:7.5.0
    depends_on:
      - kafka-1
      - schema-registry
      - kafka-connect
    ports:
      - "9021:9021"
    environment:
      CONTROL_CENTER_BOOTSTRAP_SERVERS: kafka-1:29092
      CONTROL_CENTER_SCHEMA_REGISTRY_URL: http://schema-registry:8081
      CONTROL_CENTER_CONNECT_CONNECT-DEFAULT_CLUSTER: http://kafka-connect:8083
      CONTROL_CENTER_REPLICATION_FACTOR: 1
```

---

## Go Code: Producer with Schema Registry (JSON Schema)

```go
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/segmentio/kafka-go"
)

// In Go, Schema Registry integration is manual.
// You register schemas via REST, then encode with the wire format:
// [0x00][4-byte schema ID][payload]

type Order struct {
	ID        string  `json:"id"`
	UserID    string  `json:"user_id"`
	Amount    float64 `json:"amount"`
	Status    string  `json:"status"`
	CreatedAt string  `json:"created_at"`
}

func encodeWithSchemaID(schemaID uint32, payload []byte) []byte {
	// Wire format: magic byte (0) + 4-byte big-endian schema ID + payload
	buf := make([]byte, 5+len(payload))
	buf[0] = 0x00 // magic byte
	buf[1] = byte(schemaID >> 24)
	buf[2] = byte(schemaID >> 16)
	buf[3] = byte(schemaID >> 8)
	buf[4] = byte(schemaID)
	copy(buf[5:], payload)
	return buf
}

func main() {
	// In production, register schema via REST API first and get the schema ID.
	// For this example, assume schema ID = 1 (registered separately).
	var schemaID uint32 = 1

	w := &kafka.Writer{
		Addr:         kafka.TCP("localhost:9092"),
		Topic:        "orders",
		Balancer:     &kafka.Murmur2Balancer{},
		RequiredAcks: kafka.RequireAll,
	}
	defer w.Close()

	order := Order{
		ID:        "ord-001",
		UserID:    "user-42",
		Amount:    99.99,
		Status:    "completed",
		CreatedAt: time.Now().Format(time.RFC3339),
	}

	payload, err := json.Marshal(order)
	if err != nil {
		log.Fatal(err)
	}

	encoded := encodeWithSchemaID(schemaID, payload)

	err = w.WriteMessages(context.Background(), kafka.Message{
		Key:   []byte(order.ID),
		Value: encoded,
	})
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("Produced order %s with schema ID %d\n", order.ID, schemaID)
}
```

---

## Exercises

- [ ] **Exercise 1:** Deploy the docker-compose stack above. Verify Schema Registry is healthy at `http://localhost:8081/subjects`. Verify Connect at `http://localhost:8083/connector-plugins`.
  - Expected output: Schema Registry returns `[]`, Connect returns a list of installed plugins including Debezium.
  - Teaches: Ecosystem deployment and health verification.

- [ ] **Exercise 2:** Register an Avro schema for `orders-value` subject. Then register a BACKWARD-compatible evolution (add a field with default). Then attempt an incompatible change (remove a required field) and observe the 409 error.
  - Expected output: First two registrations succeed (versions 1, 2). Third returns HTTP 409 with compatibility error.
  - Teaches: Schema evolution rules and how Registry enforces them.

- [ ] **Exercise 3:** Create a Debezium PostgreSQL source connector via REST API. Insert/update/delete rows in Postgres and observe CDC events in the Kafka topic.
  - Expected output: Topics `cdc.public.orders` created automatically with insert/update/delete events.
  - Teaches: CDC with Debezium — the foundation of event-driven architectures.

- [ ] **Exercise 4:** Create an Elasticsearch sink connector. Produce 100 JSON messages to a topic. Verify they appear in an Elasticsearch index.
  - Expected output: `curl localhost:9200/topic-name/_count` returns 100.
  - Teaches: Sink connectors and exactly-once delivery to external systems.

- [ ] **Exercise 5:** Configure a sink connector with `errors.tolerance=all` and a DLQ topic. Produce 10 messages where 3 have invalid schema. Verify 7 reach the sink and 3 land in DLQ with headers.
  - Expected output: Sink has 7 records, DLQ has 3 with `__connect.errors.*` headers.
  - Teaches: Production error handling in Connect pipelines.

- [ ] **Exercise 6:** Implement the Go stream-processing example above (filter + count). Produce 1000 order events with random statuses. Verify the `order-counts` topic has correct per-user counts.
  - Expected output: `order-counts` topic contains one record per user with their completed order count.
  - Teaches: Building Kafka Streams equivalent logic in Go.

- [ ] **Exercise 7:** Implement tumbling window aggregation in Go: count events per 10-second window. Use message timestamps (not wall clock).
  - Expected output: Output topic has entries like `{window: "2024-01-01T10:00:00/10s", count: 42}`.
  - Teaches: Windowed aggregation without Kafka Streams library.

- [ ] **Exercise 8:** Set up MirrorMaker 2 between two local Kafka clusters (different ports). Produce to cluster A, verify data appears in cluster B with the source prefix.
  - Expected output: Topic `cluster-a.orders` exists on cluster B with replicated data.
  - Teaches: Cross-cluster replication for disaster recovery.

- [ ] **Exercise 9:** Write a schema compatibility checker in Go: given two JSON schemas, determine if evolution is BACKWARD compatible (new can read old).
  - Expected output: Program prints COMPATIBLE or INCOMPATIBLE with explanation.
  - Teaches: Schema evolution rules at the code level.

- [ ] **Exercise 10:** Configure Connect with `exactly.once.source.support=enabled` (requires Kafka 3.3+). Produce duplicate source events and verify only one copy reaches the topic.
  - Expected output: Source events are deduplicated even if the connector task restarts mid-batch.
  - Teaches: Exactly-once guarantees in the Connect framework.

---

## Checkpoint Questions

1. What are the three internal topics Kafka Connect uses in distributed mode? What happens if you delete one?
2. Explain the wire format of a Schema Registry-encoded message. Why is the schema NOT embedded in every message?
3. What is the difference between BACKWARD and FORWARD compatibility? Give an example schema change for each.
4. In what scenario would you use KStream join KTable? Give a real-world example.
5. Why does MirrorMaker 2 prefix topic names? How does consumer offset translation work for failover?
6. What is the advantage of Debezium over a JDBC source connector for CDC?
7. How would you implement windowed aggregation in Go without Kafka Streams?

---

## References

- [Kafka Connect Documentation](https://kafka.apache.org/documentation/#connect)
- [Confluent Schema Registry](https://docs.confluent.io/platform/current/schema-registry/index.html)
- [Schema Compatibility Types](https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html)
- [Kafka Streams Documentation](https://kafka.apache.org/documentation/streams/)
- [MirrorMaker 2 Documentation](https://kafka.apache.org/documentation/#georeplication)
- [Debezium PostgreSQL Connector](https://debezium.io/documentation/reference/connectors/postgresql.html)
- [Confluent Blog: Kafka Connect Deep Dive](https://www.confluent.io/blog/kafka-connect-deep-dive-error-handling-dead-letter-queues/)

---

## Cheatsheet

```
┌──────────────────────────────────────────────────────────────────────────┐
│  KAFKA CONNECT                                                            │
│  curl :8083/connectors                 List connectors                   │
│  curl :8083/connectors/X/status        Check health                      │
│  curl -X PUT :8083/connectors/X/pause  Pause connector                   │
│  errors.tolerance=all                  Skip bad records                   │
│  errors.deadletterqueue.topic.name=X   DLQ topic                         │
│  errors.deadletterqueue.context.headers.enable=true  Error context       │
├──────────────────────────────────────────────────────────────────────────┤
│  SCHEMA REGISTRY                                                          │
│  curl :8081/subjects                   List subjects                      │
│  curl :8081/subjects/X/versions/latest Get latest schema                 │
│  curl :8081/config/X                   Get compatibility level           │
│  Wire format: [0x00][schemaID:4bytes][payload]                           │
│  FULL_TRANSITIVE = safest compatibility mode                             │
├──────────────────────────────────────────────────────────────────────────┤
│  STREAMS CONCEPTS (Go equivalents)                                        │
│  KStream     = consumer loop processing every event                      │
│  KTable      = compacted topic + local state store                       │
│  filter()    = if condition { continue }                                 │
│  map()       = transform before writing to output                        │
│  groupByKey()= map[key]aggregate in memory                               │
│  windowed()  = map[key+window]aggregate with TTL                         │
├──────────────────────────────────────────────────────────────────────────┤
│  MIRRORMAKER 2                                                            │
│  source.cluster.alias=us-east          Prefix for replicated topics      │
│  topics=.*                             Replicate all topics               │
│  emit.checkpoints.interval.seconds=60  Offset sync interval              │
│  replication.factor=3                  For replicated topics              │
└──────────────────────────────────────────────────────────────────────────┘
```
