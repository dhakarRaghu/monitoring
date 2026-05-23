/**
 * Seeds the Principal Engineer learning PLAN into the mentor-dashboard.
 *
 * This is the ROADMAP only — a table of contents of what you'll learn.
 * Each phase is one line: title + short description. That's it.
 *
 * When you actually start a phase, run `/study <topic>` from the verly repo.
 * The /study skill expands the phase into deep production-grade content
 * (theory, diagrams, exercises, Mindtickle code anchors) and saves it to
 * the dashboard as a separate study_material row.
 *
 * Run:
 *   cd ~/Desktop/project/verly/mentor-dashboard
 *   API_BASE=http://localhost:3000 npx tsx scripts/seed-learning-plan.ts
 *
 * Idempotent — re-runs PATCH existing courses with refreshed outlines.
 */

const API_BASE = process.env.API_BASE || "http://localhost:3000";
const PLAN_VERSION = "2026-05-21-plan";

interface PhaseOutline {
  phase: number;
  title: string;
  description: string;     // one-line: what this phase covers
  estimatedSessions: number;
}

interface CourseDefinition {
  topic: string;                          // kebab-case unique key
  order: number;                          // 1..N recommended sequence
  macroPhase: 1 | 2 | 3 | 4 | 5 | 6;       // maps to the 6 macro-phases
  title: string;
  whyItMatters: string;                   // 1-line on why this track matters
  outcomes: string[];                     // what shipping this track unlocks
  prerequisites: string[];                // other topic ids to do first
  outline: PhaseOutline[];
}

interface StudyMaterialPayload {
  slug: string;
  title: string;
  category: string;
  difficulty: string;
  estimatedMinutes: number;
  tags: string[];
  summary: string;
  content: string;
  source: string;
}

// ─────────────────────────────────────────────────────────
// 17 courses in recommended learning order.
// Macro-phase map:
//   1 Foundations (M1-3)     · go, networking, sql-mysql, security, observability
//   2 Service mastery (M4-6) · kafka, redis, dynamodb, kubernetes
//   3 Cross-system (M7-9)    · lambda-stepfunctions, storage, graphql-relay
//   4 AI platform (M10-12)   · ai-agentic, mindtickle-internals
//   5 Staff craft (M13-18)   · distributed-systems-theory, system-design
//   6 Principal (M19-24)     · staff-principal-skills
// ─────────────────────────────────────────────────────────

