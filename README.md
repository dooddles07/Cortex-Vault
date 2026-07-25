# CortexVault

**Your knowledge. Instantly recalled.**

CortexVault is an AI-powered second brain built on Retrieval-Augmented Generation (RAG). Collect documents, PDFs, notes, web pages, code, and more — then search and chat with your own knowledge using an assistant that answers only from what you've stored.

> **Status:** Blueprint / pre-implementation. This repo currently contains the full product, architecture, and engineering specification in [`/docs`](docs/). No application code has been written yet — the documents below are the plan an engineering team would implement from.

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
| [ARCHITECTURE](docs/ARCHITECTURE.md) | System design, diagrams, folder structure, scalability |

More docs (database, RAG, API, security, design, testing, deployment, ...) land in `/docs` as the blueprint expands.

## Stack (planned)

Next.js + TypeScript + Tailwind + shadcn/ui · Postgres (Supabase) + pgvector · Prisma · Better Auth · OpenAI/Gemini/OpenRouter/Ollama · Vercel

Full rationale in [TECH-STACK.md](docs/TECH-STACK.md).

## License

[MIT](LICENSE) © 2026 QUAN7UM
