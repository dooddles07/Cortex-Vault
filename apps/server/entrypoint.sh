#!/bin/sh
# One image, two roles. SERVICE_ROLE=worker runs the arq queue consumer, which
# is only needed when INGEST_MODE=queue. The default single-service deployment
# runs ingestion in-process and needs this container only in the api role.
set -e

if [ "$SERVICE_ROLE" = "worker" ]; then
    exec arq app.workers.worker_settings.WorkerSettings
fi

alembic upgrade head
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
