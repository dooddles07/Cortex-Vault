# Project Overview

## Executive Summary

CortexVault is an AI-native second brain: a place to capture heterogeneous personal knowledge (documents, notes, web clips, media transcripts) and query it through a RAG-grounded chat interface that cites its sources. The product competes at the intersection of note-taking (Notion, Obsidian), AI research tools (NotebookLM, Perplexity), and AI memory products (Mem.ai), differentiated by combining all three under one privacy-respecting, self-hostable roof.

## Goals

- Ship a usable MVP (capture + search + cited chat) on a free-tier-friendly stack
- Keep user data portable and exportable at every plan tier — no lock-in
- Design for a single-user free plan that scales to team/enterprise without a rewrite
- Answer only from the user's own corpus; never blend in un-cited model knowledge for factual claims
- Sub-second search, sub-3s first-token chat latency at MVP scale (<50k chunks/user)

## Non-Goals (v1)

- Real-time multiplayer editing (Notion-style) — out of scope until Team plan
- Mobile native apps — responsive web first, native later (see [ROADMAP](ROADMAP.md))
- Fine-tuning custom models — retrieval quality over model customization

## Target Personas

| Persona | Goals | Daily Workflow | Pain Points | Why CortexVault |
|---|---|---|---|---|
| **Student** | Retain lecture/reading material, ace exams | Clips readings, uploads slides, reviews before exams | Notes scattered across apps, no way to quiz self on own material | Chat-based recall + auto-tagging turns notes into a study partner |
| **Developer** | Remember past decisions, snippets, docs | Saves code snippets, API docs, RFCs | Knowledge lives in Slack/browser tabs, unsearchable | Code-aware chunking, semantic search across snippets + docs |
| **Researcher** | Synthesize across papers | Uploads PDFs, annotates, cross-references | Manual citation tracking, losing track of which paper said what | Citation viewer ties every AI answer back to source page |
| **Founder** | Fast recall across fundraising/ops/product context | Captures meeting notes, emails (future), pitches | Context spread across tools, no single source of truth | Unified vault + AI chat as an always-available chief of staff |
| **Lawyer** | Precedent and case research, precise citation | Uploads case law, contracts, drafts memos | Must never misattribute a citation | Grounded RAG with citation viewer; no answer without a source |
| **Doctor** | Fast recall of clinical references, case notes | Saves guidelines, research, patient-anonymized notes | Time pressure, needs verified sources only | Cited answers only, hybrid search for exact terminology |
| **Writer** | Idea capture, research synthesis | Clips articles, drafts outlines, stores voice notes | Research scattered, hard to resurface old ideas | Auto-tagging + semantic search surfaces forgotten material |
| **Content Creator** | Repurpose past content, track ideas | Saves video transcripts, drafts, trends | Can't remember what they've already covered | YouTube transcript ingestion + duplicate detection |
| **Product Manager** | Track decisions, specs, customer feedback | Saves specs, meeting notes, research | Decisions buried in docs/Slack, no institutional memory | Searchable single source of truth with AI recall |
| **Consultant** | Client-specific knowledge isolation | Uploads client docs, frameworks, reports | Must keep client data siloed | Workspace-scoped vaults with strict tenant isolation |
| **Teams** | Shared knowledge base | Collaborative docs, onboarding material | Knowledge walks out the door with employees | Team plan: shared workspaces, permissions, audit logs |
| **Enterprises** | Compliance, security, scale | Org-wide knowledge management | Vendor risk, data residency, access control | Enterprise plan: SSO, RBAC, audit logs, on-prem/VPC option |

## Competitor Analysis

| Product | Strength | Weakness | CortexVault Differentiator |
|---|---|---|---|
| **Notion AI** | Best-in-class docs/wiki UX | AI is a feature bolted onto docs, not RAG-native; weak citation | Purpose-built RAG core, not an add-on |
| **Obsidian** | Local-first, plugin ecosystem, power-user loved | No native AI/RAG, steep setup for search | Native hybrid search + AI chat, zero-plugin setup |
| **Mem.ai** | Strong auto-organization | Closed ecosystem, weak document/PDF support | Broader ingestion (PDF, OCR, YouTube, code) |
| **NotebookLM** | Excellent grounded citation UX | No persistent personal vault across notebooks, no note-taking | Persistent single vault + capture tools, not session-bound |
| **Perplexity** | Great web-grounded answers | Not about *your* private knowledge | 100% private corpus, not the open web |
| **ChatGPT Projects** | Familiar chat UX | Shallow retrieval, poor document organization at scale | Purpose-built vector search + folders/tags/collections |
| **Evernote** | Mature capture tools | No modern AI, aging UX | AI-native from the ground up |
| **Capacities** | Nice object-based PKM model | No RAG chat | Adds grounded AI chat on top of structured capture |
| **Logseq** | Local-first, outliner, open source | No built-in AI, developer-only UX | Mainstream UX + AI without sacrificing privacy |

### SWOT

- **Strengths:** unified ingestion surface, citation-first AI, privacy/self-host option, modern free-tier-friendly stack
- **Weaknesses:** new entrant with no brand trust; RAG quality is hard to get right; more surface area than single-purpose competitors
- **Opportunities:** rising demand for "AI memory" products; privacy backlash against cloud-AI-everything; team knowledge management is underserved by consumer PKM tools
- **Threats:** incumbents (Notion, Google) bundling similar AI features for free; foundation model providers shipping native "memory"; commoditization of RAG-as-a-feature

### Feature Comparison

| Feature | CortexVault | Notion AI | Obsidian | Mem.ai | NotebookLM | Perplexity |
|---|---|---|---|---|---|---|
| Cited RAG chat | Yes | Partial | No | Partial | Yes | Yes (web) |
| PDF/OCR ingestion | Yes | Partial | Plugin | Partial | Yes | No |
| Hybrid search | Yes | No | Plugin | Partial | No | N/A |
| Self-host option | Yes | No | Yes | No | No | No |
| Auto-tagging/graph | Yes | No | Plugin | Yes | No | No |
| Team workspaces | Roadmap | Yes | No | No | No | No |
| Local/offline LLM | Yes (Ollama) | No | No | No | No | No |

## Business Model

| Plan | Price (indicative) | Storage | AI Usage | Seats | Notes |
|---|---|---|---|---|---|
| **Free** | $0 | 200 MB / 1,000 chunks | 50 AI messages/mo, shared-rate-limited model | 1 | BYO API key unlocks unlimited AI |
| **Pro** | $12/mo | 20 GB / unlimited docs | 1,500 messages/mo included, overage billed | 1 | Priority embeddings queue, version history |
| **Team** | $20/user/mo | 100 GB pooled | Pooled AI budget | 3+ | Shared workspaces, roles, audit log |
| **Enterprise** | Custom | Custom / VPC | Custom, BYO-LLM required at scale | 50+ | SSO/SAML, on-prem option, DPA, SLA |

Token/storage limits enforced via usage metering table (see [DATABASE.md](DATABASE.md)); overage handled via Stripe metered billing. Future monetization: API access marketplace, template/knowledge-pack marketplace, white-label for consultants/agencies.

## How to Use These Docs

Start with [ARCHITECTURE.md](ARCHITECTURE.md) for system shape, then [FEATURES.md](FEATURES.md) for scope, then [TECH-STACK.md](TECH-STACK.md) before writing code.