const courses: CourseDefinition[] = [
  // ============== PHASE 1 — FOUNDATIONS ==============
  {
    topic: "go-mastery",
    order: 1,
    macroPhase: 1,
    title: "Go — From Proficient to Expert",
    whyItMatters: "Go is Mindtickle's primary backend language. Every Kafka consumer, gRPC service, and Lambda you'll touch is Go.",
    outcomes: ["Write production-grade Go with channels + context", "Profile with pprof and cut allocations measurably", "Author idiomatic packages others depend on"],
    prerequisites: [],
    outline: [
      { phase: 0, title: "Go Philosophy & Memory Model", description: "Composition, error-as-value, the memory model. Why Go is the way it is.", estimatedSessions: 1 },
      { phase: 1, title: "Concurrency Patterns", description: "Goroutines, channels, select, context, errgroup, sync primitives, graceful shutdown.", estimatedSessions: 4 },
      { phase: 2, title: "Performance & Profiling", description: "pprof CPU + heap, benchmarks with benchstat, sync.Pool, pprof safely in production.", estimatedSessions: 3 },
      { phase: 3, title: "Generics, Reflection, Code Gen", description: "Type parameters, when to reach for reflection, protoc / sqlc / go generate.", estimatedSessions: 2 },
      { phase: 4, title: "Testing Mastery", description: "Table-driven, mocks vs fakes, testcontainers-go, property + fuzz tests.", estimatedSessions: 2 },
      { phase: 5, title: "Project Architecture", description: "cmd/internal/pkg layout, DI, hexagonal, Go workspaces for multi-module repos.", estimatedSessions: 2 },
      { phase: 6, title: "Go at Mindtickle", description: "mt-go-logger, gRPC interceptors, platform-protos, the Golden Code Initiative scaffolds.", estimatedSessions: 2 },
    ],
  },
  {
    topic: "networking",
    order: 2,
    macroPhase: 1,
    title: "Networking for Backend Engineers",
    whyItMatters: "Every prod outage eventually traces to networking. Read tcpdump like English and you debug 10x faster.",
    outcomes: ["Read a tcpdump capture and tell what's wrong", "Tune connection pools, keep-alives, timeouts with intent", "Debug DNS / TLS / HTTP/2 issues from logs alone"],
    prerequisites: ["go-mastery"],
    outline: [
      { phase: 0, title: "The TCP/IP Stack", description: "Layer-by-layer: syscall → kernel buffers → NIC → wire. Linux network tooling (ss, tcpdump, mtr).", estimatedSessions: 1 },
      { phase: 1, title: "TCP Deep Dive", description: "3-way handshake, state machine, TIME_WAIT, congestion control (cubic vs BBR).", estimatedSessions: 2 },
      { phase: 2, title: "HTTP/2 & gRPC", description: "Multiplexing, HPACK, gRPC over HTTP/2, streaming modes, deadlines.", estimatedSessions: 2 },
      { phase: 3, title: "TLS 1.3 & DNS", description: "1-RTT handshake, certificate chains, key rotation, DNS resolution and caching.", estimatedSessions: 2 },
      { phase: 4, title: "Load Balancing & Proxies", description: "L4 vs L7, algorithms, health checks + draining, Kong API gateway.", estimatedSessions: 2 },
      { phase: 5, title: "Service Discovery & Mesh", description: "K8s service discovery, Istio/Linkerd basics, zero-trust networking.", estimatedSessions: 1 },
    ],
  },
  {
    topic: "sql-mysql",
    order: 3,
    macroPhase: 1,
    title: "SQL & MySQL — TickleDB Foundations",
    whyItMatters: "TickleDB IS MySQL. Most slow APIs trace to a missing index. Senior engineers read EXPLAIN like English.",
    outcomes: ["Read EXPLAIN and propose the right index", "Choose isolation levels with intent", "Write a zero-downtime migration"],
    prerequisites: ["go-mastery"],
    outline: [
      { phase: 0, title: "Relational Model Foundations", description: "Relational algebra, normal forms, ACID — why SQL won.", estimatedSessions: 1 },
      { phase: 1, title: "Indexes & Query Plans", description: "B-tree, covering indexes, EXPLAIN output, the leftmost-prefix rule, anti-patterns.", estimatedSessions: 2 },
      { phase: 2, title: "Transactions & Isolation", description: "Isolation levels, deadlocks, long-running transactions, optimistic vs pessimistic locking.", estimatedSessions: 2 },
      { phase: 3, title: "Replication & High Availability", description: "Async vs semi-sync, replica lag, read/write splitting, failover with Orchestrator.", estimatedSessions: 2 },
      { phase: 4, title: "Zero-Downtime Migrations", description: "Expand/contract pattern, online DDL, pt-osc / gh-ost, safe backfills, rollback plans.", estimatedSessions: 2 },
      { phase: 5, title: "Performance Operations", description: "Connection pools, slow query log + pt-query-digest, table partitioning, schema evolution.", estimatedSessions: 2 },
    ],
  },
  {
    topic: "docker-containers",
    order: 4,
    macroPhase: 1,
    title: "Docker & Containers — From Image to Runtime",
    whyItMatters: "Every K8s pod is a container. Image layering, multi-stage builds, supply-chain scanning are senior skills — and the gap most engineers never close.",
    outcomes: ["Build a tiny secure production image (distroless, non-root)", "Read a Dockerfile and predict its layer cache behavior", "Sign + verify images with Cosign for supply-chain safety"],
    prerequisites: ["go-mastery", "networking"],
    outline: [
      { phase: 0, title: "Why Containers (and how they actually work)", description: "Linux namespaces, cgroups, OverlayFS — the kernel features behind containers; vs VMs.", estimatedSessions: 1 },
      { phase: 1, title: "Building Images Well", description: "Dockerfile best practices, multi-stage builds, layer caching, .dockerignore, image size discipline.", estimatedSessions: 2 },
      { phase: 2, title: "Container Security", description: "Distroless base images, non-root users, capabilities, image scanning (Trivy/Grype), CVEs.", estimatedSessions: 2 },
      { phase: 3, title: "Registries & Supply Chain", description: "ECR / Docker Hub / GHCR, image signing with Cosign + sigstore, SBOM generation, SLSA levels.", estimatedSessions: 2 },
      { phase: 4, title: "Runtime & the OCI Spec", description: "containerd, runc, OCI image + runtime specs; what kubelet actually does when it 'runs' a container.", estimatedSessions: 1 },
      { phase: 5, title: "Containers at Mindtickle", description: "Base images, the build pipeline in GitLab CI, ECR usage, image promotion across tracks.", estimatedSessions: 1 },
    ],
  },
  {
    topic: "security",
    order: 5,
    macroPhase: 1,
    title: "Security — OWASP, Auth, Crypto, Threat Modeling",
    whyItMatters: "Security bugs are the most expensive bugs you can ship. Threat modeling early = cheaper everything later.",
    outcomes: ["Threat-model a feature in 15 minutes with STRIDE", "Spot OWASP Top 10 patterns in code review", "Choose auth flows with reasoning"],
    prerequisites: ["go-mastery", "networking"],
    outline: [
      { phase: 0, title: "The Security Mindset", description: "Trust boundaries, STRIDE threat modeling, defense in depth.", estimatedSessions: 1 },
      { phase: 1, title: "OWASP Top 10", description: "Each vulnerability with Go-specific defenses and real-world examples.", estimatedSessions: 2 },
      { phase: 2, title: "Authentication & Identity", description: "Sessions vs JWTs, OAuth2/OIDC, Passkeys/WebAuthn, mTLS for service-to-service.", estimatedSessions: 2 },
      { phase: 3, title: "Authorization at Scale", description: "RBAC → ABAC → ReBAC (Zanzibar / SpiceDB / OpenFGA), multi-tenant isolation.", estimatedSessions: 2 },
      { phase: 4, title: "Cryptography Essentials", description: "TLS 1.3, KDFs (argon2id), key rotation, envelope encryption, secrets management.", estimatedSessions: 2 },
      { phase: 5, title: "AWS Security", description: "IAM least-privilege, IRSA for EKS, KMS, security groups, GuardDuty + Security Hub.", estimatedSessions: 2 },
    ],
  },
  {
    topic: "observability",
    order: 6,
    macroPhase: 1,
    title: "Observability — Metrics, Traces, Logs Done Right",
    whyItMatters: "You can't debug what you can't see. Instrumenting from day one saves 90% of incident time.",
    outcomes: ["Instrument a service with RED + USE metrics", "Trace one prod request edge → backend → DB", "Write SLOs the on-call actually believes"],
    prerequisites: ["go-mastery", "networking"],
    outline: [
      { phase: 0, title: "Why Observability", description: "Three pillars, USE / RED / Golden Signals, observability vs monitoring.", estimatedSessions: 1 },
      { phase: 1, title: "Metrics — Counter, Gauge, Histogram", description: "PromQL, Datadog, cardinality management, alerting on symptoms not causes.", estimatedSessions: 2 },
      { phase: 2, title: "Distributed Tracing", description: "OpenTelemetry, spans, W3C context propagation, sampling strategies, exemplars.", estimatedSessions: 2 },
      { phase: 3, title: "Structured Logging", description: "JSON formats, slog/zerolog, log correlation with trace_id, Loki + LogQL.", estimatedSessions: 1 },
      { phase: 4, title: "Alerting & SLOs", description: "SLI/SLO/SLA, burn-rate alerts, multi-window, runbooks, DORA metrics.", estimatedSessions: 2 },
      { phase: 5, title: "Observability at Mindtickle", description: "PMM, Datadog APM + RUM, the CloudWatch → Loki migration, PagerDuty → RCA flow.", estimatedSessions: 2 },
    ],
  },
  // ============== PHASE 2 — SERVICE MASTERY ==============
  {
    topic: "kafka",
    order: 7,
    macroPhase: 2,
    title: "Apache Kafka — From Zero to Production Mastery",
    whyItMatters: "Kafka is Mindtickle's nervous system — NDP, CDC, AI review triggers all flow through MSK.",
    outcomes: ["Reason about partitioning, ordering, ISR tradeoffs", "Debug a consumer-group rebalance from logs", "Design topic schemas and DLQ flows"],
    prerequisites: ["go-mastery", "networking", "observability"],
    outline: [
      { phase: 0, title: "Why Kafka Exists", description: "The commit log idea, Kafka vs SQS/RabbitMQ, CloudEvents spec.", estimatedSessions: 2 },
      { phase: 1, title: "Architecture & Internals", description: "Brokers, partitions, segments, ISR, replication, leader election, KRaft.", estimatedSessions: 3 },
      { phase: 2, title: "Producers Deep Dive", description: "Acks, idempotency, batching, compression, partitioning, exactly-once.", estimatedSessions: 2 },
      { phase: 3, title: "Consumers & Stream Processing", description: "Consumer groups, rebalancing, offset management, mt-kafka-streams, Lambda + MSK ESM.", estimatedSessions: 3 },
      { phase: 4, title: "Kafka in Production", description: "Schema Registry, Kafka Connect, monitoring lag, DLQ patterns, failure scenarios.", estimatedSessions: 3 },
      { phase: 5, title: "Kafka at Mindtickle", description: "MSK + Canal, NDP pipeline, CDC (DynamoDB Streams → Kafka), real consumer groups.", estimatedSessions: 2 },
      { phase: 6, title: "Event-Driven Design", description: "Topic shape, outbox pattern, saga, event sourcing — designing events that last 5 years.", estimatedSessions: 2 },
    ],
  },
  {
    topic: "redis",
    order: 8,
    macroPhase: 2,
    title: "Redis — Caching, Locking, and Beyond",
    whyItMatters: "Redis touches almost every Mindtickle service. Get it wrong and you get cache stampedes and race conditions.",
    outcomes: ["Choose between cache-aside / write-through / write-behind correctly", "Implement a distributed lock that's actually safe", "Tune memory + eviction for a real workload"],
    prerequisites: ["go-mastery", "networking"],
    outline: [
      { phase: 0, title: "Why Redis", description: "Single-threaded model, Redis vs Memcached vs DynamoDB, beyond caching use cases.", estimatedSessions: 1 },
      { phase: 1, title: "Data Structures & Patterns", description: "Strings, Hashes, Lists, Sets, Sorted Sets, Streams, HyperLogLog, Bitmaps.", estimatedSessions: 3 },
      { phase: 2, title: "Caching Patterns", description: "Cache-aside, write-through/behind, thundering herd + singleflight, invalidation strategies.", estimatedSessions: 2 },
      { phase: 3, title: "Distributed Locking", description: "SET NX EX, Lua scripts, the Redlock debate, fencing tokens.", estimatedSessions: 2 },
      { phase: 4, title: "Architecture & HA", description: "RDB/AOF persistence, async replication, Sentinel vs Cluster, AWS ElastiCache.", estimatedSessions: 2 },
      { phase: 5, title: "Performance & Failures", description: "Pipelining, hot keys + big keys, eviction policies, slow commands to avoid.", estimatedSessions: 2 },
      { phase: 6, title: "Redis at Mindtickle", description: "go-redis/v9 patterns, company settings cache, Nyx (DynamoDB + Redis), the CE bug fix.", estimatedSessions: 1 },
    ],
  },
  {
    topic: "dynamodb",
    order: 9,
    macroPhase: 2,
    title: "DynamoDB — Single-Table Design to Production Scale",
    whyItMatters: "Replacing Couchbase across Mindtickle. Single-table design is the difference between $200/mo and $20k/mo at scale.",
    outcomes: ["Design a single-table schema for a non-trivial domain", "Reason about partition keys, hot partitions, throttling", "Estimate cost (RCU/WCU + storage) before shipping"],
    prerequisites: ["sql-mysql", "go-mastery"],
    outline: [
      { phase: 0, title: "Why DynamoDB", description: "Key-value at unlimited scale, DynamoDB vs RDS vs Redis, access patterns first.", estimatedSessions: 1 },
      { phase: 1, title: "Fundamentals", description: "PK + SK design, GSI vs LSI, item size limits, RCU/WCU + on-demand capacity.", estimatedSessions: 2 },
      { phase: 2, title: "Single-Table Design", description: "Key overloading, sparse indexes, GSI overloading, the Rick Houlihan patterns.", estimatedSessions: 3 },
      { phase: 3, title: "Transactions & Advanced", description: "TransactWriteItems, conditional writes (idempotency), optimistic locking, pagination.", estimatedSessions: 2 },
      { phase: 4, title: "Streams & CDC", description: "DynamoDB Streams → Lambda, CDC to Kafka, event sourcing on DynamoDB.", estimatedSessions: 2 },
      { phase: 5, title: "Operations & Cost", description: "Capacity modes, hot partitions, DAX, backup/PITR, cost math before building.", estimatedSessions: 2 },
      { phase: 6, title: "DynamoDB at Mindtickle", description: "The Couchbase → DynamoDB migration lessons, Nyx allocation service, table shapes from prod.", estimatedSessions: 1 },
    ],
  },
  {
    topic: "kubernetes",
    order: 10,
    macroPhase: 2,
    title: "Kubernetes — From Pods to Production EKS",
    whyItMatters: "Mindtickle runs 4 EKS clusters. Every service lives in K8s. CrashLoopBackOff at 3am without strong K8s = misery.",
    outcomes: ["Author a production-grade Helm chart with HPA + PDB", "Debug Pending / CrashLoopBackOff / ImagePull from scratch", "Run a zero-downtime rolling deploy"],
    prerequisites: ["networking", "observability"],
    outline: [
      { phase: 0, title: "Why K8s Exists", description: "Desired-state model, control loops, API server + etcd as source of truth.", estimatedSessions: 1 },
      { phase: 1, title: "Core Concepts", description: "Pods, Deployments, Services, ConfigMaps + Secrets, Storage (PV/PVC), AWS VPC CNI.", estimatedSessions: 3 },
      { phase: 2, title: "Scaling & Resources", description: "Requests vs limits, QoS classes, OOMKill, HPA + KEDA, PDB, VPA considerations.", estimatedSessions: 3 },
      { phase: 3, title: "Debugging & Troubleshooting", description: "CrashLoopBackOff, ImagePullBackOff, Pending, kubectl debug, ephemeral containers.", estimatedSessions: 2 },
      { phase: 4, title: "Deployment Strategies", description: "Rolling, blue-green, canary, Argo Rollouts, Helm chart authoring + best practices.", estimatedSessions: 2 },
      { phase: 5, title: "Observability & Service Mesh", description: "Prometheus, Datadog Agent DaemonSet, Loki, network policies, when (not) to mesh.", estimatedSessions: 2 },
      { phase: 6, title: "K8s at Mindtickle", description: "4 EKS clusters map, devops-helm-charts layout, GitLab CI deploy pipeline, Apps Store.", estimatedSessions: 2 },
    ],
  },
  {
    topic: "aws-services-deep",
    order: 11,
    macroPhase: 2,
    title: "AWS Services Deep — Beyond EKS/Lambda/S3",
    whyItMatters: "Mindtickle runs on a much wider AWS surface than the headline services: RDS (Aurora PG + MySQL), Cognito, CloudFront, SES, Bedrock, SageMaker, Kinesis, DMS, SSO. Each carries production gotchas you can't learn from generic AWS courses.",
    outcomes: ["Pick the right AWS service for a workload with cost + ops reasoning", "Configure RDS / Aurora with read replicas + PITR safely", "Wire CloudFront in front of S3 + Lambda@Edge", "Use Bedrock for inference without lock-in"],
    prerequisites: ["kubernetes", "sql-mysql"],
    outline: [
      { phase: 0, title: "AWS Account Model & SSO", description: "Multi-account strategy, AWS Organizations, SSO + permission sets, IAM Identity Center; how Mindtickle organizes its 4 tracks across AWS accounts.", estimatedSessions: 1 },
      { phase: 1, title: "RDS & Aurora Deep", description: "Aurora Postgres + MySQL, replicas, Performance Insights, parameter groups, PITR, automated backup windows, Aurora Global DB.", estimatedSessions: 2 },
      { phase: 2, title: "CloudFront & Edge", description: "CDN basics, signed URLs, cache behaviors, Lambda@Edge vs CloudFront Functions, origin failover; how DSR uses CloudFront for regional stacks.", estimatedSessions: 2 },
      { phase: 3, title: "SQS, SNS, EventBridge, Kinesis", description: "When each: SQS for work queues, SNS for fanout, EventBridge for cross-account events, Kinesis for ordered streaming; vs Kafka tradeoffs.", estimatedSessions: 2 },
      { phase: 4, title: "Cognito, SES, and Identity Services", description: "Cognito user pools + identity pools, SES for transactional email, MFA flows; how Mindtickle uses each.", estimatedSessions: 2 },
      { phase: 5, title: "AWS Bedrock & SageMaker", description: "Bedrock for Claude/Llama inference (Mindtickle pattern), SageMaker for custom model hosting; cost vs lock-in tradeoffs.", estimatedSessions: 2 },
      { phase: 6, title: "AWS at Mindtickle", description: "The full Mindtickle AWS map (RDS + ElastiCache + OpenSearch + Couchbase + DynamoDB + MSK + Lambda + EKS + S3 + CloudFront + Cognito + SES + Bedrock + SageMaker + Kinesis + DMS + SSO + Athena). The cost report, the tagging discipline.", estimatedSessions: 2 },
    ],
  },
  {
    topic: "service-mesh",
    order: 12,
    macroPhase: 2,
    title: "Service Mesh — Linkerd, Istio, mTLS",
    whyItMatters: "Mindtickle has both Linkerd and Istio in production. As you grow into cross-cutting concerns (mTLS, traffic shifting, observability sidecars), service mesh is the layer that makes Senior+ design tractable.",
    outcomes: ["Decide when service mesh is worth it (and when not)", "Read Istio/Linkerd config like English", "Use mesh for mTLS, traffic shifting, observability without app changes"],
    prerequisites: ["kubernetes", "networking"],
    outline: [
      { phase: 0, title: "What a Service Mesh Solves", description: "The cross-cutting concerns problem (retries, mTLS, observability, traffic shifting); proxy/sidecar model; mesh data + control planes.", estimatedSessions: 1 },
      { phase: 1, title: "Linkerd vs Istio vs Cilium Service Mesh", description: "Tradeoffs: complexity, performance, features; why Mindtickle ended up with both; the new eBPF-based Cilium option.", estimatedSessions: 2 },
      { phase: 2, title: "mTLS Everywhere", description: "Why zero-trust networks need mTLS, cert issuance via mesh, automatic rotation, identity (SPIFFE/SPIRE), what 'mesh-handled' really means.", estimatedSessions: 2 },
      { phase: 3, title: "Traffic Management", description: "VirtualService + DestinationRule in Istio, traffic splitting for canary deploys, retries + timeouts, circuit breakers via mesh.", estimatedSessions: 2 },
      { phase: 4, title: "Observability via Mesh", description: "Sidecar telemetry, automatic golden-signals dashboards, distributed tracing without app code, Kiali / Linkerd Viz.", estimatedSessions: 2 },
      { phase: 5, title: "Service Mesh at Mindtickle", description: "How Mindtickle uses Linkerd + Istio in practice (which services, why), KubeVPN for local debugging through the mesh.", estimatedSessions: 2 },
    ],
  },
  {
    topic: "caching-strategies",
    order: 13,
    macroPhase: 2,
    title: "Caching at Every Layer — CDN → App → DB",
    whyItMatters: "A single Redis cache is the easy part. Real production caching is a hierarchy — browser, CDN, API gateway, application, DB query cache — and getting invalidation right across all of them. This is the most under-taught skill at Senior level.",
    outcomes: ["Design a multi-layer cache hierarchy with intentional invalidation", "Choose between cache-aside / read-through / write-through / write-behind correctly", "Solve thundering-herd, cache stampede, and stale-write problems"],
    prerequisites: ["redis", "networking"],
    outline: [
      { phase: 0, title: "The Cache Hierarchy", description: "Browser cache → CDN → reverse proxy → app cache → distributed cache → DB query cache; latency budget at each layer; why one layer is never enough.", estimatedSessions: 1 },
      { phase: 1, title: "Caching Strategies Deep", description: "Cache-aside, read-through, write-through, write-behind, write-around — what each promises about consistency + perf; when each fits.", estimatedSessions: 2 },
      { phase: 2, title: "Invalidation Patterns", description: "TTL + jitter, explicit invalidation, pub/sub fan-out, versioned keys (k:v1, k:v2), generational caches — Phil Karlton was right.", estimatedSessions: 2 },
      { phase: 3, title: "Distributed Caches at Scale", description: "Redis Cluster, Memcached, consistent hashing, hot-key replication, big-key handling, regional caches.", estimatedSessions: 2 },
      { phase: 4, title: "CDN & Edge Caching", description: "CloudFront / Cloudflare / Fastly mental models; cache keys + Vary headers, stale-while-revalidate, signed URLs, soft + hard purge.", estimatedSessions: 2 },
      { phase: 5, title: "Caching at Mindtickle", description: "The Redis-as-cache pattern + CloudFront for static assets + S3 file cache + in-app domain caches; the CE Redis caching bug fix as a case study.", estimatedSessions: 2 },
    ],
  },
  {
    topic: "queues-async-patterns",
    order: 14,
    macroPhase: 2,
    title: "Queues & Async Patterns — Beyond Kafka",
    whyItMatters: "Kafka is great for high-throughput event streaming. But SQS, SNS, RabbitMQ, NATS, Redis Streams, and Temporal each solve different problems. Senior engineers pick the right queue for each use case, not 'just use Kafka'.",
    outcomes: ["Choose between Kafka / SQS / RabbitMQ / NATS / Temporal with reasoning", "Design a background-job system with retries, priorities, dead-letter handling", "Reason about workflow orchestration (Temporal/Step Functions) vs choreography"],
    prerequisites: ["kafka", "go-mastery"],
    outline: [
      { phase: 0, title: "The Queue Landscape", description: "Stream (Kafka) vs queue (SQS/RabbitMQ) vs work distributor (NATS/Sidekiq) vs workflow (Temporal/Step Functions); when each fits.", estimatedSessions: 1 },
      { phase: 1, title: "AWS SQS + SNS + EventBridge", description: "SQS standard vs FIFO, visibility timeout, DLQ, long polling; SNS fanout; EventBridge for cross-account/cross-service events.", estimatedSessions: 2 },
      { phase: 2, title: "RabbitMQ & NATS", description: "RabbitMQ AMQP model (exchange, queue, binding), durable vs transient; NATS for low-latency pub/sub; comparison to Kafka.", estimatedSessions: 2 },
      { phase: 3, title: "Background Jobs", description: "Job queues (Sidekiq, Celery, asynq in Go), priorities, retries with exponential backoff, scheduled jobs, fair-share scheduling.", estimatedSessions: 2 },
      { phase: 4, title: "Workflow Orchestration", description: "Temporal vs AWS Step Functions vs Cadence; durable execution, signals + queries, sagas, long-running workflows.", estimatedSessions: 2 },
      { phase: 5, title: "Async Patterns in Production", description: "Idempotency keys, exactly-once via dedupe windows, poison-pill handling, the outbox pattern reprise, ordering guarantees.", estimatedSessions: 2 },
      { phase: 6, title: "Queues at Mindtickle", description: "Where Mindtickle uses Kafka vs SQS vs Lambda triggers vs Step Functions vs Workato (migrating out); the decision matrix.", estimatedSessions: 1 },
    ],
  },
  // ============== PHASE 3 — CROSS-SYSTEM ==============
  {
    topic: "lambda-stepfunctions",
    order: 15,
    macroPhase: 3,
    title: "AWS Lambda & Step Functions — Serverless at Scale",
    whyItMatters: "Mindtickle runs 1800+ Lambdas. Step Functions replaces Workato. Serverless is the integration layer.",
    outcomes: ["Decide Lambda vs container with cost + concurrency math", "Design Step Functions workflows with Map state + retry", "Mitigate cold starts; tune memory for cost+latency"],
    prerequisites: ["go-mastery", "kafka", "kubernetes"],
    outline: [
      { phase: 0, title: "Serverless Mental Model", description: "Execution model, cold start math, Lambda vs ECS vs EKS — when each.", estimatedSessions: 1 },
      { phase: 1, title: "Lambda Deep Dive", description: "Event sources, reserved + provisioned concurrency, VPC integration, layers, Power Tuning.", estimatedSessions: 3 },
      { phase: 2, title: "Lambda Patterns", description: "Fan-out via SNS/SQS, idempotency, DLQ + replay, partial batch failure, MSK ESM.", estimatedSessions: 2 },
      { phase: 3, title: "Step Functions Core", description: "ASL, state types, Map state for batch, error handling, Express vs Standard workflows.", estimatedSessions: 3 },
      { phase: 4, title: "Step Functions Patterns", description: "Orchestration vs choreography, nested workflows, long-running with task tokens, saga.", estimatedSessions: 2 },
      { phase: 5, title: "Deployment & Observability", description: "SAM vs CDK, versions + aliases, X-Ray tracing, CloudWatch → Loki migration, alarms.", estimatedSessions: 2 },
      { phase: 6, title: "Serverless at Mindtickle", description: "1800 Lambda deployment guide, asset automation, Workato → Step Functions migration.", estimatedSessions: 1 },
    ],
  },
  {
    topic: "storage-systems",
    order: 16,
    macroPhase: 3,
    title: "Storage Systems — S3, Snowflake, OpenSearch, Iceberg",
    whyItMatters: "Mindtickle uses S3, Snowflake, OpenSearch heavily. Iceberg is the 2026 lakehouse trend you should know.",
    outcomes: ["Design a data lakehouse on S3 + Iceberg", "Tune Snowflake warehouse sizing + clustering", "Reason about hot/warm/cold tiering"],
    prerequisites: ["sql-mysql"],
    outline: [
      { phase: 0, title: "Storage Landscape", description: "Block vs object vs file, row vs column-oriented, open table formats (Iceberg/Delta/Hudi).", estimatedSessions: 1 },
      { phase: 1, title: "S3 Deep Dive", description: "Consistency model, prefix sharding for throughput, storage tiers, presigned URLs, S3 events.", estimatedSessions: 2 },
      { phase: 2, title: "Snowflake", description: "Compute/storage separation, micro-partitions + clustering, warehouse sizing, time travel, data sharing.", estimatedSessions: 2 },
      { phase: 3, title: "Data Pipelines", description: "ETL vs ELT, Airflow / MWAA, Secor (Kafka → S3), CDC patterns, data quality.", estimatedSessions: 2 },
      { phase: 4, title: "Elasticsearch / OpenSearch", description: "Inverted index, BM25 relevance, aggregations, cluster ops, k-NN vector search + hybrid.", estimatedSessions: 2 },
      { phase: 5, title: "Storage at Mindtickle", description: "End-to-end NDP pipeline, Snowflake usage, where Iceberg might land next.", estimatedSessions: 2 },
    ],
  },
  {
    topic: "graphql-relay",
    order: 17,
    macroPhase: 3,
    title: "GraphQL & Relay — Mindtickle's API Layer",
    whyItMatters: "Mindtickle's frontends consume GraphQL via Relay. Without GraphQL fluency you're locked out of half the codebase.",
    outcomes: ["Design a GraphQL schema that survives 3 years of product change", "Eliminate N+1 with DataLoader", "Wire persisted queries for prod"],
    prerequisites: ["go-mastery", "networking"],
    outline: [
      { phase: 0, title: "Why GraphQL", description: "Over/under-fetching, GraphQL vs REST, BFF pattern, common pitfalls (auth, caching).", estimatedSessions: 1 },
      { phase: 1, title: "Schema Design", description: "Nullability defaults, Relay-style cursor pagination, errors-as-data, deprecation/evolution.", estimatedSessions: 2 },
      { phase: 2, title: "Resolvers & DataLoader", description: "Resolver chain, batching N+1 away, field-cost limiting, per-field authorization.", estimatedSessions: 2 },
      { phase: 3, title: "Relay on the Client", description: "Fragments + co-location, the Relay store, persisted queries, subscriptions + live queries.", estimatedSessions: 2 },
      { phase: 4, title: "GraphQL at Mindtickle", description: "BFF per MFE, federation tradeoffs, mt-shell + Relay across 150+ MFEs.", estimatedSessions: 1 },
    ],
  },
  {
    topic: "api-design",
    order: 18,
    macroPhase: 3,
    title: "API Design & Contracts — REST, gRPC, GraphQL",
    whyItMatters: "Mindtickle has 1500+ services talking via REST + gRPC + GraphQL. Sloppy contracts = years of compat hell. Senior engineers design APIs that survive 5 years.",
    outcomes: ["Author a REST + gRPC + GraphQL contract a junior can implement", "Design backward-compatible versioning that doesn't break consumers", "Use contract testing to prevent breaking changes from shipping"],
    prerequisites: ["networking", "graphql-relay"],
    outline: [
      { phase: 0, title: "API Design Principles", description: "REST maturity model, idempotency, pagination, error envelopes, consistent naming.", estimatedSessions: 2 },
      { phase: 1, title: "OpenAPI & Schema-First", description: "openapi-specs, spec-driven development, codegen for clients + servers, central registry.", estimatedSessions: 2 },
      { phase: 2, title: "API Versioning Strategies", description: "URL vs header versioning, semver for APIs, deprecation policy, sunset headers.", estimatedSessions: 1 },
      { phase: 3, title: "Contract Testing", description: "Pact (consumer-driven), Spring Cloud Contract, breaking-change detection in CI.", estimatedSessions: 2 },
      { phase: 4, title: "gRPC + Protobuf Evolution", description: "Reserved fields, oneof, deprecation, buf.build linting; never reuse tag numbers.", estimatedSessions: 2 },
      { phase: 5, title: "Rate Limiting & Quotas", description: "Token bucket vs sliding window, per-tenant quotas, Kong rate-limit plugin patterns.", estimatedSessions: 1 },
      { phase: 6, title: "API Design at Mindtickle", description: "platform-protos conventions, the openapi-specs registry, Kong as the front door.", estimatedSessions: 1 },
    ],
  },
  {
    topic: "iac-terraform",
    order: 19,
    macroPhase: 3,
    title: "Infrastructure as Code — Terraform, CDK, Pulumi",
    whyItMatters: "Mindtickle's AWS is defined in Terraform + CloudFormation. IaC fluency = the difference between asking devops for everything and shipping your own infra.",
    outcomes: ["Author a Terraform module others reuse", "Read + safely modify Mindtickle's IaC", "Choose Terraform vs CDK vs Pulumi with reasoning"],
    prerequisites: ["kubernetes"],
    outline: [
      { phase: 0, title: "Why IaC", description: "Declarative vs imperative, drift detection, why state is the hard part.", estimatedSessions: 1 },
      { phase: 1, title: "Terraform Fundamentals", description: "Providers, resources, data sources, modules, state backends (S3 + DynamoDB locking).", estimatedSessions: 2 },
      { phase: 2, title: "Terraform Patterns", description: "Workspaces, remote state, module registry, Terragrunt for DRY config.", estimatedSessions: 2 },
      { phase: 3, title: "AWS Patterns in Terraform", description: "VPC, EKS, IAM roles + IRSA, Lambda, RDS, Secrets Manager — the standard Mindtickle stack.", estimatedSessions: 2 },
      { phase: 4, title: "CDK / Pulumi — Programmable IaC", description: "When TypeScript/Go beats HCL; AWS CDK, Pulumi tradeoffs; the constructs model.", estimatedSessions: 2 },
      { phase: 5, title: "GitOps for IaC", description: "Atlantis, Terraform Cloud, drift detection, plan-on-PR + apply-on-merge.", estimatedSessions: 1 },
    ],
  },
  {
    topic: "ci-cd-gitops",
    order: 20,
    macroPhase: 3,
    title: "CI/CD & GitOps — Pipelines, Argo CD, Supply Chain",
    whyItMatters: "GitLab CI deploys every Mindtickle change. Argo CD is the modern delivery layer. Supply-chain attacks are now a top-3 risk.",
    outcomes: ["Author a fast, parallel, cached GitLab CI pipeline", "Deploy via Argo CD with progressive rollouts", "Sign + verify container images end-to-end"],
    prerequisites: ["kubernetes", "docker-containers"],
    outline: [
      { phase: 0, title: "CI/CD Fundamentals", description: "Pipelines, stages, artifacts, the deploy frequency / lead time / MTTR trifecta (DORA).", estimatedSessions: 1 },
      { phase: 1, title: "GitLab CI Deep Dive", description: "YAML reference, DAG pipelines, parent-child, dynamic pipelines, includes + components.", estimatedSessions: 2 },
      { phase: 2, title: "Build Optimization", description: "Layer caching, BuildKit, distributed caches, matrix parallelism; cutting CI from 30min to 5min.", estimatedSessions: 2 },
      { phase: 3, title: "Argo CD & GitOps", description: "Declarative deployment, ApplicationSets, sync policies, app-of-apps pattern.", estimatedSessions: 2 },
      { phase: 4, title: "Progressive Delivery", description: "Argo Rollouts (canary, blue-green), Flagger, feature flags with GrowthBook / LaunchDarkly.", estimatedSessions: 2 },
      { phase: 5, title: "Supply Chain Security", description: "SBOM generation (Syft), image signing (Cosign), SLSA levels, dependency scanning (Dependabot/Renovate).", estimatedSessions: 2 },
      { phase: 6, title: "CI/CD at Mindtickle", description: "GitLab CI templates, devops-helm-charts deploy flow, the Apps Store → integration → staging → prod path.", estimatedSessions: 2 },
    ],
  },
  {
    topic: "auth-identity-saas",
    order: 21,
    macroPhase: 3,
    title: "Authentication & Identity at SaaS Scale",
    whyItMatters: "Mindtickle's customers (75-80% of orgs) use SAML SSO. Mistakes in auth = data leaks + outages = front-page risk. The patterns are subtle and not in generic security courses.",
    outcomes: ["Implement SAML SSO + OAuth2/OIDC flows end-to-end", "Design a multi-tenant identity gateway with Redis-backed sessions", "Handle SAML certificate rotation without outages"],
    prerequisites: ["security", "redis", "graphql-relay"],
    outline: [
      { phase: 0, title: "The SaaS Identity Landscape", description: "Sessions vs JWTs vs Passkeys; B2B identity (SCIM, SAML, OIDC) vs B2C; customer SSO is the table stakes for enterprise SaaS.", estimatedSessions: 1 },
      { phase: 1, title: "SAML SSO Deep Dive", description: "SAML 2.0 spec, IdP-initiated vs SP-initiated, the assertion shape, certificate handling, why 75% of Mindtickle customers use SAML and what breaks.", estimatedSessions: 2 },
      { phase: 2, title: "OAuth 2.0 / OIDC Mastery", description: "Authorization code with PKCE, refresh tokens, scopes, ID tokens vs access tokens; common pitfalls (state, nonce, redirect_uri whitelist).", estimatedSessions: 2 },
      { phase: 3, title: "Identity Gateway Pattern", description: "Mindtickle's custom auth gateway: /login, /login/saml/:type/callback, /oauth/:type/callback; Redis-backed sessions; proxying downstream services.", estimatedSessions: 2 },
      { phase: 4, title: "Multi-Tenant Identity", description: "Per-tenant IdP configuration, tenant resolution from SAML/OAuth callbacks, account-level vs platform-level OAuth (the MCP integration pattern).", estimatedSessions: 2 },
      { phase: 5, title: "MFA, SCIM, Customer-Managed Keys", description: "MFA flows, SCIM for user provisioning, BYOK for compliance, SAML cert rotation runbook (the 2023 incident lesson).", estimatedSessions: 2 },
      { phase: 6, title: "Auth at Mindtickle", description: "End-to-end: the auth gateway, Okta SAML integration, the SAML SSO incident report (UMM/3433693274), how Mindtickle handles 75% customer SSO.", estimatedSessions: 2 },
    ],
  },
  {
    topic: "api-gateway-edge",
    order: 22,
    macroPhase: 3,
    title: "API Gateways & Edge — Kong, AWS APIGW, Cloudflare Workers",
    whyItMatters: "Mindtickle fronts external traffic with Kong. The gateway is where you enforce auth, rate limits, transformation, observability — without touching app code. Edge functions push this even closer to the user.",
    outcomes: ["Configure Kong / AWS API Gateway / Envoy with auth + rate limit + transformation", "Decide gateway vs sidecar vs in-app for cross-cutting concerns", "Push logic to the edge (CloudFront Functions, Lambda@Edge, Cloudflare Workers)"],
    prerequisites: ["networking", "kubernetes"],
    outline: [
      { phase: 0, title: "Why an API Gateway", description: "Cross-cutting concerns (auth, rate limit, transformation, logging, CORS); gateway vs reverse proxy vs service mesh; the N+1 services problem.", estimatedSessions: 1 },
      { phase: 1, title: "Kong Deep Dive", description: "Routes, services, consumers, plugins; Mindtickle's Kong setup; rate-limit + key-auth + jwt plugins; gRPC-to-REST translation.", estimatedSessions: 2 },
      { phase: 2, title: "AWS API Gateway", description: "REST API vs HTTP API vs WebSocket; Lambda integration; throttling + usage plans + API keys; private vs edge-optimized endpoints.", estimatedSessions: 2 },
      { phase: 3, title: "Envoy & Modern Gateways", description: "Envoy as a proxy, xDS protocol, Ambassador / Emissary, Gateway API standard in K8s, the Istio gateway story.", estimatedSessions: 2 },
      { phase: 4, title: "Rate Limiting & Quotas Deep", description: "Token bucket vs sliding window vs fixed window; distributed rate limiting (Redis Lua), per-tenant quotas, fair-share, abuse detection.", estimatedSessions: 2 },
      { phase: 5, title: "Edge Compute", description: "CloudFront Functions (light), Lambda@Edge (heavier), Cloudflare Workers, Vercel Edge — when each; cold-start + cost; what runs at the edge well vs poorly.", estimatedSessions: 2 },
      { phase: 6, title: "Gateways at Mindtickle", description: "Kong as front-door for external traffic + Mindtickle MCP server auth pattern; the auth gap noted in COE/5606440973 and how it's being fixed.", estimatedSessions: 1 },
    ],
  },
  {
    topic: "realtime-systems",
    order: 23,
    macroPhase: 3,
    title: "Real-Time Systems — WebSockets, SSE, Push, Presence",
    whyItMatters: "Mindtickle's Copilot chat, VoiceAssistant, live coaching all need real-time. Long-polling is over; WebSockets + SSE are the modern toolkit. Scaling them past 10k connections requires patterns most engineers never learn.",
    outcomes: ["Build a WebSocket server that scales horizontally (with a backplane)", "Choose between WebSocket / SSE / long-polling / push correctly", "Implement presence + fan-out + delivery guarantees"],
    prerequisites: ["networking", "redis", "kafka"],
    outline: [
      { phase: 0, title: "The Real-Time Landscape", description: "Long-polling vs SSE vs WebSocket vs WebTransport; which the browser supports + when each fits; gRPC streaming as the server-to-server analog.", estimatedSessions: 1 },
      { phase: 1, title: "WebSockets in Production", description: "Handshake, frames, ping/pong + keep-alive, reconnection logic, message framing; scaling past one box (sticky LB + Redis pub/sub backplane).", estimatedSessions: 2 },
      { phase: 2, title: "Server-Sent Events (SSE)", description: "When SSE > WebSocket (one-way streams, simpler semantics, HTTP/2 friendly); Last-Event-ID for replay; how Mindtickle Copilot streams responses.", estimatedSessions: 1 },
      { phase: 3, title: "Push Notifications", description: "APNs (iOS), FCM (Android), Web Push; payload size limits, silent push, delivery receipts, the Mindtickle notification-hub design.", estimatedSessions: 2 },
      { phase: 4, title: "Fan-Out & Presence", description: "Fan-out on write vs read (the Twitter problem); presence systems (Redis with ephemeral TTLs); chat-style messaging architecture.", estimatedSessions: 2 },
      { phase: 5, title: "Real-Time at Mindtickle", description: "How Copilot streams LLM responses (SSE); VoiceAssistant streaming pipeline; mt-shell socket patterns; how the dashboard updates in real-time.", estimatedSessions: 2 },
    ],
  },
  // ============== PHASE 4 — AI PLATFORM ==============
  {
    topic: "ai-agentic",
    order: 24,
    macroPhase: 4,
    title: "AI / Agentic Systems — RAG, Agents, MCP, Evals",
    whyItMatters: "Your unique edge. Verly is an AI chatbot platform; Mindtickle has a first-class Agentic Platform. 2026's hottest domain.",
    outcomes: ["Build a production RAG with chunking, reranking, hybrid search", "Author an MCP server with auth + observability", "Cut LLM cost 10x with caching + model routing"],
    prerequisites: ["go-mastery", "observability"],
    outline: [
      { phase: 0, title: "LLM Fundamentals", description: "Tokenization, embeddings, attention, inference economics (hosted vs vLLM / TGI).", estimatedSessions: 2 },
      { phase: 1, title: "Prompt Engineering", description: "Anatomy of a prompt, few-shot + CoT, structured output (JSON Schema), Anthropic prompt caching.", estimatedSessions: 2 },
      { phase: 2, title: "RAG (Retrieval-Augmented Generation)", description: "Chunking, embedding models, vector stores, retrieval tuning, reranking, hybrid search.", estimatedSessions: 3 },
      { phase: 3, title: "Tool Use & MCP", description: "Function calling, the MCP spec, building servers, auth via Kong, Anthropic Agent Skills.", estimatedSessions: 3 },
      { phase: 4, title: "Agent Patterns", description: "Augmented LLM, prompt chaining, routing, parallelization, orchestrator-workers, evaluator-optimizer, autonomous.", estimatedSessions: 3 },
      { phase: 5, title: "Evaluation", description: "Golden sets, LLM-as-judge, retrieval metrics, evals in CI, DeepEval + Langfuse.", estimatedSessions: 2 },
      { phase: 6, title: "Production AI", description: "Cost engineering, LiteLLM gateway, LLM observability, safety guardrails, multi-tenant AI.", estimatedSessions: 3 },
      { phase: 7, title: "AI at Mindtickle", description: "Agentic Platform, MCP server, DSP Agent, VoiceAssistantService, Compass AI.", estimatedSessions: 2 },
    ],
  },
  {
    topic: "mindtickle-internals",
    order: 25,
    macroPhase: 4,
    title: "Mindtickle Internals — The Meta-Course",
    whyItMatters: "Knowing the meta-layer (Apps Store, Golden Code, Cursor Rules, NDP, Compass) lets you navigate any unfamiliar repo in <30 min.",
    outcomes: ["Onboard onto any Mindtickle service in <30 minutes", "Use Apps Store, Hoop, Compass, mt-skill-reviewer fluently", "Author skills + plugins others adopt"],
    prerequisites: ["go-mastery", "kafka", "kubernetes", "ai-agentic"],
    outline: [
      { phase: 0, title: "The Mindtickle Map", description: "Confluence spaces, GitLab org layout, service taxonomy (BE, MFEs, Lambdas, infra).", estimatedSessions: 1 },
      { phase: 1, title: "Apps Store & Service Onboarding", description: "Apps Store catalog, MCE AWS onboarding, GitLab CI pipeline, devops-helm-charts conventions.", estimatedSessions: 2 },
      { phase: 2, title: "Developer Experience Stack", description: "Hoop.dev bastion, Mindtickle Claude plugins, Cursor Rules, mt-linters + /lint-mr.", estimatedSessions: 2 },
      { phase: 3, title: "Compass AI & Code Navigation", description: "Service catalog, cross-repo doc search, AI-README per service, the Compass design.", estimatedSessions: 2 },
      { phase: 4, title: "Cross-Cutting Initiatives", description: "Golden Code Initiative, CloudWatch → Loki, Couchbase → DynamoDB, Workato → Step Functions.", estimatedSessions: 2 },
    ],
  },
  // ============== PHASE 5 — STAFF CRAFT ==============
  {
    topic: "distributed-systems-theory",
    order: 26,
    macroPhase: 5,
    title: "Distributed Systems Theory — DDIA, Papers, CAP",
    whyItMatters: "System design without theory is folklore. The papers are what separate 'I think this scales' from 'I can prove it'.",
    outcomes: ["Read a distributed systems paper in <2 hours and summarize it", "Reason about CAP, PACELC, FLP for any given problem", "Anticipate failure modes from first principles"],
    prerequisites: ["kafka", "redis", "dynamodb"],
    outline: [
      { phase: 0, title: "DDIA — The Foundation", description: "Kleppmann cover-to-cover: foundations (Ch 1-4), distributed data (5-9), derived data (10-12).", estimatedSessions: 8 },
      { phase: 1, title: "Theorems & Models", description: "CAP (correctly), PACELC for latency, FLP impossibility, CALM (consistency as logical monotonicity).", estimatedSessions: 2 },
      { phase: 2, title: "Consensus & Replication", description: "Paxos Made Simple, Raft paper, KRaft vs ZooKeeper, sync vs async vs quorum replication.", estimatedSessions: 3 },
      { phase: 3, title: "Foundational Papers", description: "Dynamo, Bigtable, Spanner (TrueTime), MapReduce, Aurora, The Tail at Scale.", estimatedSessions: 6 },
      { phase: 4, title: "Jepsen & Failure Modes", description: "Why Jepsen matters, 5 analyses to read, the anomaly vocabulary (stale read, write skew, phantom).", estimatedSessions: 2 },
      { phase: 5, title: "Multi-Region & Disaster Recovery", description: "Active-active vs active-passive, RTO/RPO, CRDTs, DR drills.", estimatedSessions: 3 },
    ],
  },
  {
    topic: "system-design",
    order: 27,
    macroPhase: 5,
    title: "System Design — From URL Shortener to Active-Active",
    whyItMatters: "The skill that unlocks Senior+. Each rung — service, multi-region, multi-tenant SaaS — requires the previous one.",
    outcomes: ["Frame any design problem in 2 minutes (requirements → estimates → high-level → deep-dive)", "Defend tradeoffs with quantitative reasoning", "Author a 4-page TRD that needs <2 review rounds"],
    prerequisites: ["kafka", "redis", "dynamodb", "kubernetes", "distributed-systems-theory"],
    outline: [
      { phase: 0, title: "Fundamentals & Back-of-Envelope", description: "Latency numbers everyone knows, QPS / bandwidth / storage estimation, consistency models.", estimatedSessions: 2 },
      { phase: 1, title: "The Building Blocks", description: "Load balancers, CDN, DNS, cache layers, queues/brokers, DB-type tradeoffs.", estimatedSessions: 3 },
      { phase: 2, title: "Patterns Catalog", description: "30+ distributed patterns (Fowler/Joshi), communication, data, resilience patterns.", estimatedSessions: 3 },
      { phase: 3, title: "Classic Designs", description: "URL shortener, rate limiter, chat, notification, news feed, search.", estimatedSessions: 4 },
      { phase: 4, title: "Advanced Designs", description: "Multi-tenant SaaS billing, CDC + analytics pipeline (NDP), agentic platform, voice AI at scale.", estimatedSessions: 4 },
      { phase: 5, title: "Migration & Evolution", description: "Couchbase → DynamoDB, monolith → services (strangler fig), multi-region, capacity planning.", estimatedSessions: 3 },
      { phase: 6, title: "The Design Interview & Review", description: "The 4-step framework, framing tradeoffs, depth signals, running a design review.", estimatedSessions: 2 },
    ],
  },
  {
    topic: "multi-tenancy-patterns",
    order: 28,
    macroPhase: 5,
    title: "Multi-Tenancy Patterns for SaaS",
    whyItMatters: "Mindtickle is a multi-tenant SaaS — every design decision touches tenant isolation, noisy-neighbor mitigation, and per-tenant cost. The patterns here are non-obvious and expensive to get wrong.",
    outcomes: ["Choose between row / schema / cluster isolation with reasoning", "Propagate tenant_id safely across services + queues", "Attribute cost and rate-limit per tenant"],
    prerequisites: ["kubernetes", "dynamodb", "security"],
    outline: [
      { phase: 0, title: "Isolation Models", description: "Row-level vs schema-per-tenant vs DB-per-tenant vs cluster-per-tenant; cost vs blast-radius tradeoffs.", estimatedSessions: 2 },
      { phase: 1, title: "Tenant Context Propagation", description: "tenant_id on every request/log/metric, middleware + gRPC interceptors, Kafka headers, never-trust-the-payload.", estimatedSessions: 2 },
      { phase: 2, title: "Noisy Neighbor Mitigation", description: "Per-tenant rate limits, queue isolation, capacity reservations, work-stealing patterns.", estimatedSessions: 2 },
      { phase: 3, title: "Cost Attribution Per Tenant", description: "Tagging strategies, AWS Cost Allocation tags, per-tenant metering, billing event streams.", estimatedSessions: 2 },
      { phase: 4, title: "Compliance Per Tenant", description: "Data residency, GDPR per-region, customer-managed encryption keys (BYOK), audit logging.", estimatedSessions: 2 },
      { phase: 5, title: "Multi-Tenancy at Mindtickle", description: "How Mindtickle handles tenant isolation across 1500 services — the patterns, the gotchas, the migrations.", estimatedSessions: 2 },
    ],
  },
  {
    topic: "performance-engineering",
    order: 29,
    macroPhase: 5,
    title: "Performance Engineering — Load, Capacity, Chaos",
    whyItMatters: "Capacity planning + load testing + chaos engineering = the difference between scaling smoothly and crashing in front of customers. Staff engineers own this discipline.",
    outcomes: ["Design a k6/Locust load test that proves an SLO", "Compute back-of-envelope capacity for 10x growth", "Run a game day; survive it"],
    prerequisites: ["observability", "kafka", "redis"],
    outline: [
      { phase: 0, title: "The Performance Mindset", description: "USE/RED, latency budgets, percentiles (p50 < p99 < p99.9 < max), 'fast enough at p99'.", estimatedSessions: 1 },
      { phase: 1, title: "Load Testing", description: "k6, Locust, Gatling — scenario design, ramp profiles, realistic traffic mix, distributed load.", estimatedSessions: 2 },
      { phase: 2, title: "Capacity Planning", description: "QPS × p99 × concurrency math, headroom (Erlang C basics), growth projections, autoscaling policy.", estimatedSessions: 2 },
      { phase: 3, title: "Continuous Profiling at Scale", description: "Pyroscope, Datadog Profiler, Polar Signals — always-on profiling; finding regressions before users do.", estimatedSessions: 2 },
      { phase: 4, title: "Latency Engineering", description: "Tail latency tactics from 'The Tail at Scale': hedging, micro-batches, request reduction, isolation.", estimatedSessions: 2 },
      { phase: 5, title: "Chaos Engineering", description: "Litmus, Chaos Mesh, AWS Fault Injection Simulator, game days; the hypothesis-driven approach.", estimatedSessions: 2 },
    ],
  },
  // ============== PHASE 6 — PRINCIPAL CRAFT ==============
  {
    topic: "staff-principal-skills",
    order: 30,
    macroPhase: 6,
    title: "Staff & Principal Engineer Skills",
    whyItMatters: "Technical skill caps at Senior. Written communication, strategy, influence, mentorship unlock Staff → Principal.",
    outcomes: ["Write engineering strategy docs people follow", "Influence org-wide decisions without authority", "Build a public portfolio that opens doors"],
    prerequisites: ["system-design", "distributed-systems-theory"],
    outline: [
      { phase: 0, title: "The Level Gap", description: "Staff archetypes (Larson), scope vs depth tradeoff, what Staff engineers actually do day-to-day.", estimatedSessions: 1 },
      { phase: 1, title: "Written Communication", description: "TRD craft, ADR discipline, vision docs, executive summaries, RFC process.", estimatedSessions: 3 },
      { phase: 2, title: "Technical Strategy", description: "Good Strategy / Bad Strategy (Rumelt), tech debt as asset, platform thinking, migration planning.", estimatedSessions: 2 },
      { phase: 3, title: "Influence & Leadership (no authority)", description: "Leading peers, peer networks, running design reviews, mentoring 1:1s.", estimatedSessions: 2 },
      { phase: 4, title: "Business Acumen", description: "Cost engineering as discipline, product sense, stakeholder management, prioritization frameworks.", estimatedSessions: 2 },
      { phase: 5, title: "Building Your Portfolio", description: "Public writing, OSS contributions, speaking (lunch & learn → external), the personal north star.", estimatedSessions: 2 },
    ],
  },
];

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

