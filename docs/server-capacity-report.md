# Server Capacity Report

**Project:** NaviThera Backend
**Date:** April 18, 2026
**Server:** Hetzner VPS (Nebihaji1)

---

## 1. Server Specifications

| Spec | Value |
|------|-------|
| CPU | 4 vCPU (x86_64) |
| RAM | 7.6 GB |
| Swap | 4 GB |
| Disk | 75 GB SSD (28 GB free) |
| OS | Ubuntu 20.04 (kernel 5.4.0-216) |
| Network | Shared bandwidth |

**Effective memory ceiling:** 7.6 GB RAM + 4 GB swap = **11.6 GB** before OOM kill (swap is slow — degrades performance but prevents crashes)

## 2. Application Stack

| Service | Container RAM | CPU % (idle) |
|---------|--------------|-------------|
| NestJS App | 678 MB | 1.6% |
| MySQL 8.0 | 1.2 GB | 1.5% |
| Redis | 8.5 MB | 1.3% |
| Traefik (reverse proxy) | 36 MB | ~0% |
| HAProxy (load balancer) | 80 MB | ~0% |
| Caddy (LiveKit proxy) | 17 MB | ~0% |
| phpMyAdmin | 63 MB | ~0% |
| **Total** | **~2.1 GB** | **~5%** |

**Available RAM:** 7.6 GB - 2.1 GB = **5.5 GB headroom** (+ 4 GB swap as safety net)

**Note:** LiveKit is hosted on a separate server and is excluded from this report.

## 3. Application Profile

| Metric | Count |
|--------|-------|
| API Endpoints | 237 |
| WebSocket Gateways | 1 (presence) |
| Cron Jobs | 7 |
| BullMQ Processors | 1 |
| TypeORM Entities | 34 |
| Eager Relations | 21 |
| Cascade Relations | 17 |

## 4. Known Issues Affecting Capacity

### 4.1 Eager Loading Chain (CRITICAL)

21 eager relations create cascading data loads. One session query triggers:

```
Session → Therapist (eager) → Expertise[] (eager)
       → PaymentPeriod (eager)
       → ClientSubscription (via subscription)
           → Therapist (eager, again)
           → Subscription (eager) → Modal (eager) + Level (eager)
           → Session[] (eager, ALL sessions)        ← loads entire table
           → GroupSessions[] (eager, ALL group sessions) ← loads entire table
```

**Impact:** A single query can load the entire sessions table into memory through the ClientSubscription.session eager chain. This is the primary cause of heap crashes with as few as 3 concurrent users.

**Status:** Not yet fixed. Frontend already uses `?fields=` param to specify which relations to load — eager is redundant and purely harmful.

### 4.2 Admin Panel Polling (FIXED)

Previously: 46 requests/min per open admin tab, running 24/7 including in background tabs (~66,000 requests/day from one tab).

Now: Disabled via global `POLLING_ENABLED` flag. Data refreshes only on page navigation and after mutations.

### 4.3 Swap (FIXED)

Previously: 0 swap — any memory spike beyond 7.6 GB killed the process instantly.

Now: 4 GB swap configured. Prevents OOM kills, provides buffer for memory spikes.

## 5. Capacity Calculations

### 5.1 CPU Capacity

| Factor | Value |
|--------|-------|
| Total CPU | 4 vCPU |
| Idle usage | ~5% (0.2 vCPU) |
| Available for requests | 3.8 vCPU |
| NestJS throughput per vCPU | ~200-300 req/s (typical CRUD) |
| **Max throughput** | **~800 req/s** |

**Per-user request rate:**

| Activity | Req/min |
|----------|---------|
| Idle/background | 0.5 |
| Browsing (loading screens, fetching sessions) | 2-5 |
| Active therapy session (chat) | 10-20 |

| Scenario | Avg req/min per user | Max concurrent users |
|----------|---------------------|---------------------|
| All idle | 0.5 | 96,000 |
| All browsing | 5 | 9,600 |
| All in active chat | 20 | 2,400 |
| **Mixed realistic** (10% active, 30% browsing, 60% idle) | **2.5** | **19,200** |

