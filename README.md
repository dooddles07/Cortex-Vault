# CortexVault

**Your knowledge. Instantly recalled.**

CortexVault is an AI-powered second brain built on Retrieval-Augmented Generation (RAG). Collect documents, PDFs, notes, web pages, code, and more — then search and chat with your own knowledge using an assistant that answers only from what you've stored.

> **Status:** Backend implemented and deployed; frontend not yet wired to it. The API (auth, documents, folders, tags, ingestion, hybrid search, RAG chat) is live and verified end-to-end. PDF/OCR extraction, rate limiting, and most P1 features are not built — see [ROADMAP.md](docs/ROADMAP.md) for the honest gap list.

## Why CortexVault

Think Notion + Obsidian + NotebookLM + Perplexity, with your data staying yours.

- **Capture anything** — notes, PDFs, web clips, images (OCR), YouTube transcripts, code snippets, meeting notes, research papers
- **AI chat over your own data** — cited, grounded answers, no hallucinated sources
- **Hybrid search** — semantic + keyword + re-ranking
- **Auto-organization** — tagging, folder suggestions, duplicate detection, knowledge graph
- **Privacy-first** — self-hostable, bring-your-own LLM key, local embedding option (Ollama)

## Documentation

| Doc | Covers |
|---|---|
| [PROJECT-OVERVIEW](docs/PROJECT-OVERVIEW.md) | Vision, personas, competitor analysis, business model |
| [FEATURES](docs/FEATURES.md) | Full feature catalog — purpose, flow, API, DB impact, priority |
| [ROADMAP](docs/ROADMAP.md) | What is shipped, what is missing, engineering debt |
| [ARCHITECTURE](docs/ARCHITECTURE.md) | System design as built, diagrams, structure, known gaps |
| [TECH-STACK](docs/TECH-STACK.md) | Every technology choice and its rationale |
| [API](docs/API.md) | Endpoint reference, auth, SSE chat contract |
| [DATABASE](docs/DATABASE.md) | Schema, indexes, cascades, migrations |
| [RAG](docs/RAG.md) | Chunking, embedding, hybrid retrieval, generation |
| [AI](docs/AI.md) | Provider adapters, model availability, cost and privacy |
| [SECURITY](docs/SECURITY.md) | What is enforced, and the pre-production gap list |
| [TESTING](docs/TESTING.md) | Local setup, test layers, deployment verification |
| [DEPLOYMENT](docs/DEPLOYMENT.md) | Railway topology, config as code, failure modes |
| [DESIGN](docs/DESIGN.md) · [UI-UX](docs/UI-UX.md) | Design tokens, component system, screens |

## Stack

Next.js 15 + TypeScript + Tailwind 4 · FastAPI (Python 3.12) · Postgres 17 + pgvector · SQLAlchemy 2 + Alembic · Redis + arq · Google Gemini (OpenAI and Ollama adapters included) · Railway

Full rationale — including why the backend is Python rather than the originally planned TypeScript — in [TECH-STACK.md](docs/TECH-STACK.md).

## Quick start

```bash
cd apps/server
docker compose up -d          # Postgres + pgvector, Redis
cp .env.example .env          # set GEMINI_API_KEY
pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload
```

See [TESTING.md](docs/TESTING.md) for the worker, the frontend, and deployment verification.

## License

[MIT](LICENSE) © 2026 QUAN7UM
