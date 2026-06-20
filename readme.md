# Ebola Crisis Hub

**Ebola Emergency Crisis Control Tower** — a client-server web app for monitoring, retrieving, organizing, and synthesizing public information to support situational awareness and decision-making during health emergencies.

Built for foundation program teams who need a centralized hub that aggregates open-source intelligence without running afoul of overly restrictive AI safety filters on crisis-related keywords.

## Architecture

```
┌─────────────────┐      REST / JSON       ┌──────────────────────────────┐
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
| Ingestion | WHO, CDC, ReliefWeb, GAVI RSS feeds |
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

## Roadmap

- [ ] Scheduled background fetch (APScheduler / Celery)
- [ ] GDELT / NewsAPI connectors
- [ ] User auth & audit log for internal foundation use
- [ ] Export briefings to PDF / email digest
- [ ] OpenAI Rosalind / less-restricted model adapter when available

## License

Internal use — Gates Foundation emergency response tooling.
