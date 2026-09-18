# Infra Reckoner — developer notes

Read this before changing anything under `reckoner/`. It covers the one thing
that will catch you out (there is no source code here), the server
configurations and prices the tool quotes, and how it decides what to quote.

The reckoner is the sizing/cost estimator served at:

| Path | Delivery mode |
|---|---|
| `reckoner/` | chooser — visitor picks cloud or on-premise |
| `reckoner/cloud/` | cloud (DigitalOcean), prices shown |
| `reckoner/on-prem/` | on-premise, hardware spec only, no prices |

All three are the *same* compiled app; the delivery mode is read from the URL
path (`/cloud`, `/on-prem`), and `?delivery=cloud|on-prem` overrides it. The
three copies of each asset must stay byte-identical.

---

## 1. There is no source code in this repo

`reckoner/` holds the **built output** of a Vite/React app. The source tree
lives elsewhere. Everything this repo has changed about the reckoner's
behaviour is a surgical string edit against minified JavaScript, recorded in
[`tools/reckoner-patches.js`](tools/reckoner-patches.js).

**When someone rebuilds from the real source and drops in a new bundle, every
one of those edits is wiped.** This has already happened once, in `b3b829f` —
the peak-concurrent input work silently reverted and had to be recovered from
git history.

### Recovery procedure after any rebuild

```bash
# 1. take the new bundle exactly as the build produced it
# 2. re-apply this repo's edits
node reckoner/tools/reckoner-patches.js            # check: what is present / missing?
node reckoner/tools/reckoner-patches.js --apply    # re-apply everything missing

# 3. re-stamp the service worker (see section 2 — not optional)
node reckoner/tools/sw-revisions.js --apply

# 4. check in a browser at all three paths
python3 -m http.server 4599
```

Each edit asserts its anchor matches **exactly once**. If an anchor stops
matching, the upstream code moved: the script refuses to write and names the
patch, rather than guessing. Re-derive that one by hand and update the file.

Both scripts are plain Node with no dependencies, consistent with this repo's
no-build-step rule. They are developer tools — nothing in the shipped site
loads them.

> The real fix is to move these changes into the upstream source tree and
> delete `tools/reckoner-patches.js`. Until that happens, this file is the only
> record of what the built output contains that a rebuild would not.

---

## 2. Always re-stamp the service worker

Each deployment ships a Workbox service worker precaching ~21 files. Every
entry carries a `revision` hash, and **a returning visitor only re-downloads a
file when that hash changes** — the file changing is not enough, because the
filename stays the same.

Edit a bundle and leave `sw.js` alone and your change reaches nobody who has
visited before. They have to clear site data by hand.

```bash
node reckoner/tools/sw-revisions.js            # exits 1 if anything is stale
node reckoner/tools/sw-revisions.js --apply    # fix it
```

Run it after **any** edit under `reckoner/`, before committing. `origin/main`
at `b3b829f` shipped with 5–6 stale revisions per deployment, `index.html`
among them, so those changes never reached returning visitors.

---

## 3. What the tool quotes

Prices are DigitalOcean list, region `blr1`, monthly USD, verified 18 Sep 2026.
They live in the app bundle; the entries added by this repo are in
`tools/reckoner-patches.js`.

### Kubernetes worker nodes

Basic Regular and Premium Intel were already in the tool. CPU-Optimized was
added here, because Basic Regular tops out at 8 vCPU / 16 GB and the tool had
nothing to offer above roughly 400 concurrent users.

