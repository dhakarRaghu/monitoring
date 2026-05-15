# Phase 5 — Kafka in Production: Cloud, Monitoring, Operations & Security

> "Running Kafka in dev is easy. Running it in production with SLAs is engineering."

---

## 5.1 — AWS MSK: Serverless vs Provisioned

```
┌─── MSK Decision Matrix ───────────────────────────────────────────────┐
│                                                                         │
│              │ MSK Serverless        │ MSK Provisioned                  │
│  ────────────┼───────────────────────┼──────────────────────────────── │
│  Scaling     │ Automatic             │ Manual (add brokers)            │
│  Pricing     │ Per GB in/out + storage│ Per broker-hour + EBS          │
│  Max topics  │ Soft limit (adjustable)│ Unlimited                      │
│  Max partitions│ Soft limit           │ Thousands per broker           │
│  Networking  │ VPC + IAM auth only   │ VPC, TLS, SASL, IAM            │
│  KRaft       │ Built-in              │ ZK or KRaft                     │
│  Connect     │ Not integrated        │ Managed Connect available       │
│  Customize   │ Limited configs       │ Full broker config access       │
│  Use case    │ Bursty, < 200 MB/s    │ Sustained, predictable load    │
│  ────────────┼───────────────────────┼──────────────────────────────── │
│  CHOOSE IF:  │ Starting out, variable│ High throughput, need control   │
│              │ traffic, want zero ops│ over configs and scaling        │
└─────────────────────────────────────────────────────────────────────────┘
```

### MSK Provisioned Sizing

```
┌─── Capacity Planning Formula ──────────────────────────────────────────┐
│                                                                         │
│  Given:                                                                 │
│    ingress_mbps = total produce throughput in MB/s                      │
│    replication_factor = 3                                               │
│    num_consumers = number of consumer groups reading all data           │
│    retention_hours = 72 (3 days)                                        │
│                                                                         │
│  Calculations:                                                          │
│    write_per_broker = ingress_mbps * replication_factor / num_brokers  │
│    read_per_broker = ingress_mbps * (num_consumers + rf - 1) / num_brokers│
│    network_per_broker = write + read  (must be < 70% of NIC capacity)  │
│                                                                         │
│    storage_needed = ingress_mbps * 3600 * retention_hours * rf         │
│    storage_per_broker = storage_needed / num_brokers                    │
│                                                                         │
│  Example:                                                               │
│    50 MB/s ingress, rf=3, 5 consumer groups, 72h retention, 6 brokers │
│    write/broker = 50 * 3 / 6 = 25 MB/s                                │
│    read/broker = 50 * (5 + 2) / 6 = 58 MB/s                           │
│    network/broker = 83 MB/s (needs kafka.m5.2xlarge or bigger)         │
│    storage = 50 * 3600 * 72 * 3 = 38,880 GB total = 6.5 TB/broker    │
│                                                                         │
│  Partition count formula:                                               │
│    partitions = max(throughput_partitions, consumer_partitions)         │
│    throughput_partitions = target_throughput / per_partition_throughput  │
│    consumer_partitions = max_consumers_in_group                         │
│                                                                         │
│  Rule of thumb: ~10 MB/s per partition (producer), 30 MB/s (consumer) │
│  For 50 MB/s ingress: at least 5 partitions (but 12-24 for headroom)  │
└─────────────────────────────────────────────────────────────────────────┘
```

**The sentence to remember:** MSK Serverless for < 200 MB/s and zero-ops; MSK Provisioned for predictable high throughput with full config control.

**The trap:** MSK Serverless charges per GB transferred — at high, sustained throughput it becomes MORE expensive than Provisioned. Do the math at your expected volume.

---

## 5.2 — Key JMX Metrics to Monitor

