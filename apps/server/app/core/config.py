from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    ENV: str = "development"
    PORT: int = 8000

    DATABASE_URL: str
    DATABASE_URL_SYNC: str
    REDIS_URL: str = "redis://localhost:6379/0"

    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7

    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    EMBEDDING_PROVIDER: str = "openai"
    EMBEDDING_DIM: int = 1536
    OPENAI_API_KEY: str | None = None
    OPENAI_CHAT_MODEL: str = "gpt-4.1-mini"
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"
    OLLAMA_BASE_URL: str = "http://localhost:11434"

    CHUNK_SIZE: int = 800
    CHUNK_OVERLAP: int = 120
    RETRIEVAL_TOP_K: int = 20
    RERANK_TOP_N: int = 6


settings = Settings()  # type: ignore[call-arg]