| Family | vCPU / RAM | Disk | Transfer | $/month |
|---|---|---|---|---|
| Basic Regular | 1 / 2 GB | 50 GB | 2 TB | 12 |
| Basic Regular | 2 / 2 GB | 60 GB | 3 TB | 18 |
| Basic Regular | 2 / 4 GB | 80 GB | 4 TB | 24 |
| Basic Regular | 4 / 8 GB | 160 GB | 5 TB | 48 |
| Basic Regular | 8 / 16 GB | 320 GB | 6 TB | 96 |
| Premium Intel | 1 / 2 GB | 50 GB | 2 TB | 16 |
| Premium Intel | 2 / 2 GB | 90 GB | 3 TB | 24 |
| Premium Intel | 2 / 4 GB | 120 GB | 4 TB | 32 |
| Premium Intel | 2 / 8 GB | 160 GB | 5 TB | 48 |
| Premium Intel | 4 / 8 GB | 240 GB | 6 TB | 64 |
| Premium Intel | 4 / 16 GB | 320 GB | 8 TB | 96 |
| Premium Intel | 8 / 16 GB | 480 GB | 9 TB | 128 |
| Premium Intel | 8 / 32 GB | 640 GB | 10 TB | 192 |
| **CPU-Optimized** | 2 / 4 GB | 25 GB | 4 TB | **55** |
| **CPU-Optimized** | 4 / 8 GB | 50 GB | 5 TB | **109** |
| **CPU-Optimized** | 8 / 16 GB | 100 GB | 6 TB | **218** |
| **CPU-Optimized** | 16 / 32 GB | 200 GB | 7 TB | **437** |
| **CPU-Optimized** | 32 / 64 GB | 400 GB | 9 TB | **874** |
| **CPU-Optimized** | 48 / 96 GB | 600 GB | 11 TB | **1,310** |

Which family gets used where:

- **Kubernetes** — Basic Regular, then CPU-Optimized once Basic Regular can no
  longer fit the load in a sensible node count.
- **Application HA (Multi-Node) / single node** — Premium Intel.

### Managed MySQL

The connection limits for the 4 / 8 / 16 GB plans were **wrong** in the tool
(225 / 525 / 1050). DigitalOcean's actual rule is 75 connections per GiB of
usable memory below 4 GiB and 100 per GiB at or above it, where usable memory
is RAM minus about 350 MB. The corrected values are below.

The five high-capacity plans are not on DigitalOcean's public pricing page or
in its limits documentation — they were read from the Managed MySQL console.

| vCPU / RAM | Included storage | Connection limit | $/month | Source |
|---|---|---|---|---|
| 1 / 1 GB | 10 GiB | 75 | 15.15 | docs + pricing page |
| 1 / 2 GB | 30 GiB | 150 | 30.45 | docs + pricing page |
| 2 / 4 GB | 60 GiB | 400 | 60.90 | docs + pricing page |
| 4 / 8 GB | 140 GiB | 800 | 122.10 | docs + pricing page |
| 6 / 16 GB | 290 GiB | 1,600 | 244.35 | docs + pricing page |
| 4 / 32 GB | 600 GiB | 2,175 | 431 | console |
| 8 / 64 GB | 1,200 GiB | 4,425 | 868 | console |
| 16 / 128 GB | 2,400 GiB | 9,601 | 1,734 | console |
| 24 / 192 GB | 3,600 GiB | 14,401 | 2,602 | console |
| 32 / 256 GB | 4,800 GiB | 19,201 | 3,458 | console |

Storage beyond a plan's included minimum is billed separately:
**$0.215/GiB/month** (Standard Edition), **$0.115/GiB/month** (Advanced).
The tool carries this rate but does not yet add it to a quote — quotes assume
the included storage is enough.

### Other line items

| Item | $/month |
|---|---|
| Regional load balancer | 12 per node |
| Reserved IP | 0 while assigned, 5 unassigned |
| Container Registry (Professional) | 20 |
| SMTP email server | 2.50 per prepaid credit |
| Cloudflare WAF Pro | 25 |

---

## 4. How the configuration is chosen

### Below the tested ceiling (≤ 100 concurrent users)

The quote is a **measured** configuration, taken straight from the load-test
matrix. Nothing is calculated. These are the only numbers that are evidence.

### Above it (> 100)

