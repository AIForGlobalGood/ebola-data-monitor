# Six Sigma Validation Report — Ebola Situation View

**Archetype:** Ingestion situational awareness  
**Date:** 2026-06-25  
**Validator:** Cursor agent (six-sigma-ingestion-situational-awareness)  
**Environments:** local · production  
**Verdict:** ☑ Conditional pass · ☐ Pass · ☐ Fail

---

## Executive summary

Production is **operational and lane-separated**: `/api/tower` returns 200, retention (January 2026+) is enforced, and `stats.total_articles` matches `headline.matched_signals` (232). No 🔴 critical defects were found.

**Two 🟠 major gaps block a full pass:** (1) **no Vercel environment variables** — Turso and `CRON_SECRET` are unset, so production uses ephemeral SQLite and the cron ingest route is unauthenticated when no secret is configured; (2) **deploy parity** — local corpus (437 articles) is ~88% larger than production (232) because databases are independent and retention/purge history differs.

Operator-facing trust boundaries (official vs import-watch media) are implemented in the consolidated `SituationOverviewPanel` with tabbed lanes and disclaimers. ReliefWeb feeds ingest zero EVD articles despite active sources — a source-health gap worth monitoring.

**Recommendation:** Configure Turso + `CRON_SECRET`, re-ingest, then re-run this validation for **Pass**.

---

## DEFINE — CTQ map

| CTQ | Requirement | Evidence source |
|-----|-------------|-----------------|
| Lane separation | Official counts ≠ media signals in UI and API | `SituationOverviewPanel` tabs; verified alerts all `primary`; import watch `media_signals` only |
| Freshness | Last ingest visible and recent | `headline.last_ingest_at`: 2026-06-25T20:52:17Z (prod) |
| Count consistency | Header/panel/API totals agree | Prod: `stats.total_articles` 232 = `matched_signals` 232 ✅ |
| Retention policy | Pre–Jan 2026 excluded ingest + query | `MIN_PUBLISHED_DATE=2026-01-01`; feed sample n=25: 0 pre-cutoff |
| Source failure visibility | Broken/empty feeds surfaced | ReliefWeb 0 articles (visible in `/api/sources`); official parsers all `ok` |
| Deploy parity | Prod ≈ local after same ingest | Local 437 vs prod 232 ❌ |
| Disclaimer honesty | UI matches system capability | Tower disclaimer mentions Jan 2026 limit + lane separation |

**Scope boundary (from docs):**

- **In scope:** RSS/news situational signals; parsed official counters (selected MoH/WHO/ECDC pages); geography/trust classification; briefings as awareness synthesis.
- **Out of scope:** National line-list surveillance; lab workflows; forecasting; treating media as confirmed counts.

---

## MEASURE — baseline

### Environment

| Surface | Status | Notes |
|---------|--------|-------|
| Local backend | ✅ 200 | `http://localhost:8000/api/tower` · 36ms |
| Local frontend | ✅ 200 | `http://localhost:5175/` |
| Production | ✅ 200 | `https://ebola-crisis.vercel.app/api/tower` · 420ms |
| Database | ⚠️ Ephemeral prod | **No production env vars on Vercel**; Turso not configured; `/tmp` SQLite on serverless |

### Pipeline run (production)

| Step | Command | HTTP | Duration | Notes |
|------|---------|------|----------|-------|
| tower | `GET /api/tower` | 200 | 0.42s | 232 matched articles |
| feed | `GET /api/feed?limit=25` | 200 | — | 25 items, 0 pre-2026 |
| official | `GET /api/official/situation` | 200 | — | 4 ok rows, 0 errors |
| sources | `GET /api/sources` | 200 | — | 11 active sources |
| fetch-all | (prior run 2026-06-25) | 200 | ~13s | 0 new; all sources ok |
| reprocess | (prior run) | 200 | — | 233 updated, 0 purged |
| cron/ingest | `GET /api/cron/ingest` | ⏱ timeout | >5s | Runs full ingest; no quick auth probe without secret |

### Metric cross-check (production)

| Metric | Location A | Location B | Match? |
|--------|------------|------------|--------|
| Total indexed | `stats.total_articles` **232** | `headline.matched_signals` **232** | ✅ |
| Source sum | Σ `article_count` **233** | `stats.total_articles` **232** | ⚠️ off by 1 |
| Local vs prod | Local **437** | Prod **232** | ❌ parity |
| Import signals | `headline.import_signals` **24** | `geography.import_signals` (via tower) | ✅ consistent |
| Official cumulative | UI dedup **916** confirmed | DRC 896 + Uganda 20 (best per country) | ✅ by design |

### Retention sample (n=25 feed)

| Result | Count |
|--------|-------|
| Items before 2026-01-01 | **0** |
| Missing `published_at` | **0** |

### Lane separation sample

| Item | Lane shown | Actual tier/parser | Correct? |
|------|------------|-------------------|----------|
| WHO News — Bundibugyo epidemic | Verified alerts | `primary` | ✅ |
| Google News — outbreak headline | Media signals | `aggregator` | ✅ |
| France import-watch card | Import watch (media) | 13 media, 0 primary | ✅ |
| Uganda MoH 20 confirmed | Official tab | `national_ministry` parser | ✅ |
| Uganda WHO DON 19 confirmed | Official tab | `who_don` parser | ✅ |

### Trust spot-check (n=16)

- All samples: `relevance_score` ≥ 0.25 ✅  
- All samples: `relevance_trace` present ✅  
- Verified alert list: 7/7 `primary` tier ✅  

---

## ANALYZE — defect register

