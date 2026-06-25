# Ingestion Situational Awareness — Validation Checklist

Use during **MEASURE** and **CONTROL**. Mark: ✅ pass · ⚠️ partial · ❌ fail · ➖ N/A

## 1. Product boundary

- [ ] README states what the system **is** and **is not**
- [ ] UI disclaimer visible on dashboard (not buried only in README)
- [ ] No UI label implies "confirmed" for unverified lane
- [ ] Briefing/synthesis scoped as awareness, not authoritative decision support
- [ ] Out-of-scope features not implied (forecasting, line-list surveillance, etc.)

## 2. Dual-lane architecture

- [ ] Authoritative lane has dedicated code path (parser or primary-tier filter)
- [ ] Unverified lane uses separate API fields or UI panels
- [ ] Cumulative totals document dedup rules (per country, per source, etc.)
- [ ] Geography "import watch" ≠ epidemiological "imported cases" (if both exist)
- [ ] Map points distinguish primary vs media counts (if shown)

## 3. Ingestion pipeline

- [ ] Sources seeded or documented; inactive sources handled
- [ ] `fetch-all` / equivalent returns per-source status (ok/error)
- [ ] Duplicate detection (URL + title fingerprint or equivalent)
- [ ] Relevance filter applied before persist (not only at display)
- [ ] HTML/summary cleaned consistently on ingest and reprocess
- [ ] Failed source fetch does not block other sources
- [ ] `last_fetched_at` updated on success

## 4. Retention & time windows

- [ ] Minimum date (or window) configured in one place
- [ ] Ingest skips out-of-window items
- [ ] Queries apply same window (stats, tower, feed, search)
- [ ] Purge/reprocess removes stale rows from DB
- [ ] User date filters compose with retention (not bypass it)

## 5. API consistency

- [ ] `/tower` (or main dashboard API) returns 200 under prod load
- [ ] `stats.total_articles` aligns with filtered corpus definition
- [ ] Headline metrics derivable from same filter set as panels
- [ ] Region drilldown counts match map point for same location
- [ ] Error responses on core paths are JSON, not opaque 500 HTML

## 6. Classification & trust

- [ ] Source tier rules documented (primary / official / aggregator)
- [ ] Severity capped or adjusted by tier (if claimed in UI)
- [ ] Relevance trace or equivalent explainability for filtered items
- [ ] Negative filters / false-positive guards documented
- [ ] Category taxonomy consistent ingest → API → UI chips

## 7. Frontend operator UX

- [ ] Official vs media visually distinct (color, icon, copy)
- [ ] Empty states for zero sources, zero signals, parser failure
- [ ] Ingest/refresh action reachable; loading/error feedback
- [ ] Date filter affects all relevant sections consistently
- [ ] External links open primary source (official page or article URL)
- [ ] Mobile/layout does not hide trust labels on key cards

## 8. Deployment & persistence

- [ ] Production URL documented
- [ ] DB persistence strategy documented (ephemeral vs managed)
- [ ] Env vars for secrets listed in `.env.example`
- [ ] CORS includes production frontend origin
- [ ] API base URL correct in prod frontend build
- [ ] Cron/scheduler path authenticated if exposed publicly
- [ ] Cold-start behavior defined (auto-seed, auto-ingest, or manual)

## 9. Security & reliability

- [ ] No secrets in repo
- [ ] Cron/admin endpoints require secret or platform auth
- [ ] LLM keys optional; mock mode works without keys
- [ ] Timeouts on external fetches
- [ ] Function/serverless duration sufficient for `fetch-all`

## 10. Observability

- [ ] Ingest logs or API message reports new/purged/reprocessed counts
- [ ] Official parser failures visible (panel error row or API status)
- [ ] Deploy smoke commands documented

## Sample audit commands

```bash
BASE="${API_BASE:-http://localhost:8000}"

curl -sf "$BASE/api/tower" > /tmp/tower.json
curl -sf "$BASE/api/sources" > /tmp/sources.json
curl -sf -X POST "$BASE/api/sources/fetch-all" > /tmp/fetch.json
curl -sf "$BASE/api/feed?limit=20" > /tmp/feed.json

python3 <<'PY'
import json
from pathlib import Path

tower = json.loads(Path("/tmp/tower.json").read_text())
feed = json.loads(Path("/tmp/feed.json").read_text())
stats_total = tower.get("stats", {}).get("total_articles")
matched = tower.get("headline", {}).get("matched_signals")
print("stats.total_articles:", stats_total)
print("headline.matched_signals:", matched)
print("feed count:", len(feed) if isinstance(feed, list) else "?")
if stats_total != matched:
    print("⚠️  COUNT MISMATCH")
PY
```

Adjust endpoint paths to match the project.