function difficultyFor(phase: number): "beginner" | "intermediate" | "advanced" {
  return phase <= 1 ? "beginner" : phase <= 3 ? "intermediate" : "advanced";
}

function phaseSlug(course: CourseDefinition, phase: PhaseOutline): string {
  const titleSlug = phase.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `${course.topic}-phase-${phase.phase}-${titleSlug}`;
}

/**
 * Lightweight placeholder content — the seed only describes the PLAN.
 * Running `/study <topic>` in Claude Code expands this into deep material.
 */
function buildPlaceholderContent(course: CourseDefinition, phase: PhaseOutline): string {
  return `# Phase ${phase.phase} — ${phase.title}

${phase.description}

**Track:** ${course.title}
**Order in roadmap:** #${String(course.order).padStart(2, "0")} of 30 · macro-phase ${course.macroPhase}
**Estimated effort:** ~${phase.estimatedSessions} focused session(s) of 1-2 hours each
**Difficulty:** ${difficultyFor(phase.phase)}

---

This is a placeholder. The deep content for this phase hasn't been generated yet.

**To generate the full study material** (theory + diagrams + runnable Go exercises + real Mindtickle code anchors), run from the \`verly\` repo in Claude Code:

\`\`\`
/study ${course.topic}
\`\`\`

The \`/study\` skill will check the database, see this track is on phase ${phase.phase}, and generate a 30-50KB deep-dive specifically for this phase. Then mark it complete here and say \`next\` to continue.
`;
}

