# AI Providers

Provider selection, model choices, and the adapter contract. For the retrieval pipeline itself see [RAG.md](RAG.md).

## Provider abstraction

`app/rag/providers/base.py` defines two `Protocol`s — structural typing, so adapters need no base class:

```python
class EmbeddingProvider(Protocol):
    async def embed(self, texts: list[str]) -> list[list[float]]: ...

class ChatProvider(Protocol):
    def stream(self, messages: list[dict[str, str]]) -> AsyncIterator[str]: ...
```

Both are deliberately minimal. Chat yields plain text deltas — no tool calls, no structured output — because the RAG contract only needs streamed prose with `[n]` markers.

`registry.py` maps names to classes and resolves them independently:

```python
CHAT_PROVIDER=groq          # get_chat_provider()   — gemini | groq | openai | ollama
EMBEDDING_PROVIDER=gemini   # get_embedding_provider() — gemini | openai | ollama
```

Note the tables differ: **Groq is chat-only** and has no embeddings endpoint.

Splitting these matters: embeddings run on every ingested document (high volume, cheap), chat runs per question (low volume, expensive). Free Gemini embeddings can pair with a paid chat provider without touching code.

## Active configuration

Per `render.yaml` (the deployed blueprint), not the code default — `CHAT_PROVIDER` defaults to `gemini` in `config.py`, but production overrides it to `groq`.

| Role | Provider | Model | Dimension |
|---|---|---|---|
| Chat | Groq | `llama-3.3-70b-versatile` | — |
| Embeddings | Gemini | `gemini-embedding-001` | 768 (from 3072 native) |

## Gemini model availability

Verified by calling the API, not by reading the console:

| Model | Status |
|---|---|
| `gemini-3.5-flash` | Works on free tier |
| `gemini-flash-latest`, `gemini-3.6-flash`, `gemini-3.1-flash-lite` | Also work |
| `gemini-embedding-001` | Works; 100 RPM, 1K RPD |
| `gemini-2.0-flash` | **0/0 quota** — no free allowance |
| `gemini-2.5-flash`, `gemini-2.5-flash-lite` | **Closed to new users** (404) |
| `text-embedding-004` | **Retired** (404) |

Two traps worth recording:

1. **The AI Studio rate-limit page lists quota for models you cannot call.** It showed 5 RPM / 20 RPD for `gemini-2.5-flash`, which returns `404 ... no longer available to new users`. Verify against the API.
2. **Quota is per Google Cloud project, not per key.** Multiple keys in one project share one allowance — creating another key does not raise a limit.

## Adapter notes

### Gemini (`gemini_provider.py`)

Raw REST over httpx rather than the `google-generativeai` SDK — one fewer dependency, and the surface used is small. Three shape differences from OpenAI-style APIs:

- System prompt goes in a top-level `systemInstruction`, not a message with `role: "system"`
- The assistant role is `model`, not `assistant`
- Streaming needs `?alt=sse`; without it the response is a JSON array, not an event stream

Embeddings send `outputDimensionality` to force 768 (see [RAG.md](RAG.md) for why).

### OpenAI (`openai_provider.py`)

Inactive but wired. The client is built lazily inside `_get_client()`, **not at module import**. This is load-bearing: `registry.py` imports every provider eagerly, so a module-level `AsyncOpenAI(api_key=None)` raises `OpenAIError` at import and crashes the entire app even when OpenAI is unused. That bug reached production once. Any new adapter must construct its client lazily.

### Groq (`groq_provider.py`)

**Chat only — Groq has no embeddings endpoint.** It is deliberately absent from the registry's `_EMBEDDING` table, so `EMBEDDING_PROVIDER=groq` fails at resolution with a message naming the supported set, rather than at the first ingestion.

Groq exposes an OpenAI-compatible API, so the official OpenAI client is reused with `base_url=https://api.groq.com/openai/v1` instead of hand-rolled HTTP. The client is built lazily, same as OpenAI's.

This is the deployed pairing — Groq chat with Gemini embeddings — both free, and Groq's inference is substantially faster than Gemini Flash:

```
CHAT_PROVIDER=groq
EMBEDDING_PROVIDER=gemini
```

One defensive detail: Groq occasionally emits a chunk with an empty `choices` array, which would raise an `IndexError` on `chunk.choices[0]`. The adapter skips those.

### Ollama (`ollama_provider.py`)

Inactive. Points at `OLLAMA_BASE_URL` for fully local inference. Practical for local development; impractical on a small cloud instance — CPU inference is slow and memory-hungry. `nomic-embed-text` outputs 768 dimensions, which happens to match the current schema.

## Adding a provider

1. Create `app/rag/providers/<name>_provider.py` with the two classes.
2. **Construct clients lazily**, inside a method or an `lru_cache`d factory.
3. Register in `registry.py`'s `_CHAT` and `_EMBEDDING` dicts.
4. Add config fields to `app/core/config.py` and `.env.example`.
5. If embedding dimension differs, write a migration altering `chunks.embedding`, rebuild the HNSW index, and re-embed everything. Dimension must be ≤2000.

## Cost and privacy

Currently $0 — Gemini free tier for both roles. Two consequences to weigh before real users:

- **Rate limits are per-day, not just per-minute.** Bulk ingestion can exhaust the daily embedding allowance.
- **Google may train on free-tier API data.** Acceptable for development; not for other people's documents. Paid tier changes this.

Rough paid comparison per million tokens, if the free tier stops fitting:

| Provider | Chat in/out | Embeddings |
|---|---|---|
| Gemini Flash (paid) | Low | Low |
| OpenAI `gpt-4.1-mini` | ~$0.40 / ~$1.60 | ~$0.02 (`text-embedding-3-small`) |
| Anthropic Claude | ~$3–25 | **None — no embedding model** |

Anthropic ships no embedding model, so Claude can only ever be the chat half. The provider split already accommodates that.