```
┌─── Critical Broker Metrics ────────────────────────────────────────────┐
│                                                                         │
│  Metric                          │ Alert Threshold  │ Meaning          │
│  ────────────────────────────────┼──────────────────┼──────────────────│
│  UnderReplicatedPartitions       │ > 0 for 5 min   │ Data at risk     │
│  OfflinePartitionsCount          │ > 0             │ DATA UNAVAILABLE │
│  ActiveControllerCount           │ != 1 cluster-wide│ Split brain/none │
│  BytesInPerSec                   │ > 80% NIC cap   │ Broker saturated │
│  BytesOutPerSec                  │ > 80% NIC cap   │ Consumer load    │
│  RequestsPerSec                  │ > 80% capacity  │ Request overload │
│  IsrShrinksPerSec                │ > 0 sustained   │ Follower issues  │
│  IsrExpandsPerSec                │ observe after shrink│ Recovery      │
│  NetworkProcessorAvgIdlePercent  │ < 30%           │ Network threads  │
│  RequestHandlerAvgIdlePercent    │ < 30%           │ IO threads busy  │
│  LogFlushRateAndTimeMs (99th)    │ > 100ms         │ Disk bottleneck  │
│  FetchConsumerTotalTimeMs (99th) │ > 500ms         │ Slow fetches     │
│  ProduceTotalTimeMs (99th)       │ > 200ms         │ Slow produces    │
├─────────────────────────────────────────────────────────────────────────┤
│  Critical Consumer Metrics                                              │
│  ────────────────────────────────┼──────────────────┼──────────────────│
│  records-lag-max                 │ > 10000 sustained│ Consumer falling │
│  records-consumed-rate           │ sudden drop      │ Processing stall │
│  commit-rate                     │ sudden drop      │ Commit failures  │
│  rebalance-rate-per-hour         │ > 2             │ Unstable group   │
└─────────────────────────────────────────────────────────────────────────┘
```

**The sentence to remember:** `UnderReplicatedPartitions > 0` is your #1 alert — it means acknowledged data could be lost if another broker dies NOW.

**The trap:** `BytesOutPerSec` includes replication traffic. A 3-node cluster with 100 MB/s ingress generates 200 MB/s of ADDITIONAL internal replication traffic.

---

## 5.3 — Prometheus + Grafana Setup

### JMX Exporter Configuration

```yaml
# kafka-jmx-exporter.yml
lowercaseOutputName: true
lowercaseOutputLabelNames: true
rules:
  # Broker metrics
  - pattern: kafka.server<type=ReplicaManager, name=UnderReplicatedPartitions><>Value
    name: kafka_server_underreplicated_partitions
    type: GAUGE

  - pattern: kafka.server<type=BrokerTopicMetrics, name=BytesInPerSec><>OneMinuteRate
    name: kafka_server_bytes_in_per_sec
    type: GAUGE

  - pattern: kafka.server<type=BrokerTopicMetrics, name=BytesOutPerSec><>OneMinuteRate
    name: kafka_server_bytes_out_per_sec
    type: GAUGE

  - pattern: kafka.controller<type=KafkaController, name=OfflinePartitionsCount><>Value
    name: kafka_controller_offline_partitions
    type: GAUGE

  - pattern: kafka.controller<type=KafkaController, name=ActiveControllerCount><>Value
    name: kafka_controller_active_count
    type: GAUGE

  - pattern: kafka.server<type=ReplicaManager, name=IsrShrinksPerSec><>OneMinuteRate
    name: kafka_server_isr_shrinks_per_sec
    type: GAUGE

  - pattern: kafka.network<type=RequestMetrics, name=TotalTimeMs, request=Produce><>99thPercentile
    name: kafka_network_produce_total_time_ms_p99
    type: GAUGE

  - pattern: kafka.network<type=RequestMetrics, name=TotalTimeMs, request=FetchConsumer><>99thPercentile
    name: kafka_network_fetch_consumer_total_time_ms_p99
    type: GAUGE

  - pattern: kafka.log<type=LogFlushStats, name=LogFlushRateAndTimeMs><>99thPercentile
    name: kafka_log_flush_time_ms_p99
    type: GAUGE
```

### Prometheus Alert Rules

```yaml
# kafka-alerts.yml
groups:
  - name: kafka_critical
    rules:
      - alert: KafkaUnderReplicatedPartitions
        expr: kafka_server_underreplicated_partitions > 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Broker {{ $labels.instance }} has {{ $value }} under-replicated partitions"
          description: "Data durability is at risk. Investigate broker health immediately."

      - alert: KafkaOfflinePartitions
        expr: kafka_controller_offline_partitions > 0
        for: 1m
        labels:
          severity: page
        annotations:
          summary: "{{ $value }} partitions are OFFLINE"
          description: "Producers and consumers cannot read/write these partitions. Immediate action required."

      - alert: KafkaNoActiveController
        expr: sum(kafka_controller_active_count) != 1
        for: 1m
        labels:
          severity: page
        annotations:
          summary: "Kafka cluster has {{ $value }} active controllers (expected 1)"

      - alert: KafkaBrokerNetworkSaturation
        expr: (kafka_server_bytes_in_per_sec + kafka_server_bytes_out_per_sec) > 100000000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Broker {{ $labels.instance }} network at {{ $value | humanize }}B/s"

      - alert: KafkaConsumerLag
        expr: kafka_consumer_group_lag > 100000
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Consumer group {{ $labels.group }} lag is {{ $value }} on {{ $labels.topic }}"

      - alert: KafkaISRShrink
        expr: kafka_server_isr_shrinks_per_sec > 0
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "ISR shrinking on broker {{ $labels.instance }}"

      - alert: KafkaProduceLatencyHigh
        expr: kafka_network_produce_total_time_ms_p99 > 200
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Produce p99 latency is {{ $value }}ms on {{ $labels.instance }}"
```