function generateStudyMaterials(course: CourseDefinition): StudyMaterialPayload[] {
  return course.outline.map((phase) => ({
    slug: phaseSlug(course, phase),
    title: `Phase ${phase.phase}: ${phase.title}`,
    category: course.topic,
    difficulty: difficultyFor(phase.phase),
    estimatedMinutes: phase.estimatedSessions * 60,
    tags: [course.topic, `phase-${phase.phase}`, difficultyFor(phase.phase), `macro-phase-${course.macroPhase}`],
    summary: phase.description,
    content: buildPlaceholderContent(course, phase),
    source: "learning-plan",
  }));
}

// ─────────────────────────────────────────────────────────
// Seed
// ─────────────────────────────────────────────────────────

async function upsertCourse(course: CourseDefinition): Promise<string> {
  const body = {
    topic: course.topic,
    title: course.title,
    totalPhases: course.outline.length,
    outline: course.outline,
    config: {
      source: "principal-engineer-plan",
      version: PLAN_VERSION,
      order: course.order,
      macroPhase: course.macroPhase,
      prerequisites: course.prerequisites,
      whyItMatters: course.whyItMatters,
      outcomes: course.outcomes,
    },
  };

  const post = await fetch(`${API_BASE}/api/courses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, currentPhase: 0 }),
  });
  if (post.status === 201) return "+";

  const patch = await fetch(`${API_BASE}/api/courses`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return patch.ok ? "=" : "x";
}

async function refreshMaterialsForTopic(course: CourseDefinition): Promise<number> {
  await fetch(`${API_BASE}/api/study?topic=${encodeURIComponent(course.topic)}`, {
    method: "DELETE",
  }).catch(() => null);
  let created = 0;
  for (const material of generateStudyMaterials(course)) {
    const res = await fetch(`${API_BASE}/api/study`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(material),
    });
    if (res.status === 201) created++;
  }
  return created;
}

/**
 * Wipe placeholder materials sourced from this seed (source = "learning-plan").
 * Study Materials page should ONLY show real /study-generated content,
 * not the skeleton placeholders this seed creates for the roadmap.
 */
async function wipeLearningPlanPlaceholders(): Promise<number> {
  let wiped = 0;
  for (const course of courses) {
    try {
      const res = await fetch(
        `${API_BASE}/api/study?topic=${encodeURIComponent(course.topic)}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        const body = await res.json().catch(() => ({}));
        wiped += body.deleted || 0;
      }
    } catch {
      // ignore
    }
  }
  return wiped;
}

