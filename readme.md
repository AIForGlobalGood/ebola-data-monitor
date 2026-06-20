# Ebola Crisis Hub

**Ebola virus disease (EVD) Control Tower** — monitors the DRC/Uganda outbreak corridor and related filovirus signals. Aggregates public RSS from WHO, ReliefWeb, and CDC; filters out generic health noise; separates verified agency reports from media aggregators.

Built for foundation program teams who need EVD situational awareness — ring vaccination, contact tracing, health-zone geography — without treating every headline as a confirmed case count.

## Architecture

```
┌─────────────────┐      REST / JSON     ┌──────────────────────────────┐
│  React + Vite   │ ◄──────────────────► │  FastAPI backend             │
│  Control Tower  │                      │  • RSS ingestion             │
│  UI             │                      │  • Search & relevance scoring│
└─────────────────┘                      │  • LLM synthesis (pluggable) │
                                         └──────────────────────────────┘
```

| Layer | Stack |
|-------|-------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | FastAPI, SQLAlchemy (async), SQLite |
| Ingestion | ReliefWeb DRC/Ebola, WHO, CDC HAN, EVD-focused Google News |
| Synthesis | Mock (default), OpenAI, or Anthropic |

## Quick start

### 1. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example ../.env   # optional — edit LLM keys
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
2. Click **Fetch All Sources** to ingest public RSS feeds
3. Search the live feed or generate a **Briefing**

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

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/dashboard` | Control tower stats |
| GET | `/api/feed` | Recent articles |
| POST | `/api/search` | Full-text search |
| GET | `/api/sources` | Configured feeds |
| POST | `/api/sources/fetch-all` | Ingest all active feeds |
| POST | `/api/briefings/generate` | AI situational briefing |

## Docker

```bash
cp .env.example .env
docker compose up --build
```

## Deploy to Vercel

The repo is configured for a **full-stack Vercel deploy**: Vite UI from `frontend/dist`, FastAPI API at `/api/*`.

### 1. Connect the repo

1. Push to GitHub (e.g. `mineglobalsim/ebola`)
2. [Import the project](https://vercel.com/new) — root directory stays **`/`** (repo root)
3. Vercel reads `vercel.json` automatically (build, output, API rewrites)

### 2. Environment variables

Set these in **Project → Settings → Environment Variables**:

| Variable | Required | Notes |
|----------|----------|--------|
| `CRON_SECRET` | Recommended | Random string; Vercel Cron sends `Authorization: Bearer <secret>` to `/api/cron/ingest` every 6h |
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
- **Background fetch** is replaced by Vercel Cron (`/api/cron/ingest` every 6 hours). Use **Fetch All Sources** in the UI for on-demand ingest.
- **Cron jobs** require a Vercel [Pro plan](https://vercel.com/docs/cron-jobs) on some accounts; Hobby may have limits.

### Frontend-only on Vercel (backend elsewhere)

If the API runs on Railway, Render, Fly, etc.:

1. Set **Root Directory** to `frontend` in Vercel, or keep monorepo and set `VITE_API_BASE=https://your-api.example.com` at build time.
2. Set `CORS_ORIGINS` on the backend to include your Vercel URL.

## Roadmap

- [ ] Scheduled background fetch (APScheduler / Celery)
- [ ] GDELT / NewsAPI connectors
- [ ] User auth & audit log for internal foundation use
- [ ] Export briefings to PDF / email digest
- [ ] OpenAI Rosalind / less-restricted model adapter when available

## License

Internal use — Gates Foundation emergency response tooling.