**The sentence to remember:** Alert on `UnderReplicatedPartitions` (data at risk), `OfflinePartitions` (data unavailable), and `ActiveControllerCount != 1` (cluster brain-dead).

**The trap:** Consumer lag alone is not sufficient — a consumer processing but committing slowly shows zero lag while actually being behind. Monitor both lag AND processing rate.

---

## 5.4 — Consumer Lag Monitoring

```
┌─── Consumer Lag Anatomy ───────────────────────────────────────────────┐
│                                                                         │
│  Topic Partition:                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 0 │ 1 │ 2 │ ... │ 95 │ 96 │ 97 │ 98 │ 99 │ 100│ 101│ 102│   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                          ▲                              ▲               │
│                   committed offset              log end offset (LEO)   │
│                       (96)                           (102)             │
│                                                                         │
│                   LAG = LEO - committed = 102 - 96 = 6 messages        │
│                                                                         │
│  Lag velocity (derivative):                                             │
│  ├── lag increasing → consumer slower than producer → scale out        │
│  ├── lag stable → consumer matches producer → healthy                  │
│  └── lag decreasing → consumer catching up → will converge             │
└─────────────────────────────────────────────────────────────────────────┘
```

### Go Code: Lag Monitor

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
	client := &kafka.Client{
		Addr:    kafka.TCP("localhost:9092"),
		Timeout: 10 * time.Second,
	}

	// Get consumer group offsets
	groupDesc, err := client.DescribeGroups(context.Background(), &kafka.DescribeGroupsRequest{
		GroupIDs: []string{"my-consumer-group"},
	})
	if err != nil {
		log.Fatal(err)
	}

	for _, g := range groupDesc.Groups {
		fmt.Printf("Group: %s, State: %s, Members: %d\n", g.GroupID, g.GroupState, len(g.Members))
	}

	// Get committed offsets
	offsets, err := client.OffsetFetch(context.Background(), &kafka.OffsetFetchRequest{
		GroupID: "my-consumer-group",
		Topics:  map[string][]int{"orders": {0, 1, 2}},
	})
	if err != nil {
		log.Fatal(err)
	}

	// Get end offsets (LEO) for comparison
	totalLag := int64(0)
	for topic, partitions := range offsets.Topics {
		for _, p := range partitions {
			// Get the latest offset for this partition
			conn, err := kafka.DialLeader(context.Background(), "tcp", "localhost:9092", topic, p.Partition)
			if err != nil {
				log.Printf("dial partition %d: %v", p.Partition, err)
				continue
			}
			leo, _ := conn.ReadLastOffset()
			conn.Close()

			lag := leo - p.CommittedOffset
			totalLag += lag
			fmt.Printf("  %s[%d]: committed=%d, LEO=%d, lag=%d\n",
				topic, p.Partition, p.CommittedOffset, leo, lag)
		}
	}
	fmt.Printf("\nTotal lag: %d messages\n", totalLag)
}
```

---

## 5.5 — Topic Configuration Best Practices

```
┌─── Production Topic Settings ──────────────────────────────────────────┐
│                                                                         │
│  Parameter                    │ Value        │ Reasoning                │
│  ────────────────────────────┼──────────────┼────────────────────────  │
│  replication.factor           │ 3            │ Survive 1 broker death   │
│  min.insync.replicas          │ 2            │ Guarantee with acks=all  │
│  partitions                   │ 6-24         │ Parallelism (see formula)│
│  retention.ms                 │ 259200000    │ 3 days (adjust per use)  │
│  cleanup.policy               │ delete       │ (or compact for KTable)  │
│  compression.type             │ producer     │ Let producer decide      │
│  max.message.bytes            │ 1048576      │ 1MB (keep small!)        │
│  segment.bytes                │ 1073741824   │ 1GB                      │
│  unclean.leader.election      │ false        │ NEVER true in production │
│  message.timestamp.type       │ CreateTime   │ Producer timestamp       │
│  ────────────────────────────┼──────────────┼────────────────────────  │
│                                                                         │
│  Anti-patterns:                                                         │
│  ├── retention.ms=-1 (infinite) → disk fills up silently               │
│  ├── partitions=1 → no parallelism, single consumer bottleneck         │
│  ├── partitions=1000 → slow elections, memory pressure on controller   │
│  └── max.message.bytes=10MB → one large message blocks entire batch    │
└─────────────────────────────────────────────────────────────────────────┘
```

**The sentence to remember:** Start with 12 partitions, `replication.factor=3`, `min.insync.replicas=2`. Adjust partitions based on measured throughput, not guesses.

**The trap:** You can INCREASE partitions but NEVER decrease them (without recreating the topic). Over-partitioning wastes resources; under-partitioning limits throughput.

---

## 5.6 — Cluster Operations

### Rolling Restart Procedure

```
┌─── Rolling Restart (Zero Downtime) ───────────────────────────────────┐
│                                                                         │
│  For each broker (one at a time):                                      │
│                                                                         │
│  1. Verify cluster health:                                              │
│     kafka-topics.sh --describe --under-replicated-partitions           │
│     → Must return EMPTY (no under-replicated partitions)               │
│                                                                         │
│  2. Stop the broker gracefully:                                         │
│     controlled.shutdown.enable=true (default)                          │
│     → Leader partitions migrate BEFORE shutdown                        │
│     → ISR shrinks gracefully                                           │
│                                                                         │
│  3. Wait for ISR to stabilize:                                          │
│     Watch UnderReplicatedPartitions metric                             │
│     → Should be 0 after leaders migrate                                │
│                                                                         │
│  4. Perform maintenance (upgrade, config change, etc.)                  │
│                                                                         │
│  5. Start the broker                                                    │
│                                                                         │
│  6. Wait for broker to rejoin ISR for all partitions:                   │
│     kafka-topics.sh --describe --under-replicated-partitions           │
│     → Wait until EMPTY again                                           │
│                                                                         │
│  7. Optionally run preferred leader election:                           │
│     kafka-leader-election.sh --election-type preferred --all-topic-partitions│
│                                                                         │
│  8. Proceed to next broker                                              │
│                                                                         │
│  Timeline per broker: 2-10 minutes depending on partition count         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Partition Reassignment

