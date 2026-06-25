---
name: six-sigma-ingestion-situational-awareness
description: >-
  Six Sigma DMAIC validation for ingestion-based situational awareness dashboards
  (dual trust lanes, RSS/API feeds, control-tower UI, scheduled ingest). Use when
  validating implementation quality, release readiness, data integrity, or running
  a structured audit of monitor/awareness platforms — not domain-specific epidemiology.
---

# Six Sigma — Ingestion Situational Awareness

Validate projects that **ingest external signals**, **classify by trust/relevance**, and **present a control-tower dashboard** without claiming to be a system of record.

**Archetype signals** (any subset triggers this skill):
- RSS/API/news ingestion into a database
- Separate **authoritative** vs **unverified** data lanes
- Relevance scoring, geography/tags, severity or triage labels
- SPA dashboard + REST/JSON backend
- Scheduled fetch (cron/worker) and optional LLM synthesis

**Not in scope:** domain models (disease names, outbreak geography). Focus on **pipeline integrity, lane separation, metric consistency, and operator clarity**.

## When to run

Run full DMAIC when the user asks to:
- validate implementation / release readiness / production parity
- audit data quality or trust-boundary compliance
- investigate count mismatches, stale data, or lane confusion
- produce a structured quality report before deploy

**Quick mode:** If time-boxed, run **Measure + Analyze** only and output a short defect list.

## DMAIC workflow

Copy progress tracker:

```
Six Sigma validation — [project name]
- [ ] DEFINE — CTQs, boundaries, CTQ map
- [ ] MEASURE — baseline metrics & evidence
- [ ] ANALYZE — defects, root causes, severity
- [ ] IMPROVE — fix plan & verification
- [ ] CONTROL — gates & ongoing checks
- [ ] Report delivered
```

### 1. DEFINE

