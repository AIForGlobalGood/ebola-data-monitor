# Ebola Crisis Hub

**Ebola virus disease (EVD) Control Tower** — monitors the DRC/Uganda outbreak corridor and related regional Ebola signals. It combines parsed official situation counts from selected public-health authority pages with relevance-filtered public RSS/news signals from WHO, ReliefWeb, CDC HAN, and Google News.

Built for foundation program teams who need EVD situational awareness — confirmed official counts, ring vaccination, contact tracing, health-zone geography, cross-border signals, source trust, and source-aware briefings — without treating every media headline as a confirmed case count.

Live deployment: https://ebola-crisis.vercel.app

> [!WARNING]
> Ebola Crisis Hub is a public-information situational awareness tool, not an official epidemiological surveillance system. Media/RSS signals, automated severity labels, map points, and generated briefings should not be treated as confirmed case counts or official risk assessments. Always verify confirmed cases, deaths, and operational decisions against linked Ministry of Health, WHO, ECDC, or other official situation reports.

## What This App Is / Is Not

The app intentionally keeps two data lanes separate:

- **Official situation counts**: selected official pages such as Uganda Ministry of Health EVD Daily, WHO Disease Outbreak News, and ECDC are parsed for confirmed cases, deaths, recoveries, admissions, and related counters when available.
- **Public information signals**: RSS/news entries are deduplicated, scored for EVD relevance, classified by category/severity/geography/source tier, and displayed as situational awareness signals.

It is **not** an epidemiological surveillance system, line-list database, forecasting tool, or official situation report. Confirmed figures should always be verified against the linked official source pages.

## Architecture

```
┌─────────────────┐      REST / JSON     ┌──────────────────────────────┐
│  React + Vite   │ ◄──────────────────► │  FastAPI backend             │
│  Control Tower  │                      │  • RSS/news ingestion        │
│  UI             │                      │  • Official stats parsing    │
└─────────────────┘                      │  • Search + relevance traces │
                                         │  • LLM synthesis (pluggable) │
                                         └──────────────────────────────┘
```

| Layer | Stack |
|-------|-------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | FastAPI, SQLAlchemy (async), SQLite |
| Official counts | Uganda MoH EVD Daily, WHO DON, ECDC outbreak page |
| Signal ingestion | ReliefWeb DRC/Ebola, WHO, CDC HAN, EVD-focused Google News |
| Relevance | Rule-based EVD relevance tracing with geography, response, cross-border, and negative filters |
| Synthesis | Mock (default), OpenAI, or Anthropic |

For a deeper technical overview, see [`docs/architecture.md`](docs/architecture.md).

## Quick start

### 1. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env      # optional — edit LLM keys for local backend runs
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

### 3. First run

1. Open the **Control Tower** dashboard
2. Click **Ingest** / **Fetch All Sources** to ingest public RSS/news feeds
3. Review **Official situation** counts separately from media/RSS signals
4. Search the live feed or generate a **Briefing**

## LLM synthesis

By default the app runs in **mock** mode (no API keys required). To enable live synthesis:

```env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...

# or
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
```

The synthesizer prompt is scoped explicitly as **public-information situational awareness** — not biosafety or laboratory use — to reduce false refusals on terms like Ebola, vaccine, and virus.

## Data Sources

### Official Counts

The official situation panel currently parses:

- Uganda Ministry of Health EVD Daily: confirmed cases, deaths, recoveries, admissions, imported/local cases, active contacts when present
- WHO Disease Outbreak News DON608: DRC/Uganda confirmed cases and deaths when present in the report text
- ECDC DRC/Uganda outbreak page: DRC/Uganda confirmed cases and deaths when present in the report text

These parsers use visible page text and regular expressions. If a source changes wording or layout, the row may fail or return partial data; the API preserves per-source rows instead of forcing a single canonical value.

### Public Signal Feeds

Default RSS/news sources include:

- ReliefWeb — DRC Updates
- ReliefWeb — Ebola
- WHO News
- CDC Health Alert Network
- Google News — EVD Outbreak DRC Uganda
- Google News — Ebola Vaccine Ring Vaccination
- Google News — Uganda Bundibugyo EVD
- Google News — EVD Contact Tracing Response
- Google News — Ebola (broad)
- Google News — Ebola Africa
- Google News — Sudan ebolavirus

Google News feeds are treated as aggregator/media signals and are not considered verified official reports.

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/dashboard` | Control tower stats |
| GET | `/api/tower` | Control tower aggregate (headline, alerts, timeline, map points) |
| GET | `/api/tower/region` | Region drilldown for map points |
| GET | `/api/feed` | Recent articles |
| POST | `/api/search` | Full-text search |
| GET | `/api/sources` | Configured feeds |
| POST | `/api/sources/fetch-all` | Ingest all active feeds |
| GET | `/api/official/situation` | Parsed official case/death metrics |
| GET | `/api/briefings` | Stored briefings |
| POST | `/api/briefings/generate` | AI situational briefing |
| GET | `/api/cron/ingest` | Vercel Cron ingestion route |

## Docker

```bash
cp .env.example .env
docker compose up --build
```

## Deploy to Vercel

The repo is configured for a **full-stack Vercel deploy**: Vite UI from `frontend/dist`, FastAPI API at `/api/*`.

### 1. Connect the repo

1. Push to GitHub (e.g. `aiforglobalgood/ebola`)
2. [Import the project](https://vercel.com/new) — root directory stays **`/`** (repo root)
3. Vercel reads `vercel.json` automatically (build, output, API rewrites)

### 2. Environment variables

Set these in **Project → Settings → Environment Variables**:

| Variable | Required | Notes |
|----------|----------|--------|
| `CRON_SECRET` | Recommended | Random string. If set, `/api/cron/ingest` requires `Authorization: Bearer <secret>` |
| `LLM_PROVIDER` | Optional | `mock` (default), `openai`, or `anthropic` |
| `OPENAI_API_KEY` | Optional | For live briefings |
| `ANTHROPIC_API_KEY` | Optional | For live briefings |

CORS is auto-configured from `VERCEL_URL` — no manual origin setup needed for same-project deploys.

### 3. Deploy

```bash
npm i -g vercel   # once
vercel login
vercel --prod
```

Or push to `main` if Git integration is connected.

### Limitations on Vercel

- **SQLite is ephemeral** — data lives in `/tmp` on serverless functions and can reset on cold starts. Fine for demos; for persistent production data use [Turso](https://turso.tech), Neon, or run the backend on Railway/Render with a volume.
- **Background fetch** is replaced by Vercel Cron (`/api/cron/ingest` once daily at 12:00 UTC in `vercel.json`). Use **Ingest** in the UI for on-demand ingest.
- **Official counts are fetched on demand** — the app does not currently persist official metric history.
- **Cron jobs** require a Vercel [Pro plan](https://vercel.com/docs/cron-jobs) on some accounts; Hobby may have limits.

### Frontend-only on Vercel (backend elsewhere)

If the API runs on Railway, Render, Fly, etc.:

1. Set **Root Directory** to `frontend` in Vercel, or keep monorepo and set `VITE_API_BASE=https://your-api.example.com` at build time.
2. Set `CORS_ORIGINS` on the backend to include your Vercel URL.

## Roadmap

- [ ] Durable production database (Turso, Neon, Postgres, or volume-backed hosting)
- [ ] Persist official metric snapshots and parser status
- [ ] Parser fixture tests for Uganda MoH, WHO DON, and ECDC pages
- [ ] GDELT / NewsAPI connectors
- [ ] User auth & audit log for internal foundation use
- [ ] Export briefings to PDF / email digest
- [ ] OpenAI Rosalind / less-restricted model adapter when available

## License

Internal use — Gates Foundation emergency response tooling.