| ID | Severity | CTQ | Symptom | Root cause | Evidence |
|----|----------|-----|---------|------------|----------|
| D1 | 🟠 Major | Deploy parity | Local 437 vs prod 232 articles | Separate DBs; prod ephemeral `/tmp`; no Turso sync; different purge history | `curl` tower local vs prod |
| D2 | 🟠 Major | Source failure / security | Cron ingest callable without auth; no secrets on Vercel | `CRON_SECRET` unset; `cron.py` skips auth when secret empty | `vercel env ls production` → none |
| D3 | 🟡 Minor | Source failure visibility | ReliefWeb DRC + Ebola feeds: 0 articles | Feed empty, relevance filter, or RSS format — needs investigation | `/api/sources` article_count=0 |
| D4 | 🟡 Minor | Count consistency | Source `article_count` sum 233 ≠ total 232 | Retention predicate on join vs outer count edge case | sources API vs tower |
| D5 | 🟡 Minor | Lane separation / UX | Official tab shows 3 Uganda rows before dedup | Multiple parsers per country by design; collapsed cumulative is deduped | official/situation JSON |
| D6 | 🟢 Observation | Freshness | Cron schedule daily only | `vercel.json` `0 12 * * *` | Documented Pro plan note in README |
| D7 | 🟢 Observation | Trust | CDC HAN + some Google News feeds at 0 articles | Low EVD relevance or empty fetch window | sources list |

### 5 Whys — D1 (deploy parity)

1. **Why** do local and prod article counts differ? → Different database contents.  
2. **Why** different contents? → Prod resets/loses `/tmp` SQLite on cold start; local persists `./data/`.  
3. **Why** not synced? → Turso env vars not added to Vercel project.  
4. **Why** not added? → Setup script requires manual Turso login + `vercel env add`.  
5. **Why** does that matter? → Operators comparing local vs live see false regressions.

### 5 Whys — D2 (cron auth)

1. **Why** is cron a risk? → Unauthenticated ingest triggers expensive fetches.  
2. **Why** unauthenticated? → No `CRON_SECRET` in production env.  
3. **Why** does code allow it? → Auth enforced only `if secret` is set.  
4. **Why** not set by default? → Secret must be operator-provided.  
5. **Why** major not critical? → Abuse causes cost/load, not lane corruption — but must fix before scale.

---

## IMPROVE — action plan

| ID | Action | Owner | Verification | Status |
|----|--------|-------|--------------|--------|
| D1 | Run `./scripts/setup_turso.sh`; add `TURSO_*` to Vercel; redeploy; `POST /api/sources/fetch-all` | Operator | Prod article count stable across cold starts | Open (health guard added) |
| D2 | `npx vercel env add CRON_SECRET production`; redeploy | Operator | `GET /api/cron/ingest` without Bearer → **503/401** | Code fixed; env open |
| D3 | Log ReliefWeb fetch stats; migrate to API v2 | Dev | ReliefWeb fetch shows message or articles | **Fixed** |
| D4 | Align `list_sources` count query with tower filters | Dev | Σ source counts = `stats.total_articles` | **Fixed** |
| D5 | Group official cards by country in expanded view | Dev | One card per country default | **Fixed** |

---

## CONTROL — ongoing gates

| Gate | Frequency | Pass criteria | Automated? |
|------|-----------|---------------|------------|
| Smoke | post-deploy | `/api/tower` 200; site 200 | Manual / CI curl |
| Ingest | after deploy + daily cron | `fetch-all` 200; `last_ingest_at` < 48h | Cron + manual |
| Retention | weekly | `reprocess` `purged` ≥ 0; feed sample has 0 pre-cutoff | Script in checklist.md |
| Lane audit | monthly | 5-item sample: official=parser/primary; import=aggregator | Manual |
| Parser health | when official empty | Error rows in official API | `/api/official/situation` |
| Env audit | quarterly | Turso + CRON_SECRET present on Vercel | `vercel env ls production` |

---

## Checklist summary

Approximate score from [checklist.md](../.cursor/skills/six-sigma-ingestion-situational-awareness/checklist.md): **42 / 50 ✅** · **5 ⚠️** · **3 ❌**

| Section | Result |
|---------|--------|
| 1. Product boundary | ✅ Pass |
| 2. Dual-lane architecture | ✅ Pass (D5 minor UX) |
| 3. Ingestion pipeline | ⚠️ ReliefWeb zero yield |
| 4. Retention & time windows | ✅ Pass |
| 5. API consistency | ⚠️ D4 off-by-one |
| 6. Classification & trust | ✅ Pass |
| 7. Frontend operator UX | ✅ Pass |
| 8. Deployment & persistence | ❌ Turso not on Vercel |
| 9. Security & reliability | ❌ CRON_SECRET missing |
| 10. Observability | ⚠️ Partial |

---

## Appendix

**Files reviewed:** `readme.md`, `docs/architecture.md`, `backend/app/services/ingestion.py`, `date_filters.py`, `tower.py`, `dashboard.py`, `frontend/src/components/SituationOverviewPanel.tsx`, `vercel.json`, `backend/app/api/cron.py`

**Commands log:**
```bash
curl -sf https://ebola-crisis.vercel.app/api/tower -o /tmp/prod_tower.json
curl -sf https://ebola-crisis.vercel.app/api/official/situation -o /tmp/prod_official.json
curl -sf https://ebola-crisis.vercel.app/api/feed?limit=25 -o /tmp/prod_feed.json
curl -sf https://ebola-crisis.vercel.app/api/sources -o /tmp/prod_sources.json
curl -sf http://localhost:8000/api/tower -o /tmp/local_tower.json
npx vercel env ls production
```

**Next validation:** Re-run after Turso + `CRON_SECRET` are configured; target verdict **Pass**.
