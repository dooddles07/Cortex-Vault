#!/bin/sh
# Single image, two roles: SERVICE_ROLE=worker runs the queue, anything else serves the API.
set -e

if [ "$SERVICE_ROLE" = "worker" ]; then
    exec arq app.workers.worker_settings.WorkerSettings
fi

alembic upgrade head
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