```
┌─── Partition Reassignment Flow ────────────────────────────────────────┐
│                                                                         │
│  Before: Broker 1 overloaded (too many leaders)                        │
│                                                                         │
│  Broker 1          Broker 2         Broker 3                           │
│  ┌──────────┐     ┌──────────┐    ┌──────────┐                       │
│  │ P0 (L)   │     │ P0 (F)   │    │ P0 (F)   │                       │
│  │ P1 (L)   │     │ P1 (F)   │    │ P1 (F)   │                       │
│  │ P2 (L)   │     │ P2 (F)   │    │ P3 (L)   │                       │
│  │ P3 (F)   │     │ P3 (F)   │    │ P4 (L)   │                       │
│  │ P4 (F)   │     │ P5 (L)   │    │ P5 (F)   │                       │
│  │ P5 (F)   │     │          │    │          │                       │
│  └──────────┘     └──────────┘    └──────────┘                       │
│  Leaders: 3        Leaders: 1      Leaders: 2                         │
│                                                                         │
│  Step 1: Generate reassignment plan                                     │
│  kafka-reassign-partitions.sh --generate \                              │
│    --topics-to-move-json-file topics.json \                            │
│    --broker-list "1,2,3"                                               │
│                                                                         │
│  Step 2: Execute reassignment (throttled!)                              │
│  kafka-reassign-partitions.sh --execute \                               │
│    --reassignment-json-file plan.json \                                │
│    --throttle 50000000   ← 50 MB/s to avoid impacting production      │
│                                                                         │
│  Step 3: Verify completion                                              │
│  kafka-reassign-partitions.sh --verify \                                │
│    --reassignment-json-file plan.json                                  │
└─────────────────────────────────────────────────────────────────────────┘
```

