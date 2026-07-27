FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev tesseract-ocr poppler-utils \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
RUN pip install --no-cache-dir .

# tiktoken fetches its BPE vocab file from a CDN on first use unless it's
# already cached. Baking it into the image at build time means chunking never
# depends on outbound network access at runtime, same principle as OCR being
# self-hosted rather than a cloud call.
ENV TIKTOKEN_CACHE_DIR=/opt/tiktoken_cache
RUN python -c "import tiktoken; tiktoken.get_encoding('cl100k_base')"

COPY app ./app
COPY alembic.ini ./
COPY alembic ./alembic
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

EXPOSE 8000

CMD ["./entrypoint.sh"]