async function main() {
  console.log(`Seeding Principal Engineer learning PLAN (version ${PLAN_VERSION})`);
  console.log(`API: ${API_BASE}\n`);

  console.log("Upserting courses (plan only — /study fills in the content per phase)...");
  for (const course of courses) {
    try {
      const symbol = await upsertCourse(course);
      console.log(`  [${symbol}] #${String(course.order).padStart(2, "0")} · phase ${course.macroPhase} · ${course.topic.padEnd(28)} ${course.title}`);
    } catch (err) {
      console.error(`  [ERR] ${course.topic}: ${err}`);
    }
  }

  // Study Materials page should reflect only real /study-generated content.
  // Wipe any previous placeholder rows from this seed; new ones are NOT created.
  console.log("\nClearing placeholder study materials (only real /study content should appear)...");
  const wiped = await wipeLearningPlanPlaceholders();
  console.log(`  Cleared ${wiped} placeholder rows.`);

  console.log(`\nDone. ${courses.length} courses on the roadmap.`);
  console.log("Legend: + new, = updated, x error\n");
  console.log("Next steps:");
  console.log("  1. Open /roadmap to see the plan");
  console.log("  2. When you start a phase, run from the verly repo:");
  console.log("       /study <topic>");
  console.log("     The skill generates the deep material for that phase and saves it to the DB.");
  console.log("  3. Study Materials page will then show only what you've actually generated.");
}

main().catch(console.error);