**The sentence to remember:** Always `--throttle` partition reassignment — without it, replication traffic can saturate the network and cause cascading broker failures.

**The trap:** Running reassignment during peak traffic without throttling is the #1 cause of self-inflicted Kafka outages.

---

## 5.7 — Security: SASL/SSL + ACLs

```
┌─── Security Layers ───────────────────────────────────────────────────┐
│                                                                         │
│  Layer 1: ENCRYPTION (TLS/SSL)                                         │
│  ┌────────────────────────────────────────────────────────────┐        │
│  │  Client ──── TLS 1.2/1.3 ────── Broker                    │        │
│  │  (data in transit encrypted)                                │        │
│  └────────────────────────────────────────────────────────────┘        │
│                                                                         │
│  Layer 2: AUTHENTICATION (SASL)                                        │
│  ┌────────────────────────────────────────────────────────────┐        │
│  │  Mechanisms:                                                │        │
│  │  ├── SASL/PLAIN:   username/password (simple, use with TLS)│        │
│  │  ├── SASL/SCRAM:   salted challenge-response (stronger)    │        │
│  │  ├── SASL/GSSAPI:  Kerberos (enterprise)                  │        │
│  │  └── SASL/OAUTHBEARER: OAuth2 tokens (modern, recommended)│        │
│  └────────────────────────────────────────────────────────────┘        │
│                                                                         │
│  Layer 3: AUTHORIZATION (ACLs)                                         │
│  ┌────────────────────────────────────────────────────────────┐        │
│  │  Principal "User:order-service" can:                        │        │
│  │  ├── WRITE to topic "orders"                               │        │
│  │  ├── READ from topic "orders" (group: "order-consumers")   │        │
│  │  └── DESCRIBE topic "orders"                               │        │
│  │                                                             │        │
│  │  Principal "User:admin" can:                                │        │
│  │  └── ALL on ALL resources (cluster admin)                   │        │
│  └────────────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────────┘
```

### ACL Commands

```bash
# Grant produce permission
kafka-acls.sh --bootstrap-server localhost:9092 \
  --add --allow-principal User:order-service \
  --operation Write --topic orders

# Grant consume permission
kafka-acls.sh --bootstrap-server localhost:9092 \
  --add --allow-principal User:order-service \
  --operation Read --topic orders \
  --group order-consumers

# List all ACLs
kafka-acls.sh --bootstrap-server localhost:9092 --list

# Remove an ACL
kafka-acls.sh --bootstrap-server localhost:9092 \
  --remove --allow-principal User:old-service \
  --operation Write --topic orders
```

### Go Client with SASL/TLS

```go
package main

import (
	"context"
	"crypto/tls"
	"fmt"
	"log"
	"time"

	"github.com/segmentio/kafka-go"
	"github.com/segmentio/kafka-go/sasl/scram"
)

func main() {
	mechanism, err := scram.Mechanism(scram.SHA512, "order-service", "secret-password")
	if err != nil {
		log.Fatal(err)
	}

	dialer := &kafka.Dialer{
		Timeout:       10 * time.Second,
		DualStack:     true,
		SASLMechanism: mechanism,
		TLS:           &tls.Config{MinVersion: tls.VersionTLS12},
	}

	w := kafka.NewWriter(kafka.WriterConfig{
		Brokers:      []string{"kafka-1:9093", "kafka-2:9093", "kafka-3:9093"},
		Topic:        "orders",
		Balancer:     &kafka.Murmur2Balancer{},
		Dialer:       dialer,
		RequiredAcks: int(kafka.RequireAll),
		MaxAttempts:  10,
	})
	defer w.Close()

	err = w.WriteMessages(context.Background(),
		kafka.Message{
			Key:   []byte("order-001"),
			Value: []byte(`{"status":"created"}`),
		},
	)
	if err != nil {
		log.Fatal("write:", err)
	}
	fmt.Println("Message produced with SASL/SCRAM + TLS")
}
```

**The sentence to remember:** Production Kafka needs all three layers: TLS (encrypt), SASL (authenticate), ACLs (authorize). Never run plaintext in production.

**The trap:** `SASL/PLAIN` sends credentials in cleartext — it is only safe OVER TLS. Without TLS, use SCRAM or OAUTHBEARER.

---

## 5.8 — Grafana Dashboard Panels