Nothing above 100 has ever been load-tested, so the configuration is
**extrapolated** by a linear model (`SIZEX` in the app bundle) and labelled
"linear sizing estimate" wherever it appears.

**Per concurrent user**, from the validated 100-user benchmark of one
4 vCPU / 8 GB node per 100 users:

| Product | vCPU | RAM |
|---|---|---|
| Access Manager | 0.04 | 0.08 GB |
| IGA | 0.02 | 0.04 GB |
| AM + IGA (shared cluster) | 0.08 | 0.16 GB |

Then:

1. **Demand** = peak × per-user, **× 1.25** for Kubernetes/OS overhead, HA
   headroom and burst.
2. **Floor** — never below the measured node (4 vCPU / 8 GB for AM, i.e. 100
   users' worth), and never fewer than 2 nodes. Without this the model would
   propose *less* hardware just above 100 than the configuration actually
   proven at 100.
3. **Node choice** — work out the smallest node count any machine can achieve,
   allow up to **1.5×** that, and within that band take the cheapest. This is
   what makes the machine grow before the node count does.
4. **Replicas** = `ceil(peak / 100) × 3`.
5. **Connections** = `12.5 × replicas + 15`, and the database is the cheapest
   plan whose connection limit covers it, floored at the measured plan.

Step 3 exists because **adding nodes did not add throughput** in testing — the
matrix has 4 nodes / 3 replicas reaching 50 VU where 3 nodes / 3 replicas
reached 80. Capacity tracked replica count, not node count. So the model buys a
bigger machine rather than more machines.

### Worked example — 8,140 concurrent, Access Manager, Kubernetes

```
demand    8140 × 0.04 × 1.25 = 407 vCPU      8140 × 0.08 × 1.25 = 814 GB
nodes     cheapest option is 4 vCPU/8 GB × 102 = $11,118
          but the fewest nodes any machine needs is 9 (48/96), so the band
          is 9…13 nodes, and within it the cheapest is 32/64 × 13 = $11,362
replicas  ceil(8140/100) × 3 = 246
conns     12.5 × 246 + 15 = 3,090  ->  8 vCPU / 64 GB (4,425 limit), $868
```

| | |
|---|---|
| Cluster | 13 × CPU-Optimized 32 vCPU / 64 GB — $11,362 |
| Database | Managed MySQL 8 vCPU / 64 GB / 1,200 GiB — $868 |
| Load balancer + reserved IP | $12 |
| Container Registry | $20 |
| SMTP | $5 |
| **Total** | **$12,267 / month** |

### The curve (Access Manager, Kubernetes)

| Peak | Nodes | Machine | Workers | Replicas | Database |
|---|---|---|---|---|---|
| 100 | 2 | Basic Regular 4 / 8 | $96 | 3 | $60.90 |
| 250 | 2 | Basic Regular 8 / 16 | $192 | 9 | $60.90 |
| 500 | 2 | CPU-Optimized 16 / 32 | $874 | 15 | $60.90 |
| 1,000 | 2 | CPU-Optimized 32 / 64 | $1,748 | 30 | $60.90 |
| 2,000 | 4 | CPU-Optimized 32 / 64 | $3,496 | 60 | $122.10 |
| 5,000 | 8 | CPU-Optimized 32 / 64 | $6,992 | 150 | $431 |
| 8,140 | 13 | CPU-Optimized 32 / 64 | $11,362 | 246 | $868 |

Only the first row is measured.

---

## 5. The evidence, and what it does not say

The single validated Kubernetes data point:

- 100 concurrent login VUs
- 2 workers, Basic Regular 4 vCPU / 8 GB, 3 application replicas
- Managed MySQL 2 vCPU / 4 GB / 60 GiB
- login-only p95 **13.2 s**, onboard+login p95 **30 s**, 100% success, high confidence

Swept levels are **25, 50, 80 and 100 only**.

Things worth knowing before you trust a number:

- **p95 values are burst drain times, not latencies.** The k6 scripts use
  `per-vu-iterations` with `vus=N, iterations=1` — every virtual user logs in
  at the same instant and the server serialises. "p95 30 s" means the burst
  took 30 s to drain, not that a login takes 30 s.
- **No database metrics were captured** in any run — no CPU, memory,
  connections in use, queries/sec or lock waits. The connection formula in
  section 4 is reasoned, not measured.
- **Nothing above 100 VU has ever been run.** Every figure above that line is
  arithmetic.

### Open questions

- Is the per-user footprint 0.04 vCPU right? It comes from treating the
  benchmark as one 4 vCPU / 8 GB node per 100 users, though the test ran two.
- What are the actual AM pod CPU/memory requests?
- What connection pool size does each replica really use? 12.5 is an assumption.
- Did the Kubernetes benchmark run on Basic Regular or Premium Intel?

---

## 6. On-premise sizing

On-premise quotes **hardware only, never a price**, so it is not restricted to
a provider's catalogue — the model emits the required spec directly rather than
picking a machine off a list. Same per-user footprint and same +25% allowance
as the cloud path (section 4), applied to the `swarm-ha` topology.

1. **Node count** starts at the **3 managers** the on-prem topology was tested
   with, and only grows once a single node would have to exceed a practical
   2-socket server — capped at **64 vCPU / 128 GB**.
2. **Per-node spec** = demand ÷ nodes, rounded up to a realistic step
   (vCPU 2/4/6/8/12/16/20/24/32/40/48/56/64, RAM 4/8/12/16/24/…/512 GB),
   floored at the measured node (4 vCPU / 8 GB for AM).
3. **Database node** is sized from connection demand: RAM ≈ connections ÷ 100
   plus 1 GB, minimum 4 GB; vCPU ≈ RAM ÷ 8, minimum 2.

| Peak | Application nodes | MySQL + Redis |
|---|---|---|
| 100 *(measured)* | 3 × 2 vCPU / 4 GB | 2 vCPU / 2 GB |
| 250 | 3 × 6 vCPU / 12 GB | 2 vCPU / 4 GB |
| 1,000 | 3 × 20 vCPU / 40 GB | 2 vCPU / 8 GB |
| 2,000 | 3 × 40 vCPU / 80 GB | 2 vCPU / 12 GB |
| 5,000 | 4 × 64 vCPU / 128 GB | 4 vCPU / 24 GB |
| 8,140 | 7 × 64 vCPU / 128 GB | 4 vCPU / 32 GB |
| 18,000 | 15 × 64 vCPU / 128 GB | 12 vCPU / 80 GB |

Synthetic specs carry no vendor name, no transfer allowance and
`monthlyUsd: 0` — on-premise output has no cost column, so nothing is invented.

### Still open: cloud "Application HA (Multi-Node)"

The model runs on **cloud + Kubernetes** and **on-prem + swarm-ha**. The *cloud*
multi-node topology still picks from the Premium Intel list, which tops out at
8 vCPU / 32 GB, so in the topology comparison it claims ~$812/month carries
8,140 concurrent users where Kubernetes is sized at $12,267. Fixing it means
extending the Premium Intel catalogue with larger machines and real prices,
which moves figures customers may already have been quoted — decide before
implementing.

---

## 7. Checklist before committing

```bash
node reckoner/tools/reckoner-patches.js        # all patches still present?
node reckoner/tools/sw-revisions.js            # all revisions current?
node --check reckoner/cloud/assets/index-noL58BdD.js   # bundle still parses
```

- The three copies of every asset must be byte-identical.
- Load `/reckoner/`, `/reckoner/cloud/` and `/reckoner/on-prem/` and check the
  console is clean.
- Export an Excel report and confirm the "Recommended configuration" matches
  the priced line items — they are produced by different code paths and have
  drifted apart before.
