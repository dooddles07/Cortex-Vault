from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    ENV: str = "development"
    PORT: int = 8000

    DATABASE_URL: str
    DATABASE_URL_SYNC: str

    # Optional. Without it, ingestion runs in-process and rate limiting falls
    # back to per-instance counters — the free single-instance deployment.
    REDIS_URL: str | None = None

    # "inline" runs ingestion in a FastAPI background task; "queue" hands it to
    # an arq worker. Queue mode needs REDIS_URL and a separate worker process.
    INGEST_MODE: str = "inline"

    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7

    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    # Chat and embeddings are chosen independently: free Gemini chat can pair
    # with OpenAI embeddings, or any other mix.
    CHAT_PROVIDER: str = "gemini"
    EMBEDDING_PROVIDER: str = "gemini"
    EMBEDDING_DIM: int = 768

    OPENAI_API_KEY: str | None = None
    OPENAI_CHAT_MODEL: str = "gpt-4.1-mini"
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"

    GEMINI_API_KEY: str | None = None
    GEMINI_CHAT_MODEL: str = "gemini-3.5-flash"
    GEMINI_EMBEDDING_MODEL: str = "gemini-embedding-001"

    # Groq is chat-only: it has no embeddings endpoint.
    GROQ_API_KEY: str | None = None
    GROQ_CHAT_MODEL: str = "llama-3.3-70b-versatile"

    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_CHAT_MODEL: str = "llama3.1"
    OLLAMA_EMBEDDING_MODEL: str = "nomic-embed-text"

    # Token-based, not character-based — see docs/RAG.md. 200 tokens is
    # roughly the 800-character default this replaced, for English prose.
    CHUNK_SIZE: int = 200
    CHUNK_OVERLAP: int = 30
    RETRIEVAL_TOP_K: int = 20
    RERANK_TOP_N: int = 6

    DB_POOL_SIZE: int = 5
    DB_POOL_MAX_OVERFLOW: int = 10

    MAX_UPLOAD_BYTES: int = 25 * 1024 * 1024

    # Optional. Without all four set, original uploads are not persisted —
    # text is extracted and the file discarded, same as today's behavior.
    R2_ACCOUNT_ID: str | None = None
    R2_ACCESS_KEY_ID: str | None = None
    R2_SECRET_ACCESS_KEY: str | None = None
    R2_BUCKET_NAME: str | None = None

    # Optional. Without it, verification/reset emails are logged, not sent —
    # sign-up and forgot-password still succeed either way.
    RESEND_API_KEY: str | None = None
    MAIL_FROM: str = "CortexVault <onboarding@resend.dev>"
    # Used to build links inside emails; not read at runtime by the frontend.
    WEB_BASE_URL: str = "http://localhost:3000"

    ACCOUNT_LOCKOUT_THRESHOLD: int = 5
    ACCOUNT_LOCKOUT_MINUTES: int = 15
    EMAIL_VERIFICATION_TTL_HOURS: int = 24
    PASSWORD_RESET_TTL_MINUTES: int = 30

    # Requests per minute. Auth is per IP; the rest are per user.
    RATE_LIMIT_AUTH: int = 10
    RATE_LIMIT_CHAT: int = 20
    RATE_LIMIT_UPLOAD: int = 20
    RATE_LIMIT_SEARCH: int = 60

    # Optional. Without it, failures are only visible in Render's log stream.
    SENTRY_DSN: str | None = None
    # 0.0 = errors only, no performance traces — traces count against the
    # same free event quota as errors do.
    SENTRY_TRACES_SAMPLE_RATE: float = 0.0


settings = Settings()  # type: ignore[call-arg]