```
┌─── Essential Dashboard Layout ─────────────────────────────────────────┐
│                                                                         │
│  Row 1: CLUSTER HEALTH                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │
│  │ Under-       │  │ Offline      │  │ Active       │                │
│  │ Replicated   │  │ Partitions   │  │ Controller   │                │
│  │ Partitions   │  │ (should be 0)│  │ (should be 1)│                │
│  │   stat panel │  │   stat panel │  │   stat panel │                │
│  └──────────────┘  └──────────────┘  └──────────────┘                │
│                                                                         │
│  Row 2: THROUGHPUT                                                      │
│  ┌────────────────────────────┐  ┌────────────────────────────┐       │
│  │ Bytes In/Out per Sec       │  │ Messages In per Sec         │       │
│  │ (graph, per broker)        │  │ (graph, per topic)          │       │
│  └────────────────────────────┘  └────────────────────────────┘       │
│                                                                         │
│  Row 3: LATENCY                                                         │
│  ┌────────────────────────────┐  ┌────────────────────────────┐       │
│  │ Produce p99 Latency (ms)   │  │ Fetch p99 Latency (ms)     │       │
│  │ (graph, per broker)        │  │ (graph, per broker)         │       │
│  └────────────────────────────┘  └────────────────────────────┘       │
│                                                                         │
│  Row 4: CONSUMER LAG                                                    │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ Consumer Group Lag (graph, per group per topic)                  │  │
│  │ Panel: kafka_consumer_group_lag{group=~".*"}                    │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  Row 5: RESOURCES                                                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐    │
│  │ Disk Usage (%)    │  │ Network I/O      │  │ CPU / JVM Heap   │    │
│  │ per broker        │  │ per broker       │  │ per broker       │    │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Exercises

- [ ] **Exercise 1:** Calculate the number of brokers, instance type, and storage needed for: 100 MB/s ingress, replication factor 3, 10 consumer groups, 7-day retention.
  - Expected output: Network/broker, storage/broker, recommended instance type. (Hint: ~6 kafka.m5.4xlarge with 15TB EBS each)
  - Teaches: Capacity planning from first principles.

- [ ] **Exercise 2:** Set up the JMX exporter on a local Kafka broker, configure Prometheus to scrape it, and create a Grafana dashboard showing UnderReplicatedPartitions, BytesInPerSec, and consumer lag.
  - Expected output: Working Grafana dashboard with live metrics from your local cluster.
  - Teaches: Observability pipeline for Kafka.

- [ ] **Exercise 3:** Trigger `UnderReplicatedPartitions > 0` by pausing a broker with `kill -STOP`, observe the metric in Prometheus, then resume with `kill -CONT` and watch it recover.
  - Expected output: Metric goes 0 → N → 0 within ~30 seconds.
  - Teaches: How ISR shrink manifests in monitoring.

- [ ] **Exercise 4:** Perform a rolling restart of a 3-broker cluster. Verify zero message loss by running a producer and consumer during the restart.
  - Expected output: All messages produced are consumed. No errors in producer (with retries enabled).
  - Teaches: Graceful rolling restart procedure.

- [ ] **Exercise 5:** Run `kafka-reassign-partitions.sh` with `--throttle 10000000` (10 MB/s). Monitor replication throughput and verify it stays under the throttle.
  - Expected output: Reassignment completes slowly but does not impact production traffic.
  - Teaches: Safe partition movement in production.

- [ ] **Exercise 6:** Configure SASL/SCRAM-SHA-512 authentication. Create two users: one with Write access to `orders`, one with Read access. Verify that the reader cannot write and the writer cannot read.
  - Expected output: Write user gets `TopicAuthorizationException` on read, and vice versa.
  - Teaches: Kafka security model (authentication + authorization).

- [ ] **Exercise 7:** Write a Go-based consumer lag monitor that polls every 10 seconds and prints lag per partition. Add a threshold alert (print WARNING if lag > 1000).
  - Expected output: Continuously updating lag display with WARNING lines when lag exceeds threshold.
  - Teaches: Building custom monitoring tools.

- [ ] **Exercise 8:** Increase partitions on a topic from 6 to 12 while producers and consumers are running. Observe: does the consumer group rebalance? Are messages with existing keys routed to different partitions?
  - Expected output: Rebalance occurs, new partitions get new messages, existing partition data unchanged.
  - Teaches: Partition expansion is non-trivial and affects key routing.

- [ ] **Exercise 9:** Set up a topic with `retention.ms=60000` (1 minute). Produce messages, wait 2 minutes, verify they are deleted. Then try `retention.bytes=1048576` (1MB) — produce 2MB of data and verify the oldest 1MB is deleted.
  - Expected output: Messages beyond retention are gone. Both time and size retention work independently.
  - Teaches: Retention policy behavior in practice.

- [ ] **Exercise 10:** Simulate a split-brain scenario: partition the network so the ZooKeeper ensemble splits. Observe controller behavior and how clients react.
  - Expected output: One side loses controller, partitions become unavailable on the minority side.
  - Teaches: Why ZooKeeper quorum matters (and why KRaft is replacing it).

---

## Checkpoint Questions

1. What is the formula for calculating total network throughput per broker given ingress, replication factor, and number of consumer groups?
2. Why is `UnderReplicatedPartitions` a more critical alert than consumer lag?
3. Explain the difference between `controlled.shutdown.enable=true` and killing a broker with `kill -9`.
4. Why must you throttle partition reassignment? What happens if you do not?
5. What is the difference between SASL/PLAIN and SASL/SCRAM? When would you use each?
6. A consumer group has 50,000 messages of lag that has been stable for 1 hour. Is this a problem? How would you determine the answer?
7. You need to increase partitions from 6 to 12. What happens to messages with key "order-123" that were previously routed to partition 2?

---

## References

- [AWS MSK Documentation](https://docs.aws.amazon.com/msk/latest/developerguide/what-is-msk.html)
- [Kafka Monitoring](https://kafka.apache.org/documentation/#monitoring)
- [Confluent Blog: Monitoring Kafka](https://www.confluent.io/blog/kafka-monitoring-and-metrics-using-open-source-tools/)
- [Kafka Security](https://kafka.apache.org/documentation/#security)
- [Kafka Operations](https://kafka.apache.org/documentation/#operations)
- [LinkedIn: Running Kafka at Scale](https://engineering.linkedin.com/distributed-systems/log-what-every-software-engineer-should-know-about-real-time-datas-unifying)
- [Uber Kafka Infrastructure](https://www.uber.com/blog/kafka/)

---

## Cheatsheet

```
┌──────────────────────────────────────────────────────────────────────────┐
│  MONITORING                                                               │
│  UnderReplicatedPartitions > 0 for 5m  → CRITICAL (data at risk)        │
│  OfflinePartitionsCount > 0            → PAGE (data unavailable)        │
│  ActiveControllerCount != 1            → PAGE (cluster broken)          │
│  BytesIn+BytesOut > 80% NIC            → WARNING (network saturated)    │
│  ConsumerLag > 100k for 15m            → WARNING (consumer falling)     │
│  ProduceLatency p99 > 200ms            → WARNING (broker slow)          │
├──────────────────────────────────────────────────────────────────────────┤
│  CAPACITY PLANNING                                                        │
│  network/broker = ingress * (rf + num_consumers) / num_brokers           │
│  storage/broker = ingress * 3600 * retention_h * rf / num_brokers        │
│  partitions = max(ingress/10MBps, max_consumers_in_group)                │
│  Rule: keep broker network < 70% of NIC, disk < 70% full                │
├──────────────────────────────────────────────────────────────────────────┤
│  OPERATIONS                                                               │
│  Rolling restart: check URP=0 → stop → wait ISR → start → wait ISR     │
│  Reassignment: ALWAYS --throttle (50MB/s safe default)                   │
│  Preferred election: kafka-leader-election.sh --election-type preferred  │
│  Topic partition increase: kafka-topics.sh --alter --partitions N        │
├──────────────────────────────────────────────────────────────────────────┤
│  SECURITY                                                                 │
│  Encrypt: listener.security.protocol.map=SASL_SSL                        │
│  Auth: sasl.mechanism.inter.broker.protocol=SCRAM-SHA-512               │
│  AuthZ: authorizer.class.name=kafka.security.authorizer.AclAuthorizer   │
│  ACLs: kafka-acls.sh --add --allow-principal User:X --operation Y       │
├──────────────────────────────────────────────────────────────────────────┤
│  MSK QUICK REFERENCE                                                      │
│  Serverless: < 200MB/s, zero ops, pay per GB                             │
│  Provisioned: > 200MB/s, full control, pay per broker-hour               │
│  IAM auth: recommended for MSK (no password management)                  │
└──────────────────────────────────────────────────────────────────────────┘
```