**Discover the system** (read first, don't assume):
- `README`, `docs/architecture.md`, or equivalent
- Ingestion service, API routers, dashboard entry component
- Config/env for retention, cron, database, CORS

**Document CTQs** (Critical to Quality — must be true for operators):

| CTQ | Operator question |
|-----|-------------------|
| Lane separation | Can authoritative counts be mistaken for media mentions? |
| Freshness | Is displayed data current within stated SLA? |
| Count consistency | Do header, panel, and API totals agree? |
| Retention policy | Is out-of-window data excluded everywhere? |
| Source failure visibility | Are broken feeds surfaced, not silent? |
| Deploy parity | Does production behave like local after ingest? |
| Disclaimer honesty | Does UI match what the system actually does? |

**Scope boundary:** List explicit **in scope** vs **out of scope** claims from docs. Flag any UI copy that overclaims.

### 2. MEASURE

Collect **evidence**, not opinions. Run commands; record outputs.

#### A. Environment matrix

| Surface | URL/command | Notes |
|---------|-------------|-------|
| Local backend | `curl -s -o /dev/null -w '%{http_code}' http://localhost:8000/docs` | |
| Local frontend | dev server port | |
| Production | deployed URL | |
| DB persistence | ephemeral vs managed | Turso/S3/RDS vs `/tmp` |

#### B. Pipeline health

```bash
# Replace BASE with backend root URL
curl -s "$BASE/api/sources" | head -c 2000          # sources registered
curl -s -X POST "$BASE/api/sources/fetch-all"       # ingest (may take 60s+)
curl -s -X POST "$BASE/api/sources/reprocess"       # re-enrich + purge if supported
curl -s "$BASE/api/tower" | python3 -m json.tool | head -80   # primary dashboard payload
curl -s "$BASE/api/feed?limit=5"                    # feed endpoint
```

Record: HTTP status, latency, `total_articles` / matched counts, last ingest timestamp if exposed.

#### C. Metric cross-check (defect if mismatch)

Compare across responses **for the same date filter**:
- Dashboard header / headline strip totals
- Situation panel aggregates
- API `stats.total_articles` vs filtered corpus count
- Source list `article_count` sum vs total (approximate; explain joins)

#### D. Retention & date policy

If `MIN_PUBLISHED_DATE` or equivalent exists:
- Confirm config default and env override path
- `reprocess` or purge endpoint should report `purged` count
- Spot-check: no feed item with `published_at` before cutoff in `/api/feed`

#### E. Lane separation sample (n ≥ 5)

For each lane (authoritative vs unverified):
- Pick 2–3 displayed items; trace to source URL and `source_tier` / parser origin
- Confirm authoritative lane items link to authority pages or primary-tier feeds
- Confirm media lane items carry unverified labeling in UI

#### F. Trust & classification spot-check

Sample 10 indexed items:
- Relevance score present and above documented threshold?
- Geography/tags explainable (not empty for geo-tagged UI)?
- Severity/tier consistent with source tier caps documented in code?

Log measurements in the report template ([report-template.md](report-template.md)).

### 3. ANALYZE

Classify each finding with **Six Sigma severity**:

| Level | Label | Criteria |
|-------|-------|----------|
| 🔴 | Critical | Wrong authoritative counts; lane collapse; silent data loss; prod 500 on core paths |
| 🟠 | Major | Stale data undetected; retention bypass; count mismatch >5%; broken cron |
| 🟡 | Minor | Copy ambiguity; missing empty states; slow ingest; local/prod drift explainable but undocumented |
| 🟢 | Observation | Style, nice-to-have monitoring |

**Common failure modes** (check explicitly):

1. **Lane leakage** — media headlines in official totals or vice versa
2. **Double counting** — same event counted in cumulative + regional cards
3. **Ephemeral DB** — production resets corpus; users see different counts than local
4. **Parser fragility** — official HTML layout change → empty panel without error row
5. **Filter drift** — retention applied at ingest but not in stats queries
6. **Import geography confusion** — "imported cases" (into outbreak zone) vs "import watch" (global media)
7. **Cron/auth gap** — scheduled ingest unauthenticated or not running
8. **CORS/API base** — frontend points at wrong backend in prod build

For each defect: **symptom → root cause hypothesis → affected CTQ → evidence**.

Use **5 Whys** only for 🔴/🟠 items.

### 4. IMPROVE

Prioritize fixes:
1. All 🔴 before release
2. 🟠 that affect CTQs 1–4
3. Document 🟡 with operator workarounds

Each fix must include **verification step** (command or UI check).

Do not expand scope into unrelated refactors.

### 5. CONTROL

Define **ongoing gates** the project should keep:

| Gate | When | Pass criteria |
|------|------|---------------|
| Smoke | post-deploy | `/api/tower` 200; frontend loads |
| Ingest | after deploy or daily | `fetch-all` 200; new or deduped counts stable |
| Retention | weekly | `purged >= 0` on reprocess; no pre-cutoff in feed sample |
| Lane audit | monthly | 5-item sample passes separation |
| Parser health | when official panel empty | error row or logged fetch failure |

Add or update project docs section **Quality control** if missing.

## Deliverable

Produce a report using [report-template.md](report-template.md).

Save to `experiments/six-sigma-validation-YYYY-MM-DD.md` if the project uses `experiments/`, else `docs/quality/six-sigma-validation-YYYY-MM-DD.md`.

**Executive summary rules:**
- State pass / conditional pass / fail
- Lead with 🔴 count, then operator impact
- Separate **data defects** from **UX clarity** issues

## Project discovery checklist

Use [checklist.md](checklist.md) for the full per-layer audit. Adapt paths to the repo:

| Layer | Typical locations |
|-------|-------------------|
| Ingestion | `**/ingestion*.py`, `**/fetch*.ts`, `**/cron*` |
| Retention/filters | `**/date_filter*`, config settings |
| Official/authoritative parsers | `**/official*`, `**/authority*` |
| Dashboard API | `**/tower*`, `**/dashboard*` |
| UI shell | `*ControlTower*`, `*Situation*`, `*Headline*` |
| Deploy | `vercel.json`, `Dockerfile`, `.github/workflows/*` |

## Series note

This skill is **`six-sigma-ingestion-situational-awareness`** — part of a Six Sigma skill family keyed by **project archetype**. Sibling skills will cover other archetypes (e.g. calibration pipelines, simulation apps, CRUD SaaS). Do not fold unrelated archetypes into this checklist.

## Additional resources

- Full audit checklist: [checklist.md](checklist.md)
- Report template: [report-template.md](report-template.md)