**CPU is not a bottleneck.**

### 5.2 Memory Capacity

#### Current state (WITH 21 eager relations, WITH 4 GB swap)

| Factor | Value |
|--------|-------|
| Base app usage | 678 MB |
| Per-request memory spike (eager chain) | 10-50 MB |
| Heavy query spike (analytics/revenue) | 100-200+ MB |
| RAM available for requests | 5,500 MB |
| Swap available (slow, prevents crash) | 4,000 MB |
| Concurrent requests before degradation | 5500 / 50 = **~110** |
| Concurrent requests before OOM (with swap) | 9500 / 50 = **~190** |
| At 5 req/min per user | **~150-250 concurrent users** |

Swap prevents crashes but degrades performance severely. Users experience slow responses (2-10s) when the app starts swapping.

#### After removing eager loading

| Factor | Value |
|--------|-------|
| Base app usage (estimated) | ~400 MB |
| Per-request memory spike | 1-5 MB |
| RAM available for requests | 7,200 MB |
| Concurrent requests before any concern | 7200 / 5 = **~1,400** |
| At 5 req/min per user | **~12,000+ concurrent users** |

### 5.3 MySQL Capacity

| Factor | Value |
|--------|-------|
| Instance | MySQL 8.0, 1.2 GB RAM |
| Max connections (default) | 151 |
| NestJS connection pool (TypeORM default) | 10 |
| Queries per connection per second | ~50-100 (CRUD) |
| **Max query throughput** | **~500-1,000 queries/s** |

Per-user DB load: ~1-3 queries per API request, ~5-15 queries/min for active users.

| Concurrent active users | Queries/sec | Status |
|------------------------|------------|--------|
| 100 | ~25 | Comfortable |
| 500 | ~125 | Fine |
| 1,000 | ~250 | Fine |
| 2,000 | ~500 | At limit |

**DB bottleneck: ~2,000 concurrent active users.**

### 5.4 Redis Capacity

| Factor | Value |
|--------|-------|
| Current usage | 8.5 MB |
| Operations/sec capacity | ~50,000+ |
| Current use | Presence tracking, BullMQ jobs, Socket.IO adapter |

**Not a bottleneck until 10,000+ concurrent users.**

### 5.5 WebSocket Capacity

| Factor | Value |
|--------|-------|
| Protocol | Socket.IO via Redis adapter |
| RAM per connection | ~5-10 KB |
| Max connections (available RAM) | ~3,000-5,000 |
| File descriptors (default ulimit) | 1,024 |

**WebSocket bottleneck: ~1,000 connections** (limited by default ulimit, not RAM). Fix with `ulimit -n 65535` to unlock ~5,000.

### 5.6 Network / Bandwidth

| Factor | Value |
|--------|-------|
| Average API response size | ~2-10 KB |
| At 500 active users, 5 req/min | ~25 MB/min = ~1.5 GB/hour |
| Hetzner included bandwidth | 20+ TB/month |

**Not a bottleneck.**

## 6. Capacity Summary

### Three scenarios

#### A. Current state (eager loading present, polling disabled, swap added)

| Resource | Bottleneck at | Status |
|----------|--------------|--------|
| **Memory** | **~150-250 concurrent** | **Primary bottleneck** |
| MySQL | ~2,000 concurrent | Fine |
| WebSocket | ~1,000 concurrent | Fixable (ulimit) |
| CPU | ~19,000 concurrent | Fine |
| Redis | ~10,000+ concurrent | Fine |

**Max: ~150-250 concurrent users.** Swap prevents crashes but performance degrades. Heap memory is still the bottleneck due to eager loading.

#### B. After removing eager loading

| Resource | Bottleneck at | Status |
|----------|--------------|--------|
| Memory | ~2,000-3,000 concurrent | Fine |
| **MySQL** | **~2,000 concurrent** | **New bottleneck** |
| WebSocket | ~1,000-5,000 concurrent | Fixable (ulimit) |
| CPU | ~19,000 concurrent | Fine |
| Redis | ~10,000+ concurrent | Fine |

**Max: ~2,000 concurrent users.** Memory is no longer the bottleneck. MySQL connection pool becomes the limiting factor.

#### C. Fully optimized (eager removed + DB indexes + connection pool tuned + ulimit fixed)

| Resource | Bottleneck at | Status |
|----------|--------------|--------|
| Memory | ~3,000+ concurrent | Fine |
| MySQL | ~3,000-4,000 concurrent | Fine |
| WebSocket | ~5,000 concurrent | Fine |
| CPU | ~19,000 concurrent | Fine |
| Redis | ~10,000+ concurrent | Fine |

**Max: ~3,000 concurrent users.**

### Concurrent vs registered users

Typically 5-10% of registered users are concurrent at peak.

| Registered users | Peak concurrent (10%) | Scenario A (current) | Scenario B (no eager) | Scenario C (optimized) |
|------------------|-----------------------|---------------------|----------------------|----------------------|
| 300 | 30 | Comfortable | Comfortable | Comfortable |
| 500 | 50 | Comfortable | Comfortable | Comfortable |
| 1,000 | 100 | Comfortable | Comfortable | Comfortable |
| 2,500 | 250 | At limit | Comfortable | Comfortable |
| 5,000 | 500 | Crashes | Comfortable | Comfortable |
| 10,000 | 1,000 | Crashes | Fine | Comfortable |
| 20,000 | 2,000 | Crashes | At limit | Fine |
| 30,000 | 3,000 | Crashes | Upgrade needed | At limit |

## 7. Recommended Optimizations (Priority Order)

| # | Fix | Impact | Effort | Status |
|---|-----|--------|--------|--------|
| 1 | Remove eager: true (21 relations) | 150 → 2,000 concurrent | Medium | Pending |
| 2 | Add swap | Prevents instant OOM kills | 5 minutes | Done |
| 3 | Disable admin panel polling | -46 req/min per tab | Low | Done |
| 4 | Remove console.log in production | Reduces memory allocation | Low | Pending |
| 5 | Set --max-old-space-size=1024 | Controls Node heap growth | 1 line | Pending |
| 6 | Remove unnecessary cascade: true | Prevents bulk memory ops | Low | Pending |
| 7 | Add default pagination (limit 50) | Caps response sizes | Low | Pending |
| 8 | Add DB indexes on filter columns | Speeds queries 2-10x | Low | Pending |
| 9 | Increase ulimit to 65535 | 1,000 → 5,000 WebSocket connections | 1 line | Pending |
| 10 | Tune MySQL connection pool (30-50) | Higher query concurrency | 1 line | Pending |
| 11 | Batch notification cron queries | Reduces memory spikes | Medium | Pending |

## 8. When to Upgrade Server

| Trigger | Action | Cost impact |
|---------|--------|-------------|
| RAM consistently > 6 GB | Upgrade to 8 vCPU / 16 GB | ~$30/month |
| Disk > 80% used (60 GB) | Add volume or upgrade disk | ~$5/month |
| MySQL slow queries > 1s regularly | Add read replica or upgrade instance | ~$20/month |
| > 3,000 concurrent users | Add second app instance + load balancer | ~$20/month |

## 9. Comparison: Hetzner vs AWS Migration

| | Hetzner (current) | AWS (proposed) |
|---|---|---|
| Monthly cost | ~$20 | ~$435 |
| Max concurrent (after optimization) | ~3,000 | ~3,000 (similar compute) |
| Cost per concurrent user | $0.007 | $0.145 |
| Management overhead | Docker Compose | ECS + RDS + ElastiCache + NLB + NAT |
| Time to scale up | Minutes (resize VPS) | Minutes (add tasks) |
| Auto-scaling | Manual | Available |

**Recommendation:** Stay on Hetzner until reaching 20,000+ registered users or requiring multi-region deployment. The 20x cost difference buys no meaningful capacity advantage at current scale.

---

**Bottom line:** With swap added and polling disabled, the server handles ~150-250 concurrent users today. Removing eager loading (the single biggest fix) unlocks ~2,000 concurrent users on the same hardware. Full optimization reaches ~3,000. No infrastructure migration needed.
