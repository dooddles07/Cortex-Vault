import uuid

import pytest
from fastapi import BackgroundTasks

import app.services.dispatch as dispatch
from app.services.dispatch import dispatch_ingest


async def test_inline_mode_schedules_a_background_task(monkeypatch):
    monkeypatch.setattr(dispatch.settings, "INGEST_MODE", "inline")
    background = BackgroundTasks()

    await dispatch_ingest(background, uuid.uuid4(), uuid.uuid4())

    assert len(background.tasks) == 1


async def test_inline_mode_does_not_touch_redis(monkeypatch):
    """The whole point of inline mode is running without Redis."""
    monkeypatch.setattr(dispatch.settings, "INGEST_MODE", "inline")
    monkeypatch.setattr(dispatch.settings, "REDIS_URL", None)

    await dispatch_ingest(BackgroundTasks(), uuid.uuid4(), uuid.uuid4())


async def test_queue_mode_enqueues_instead_of_scheduling(monkeypatch):
    monkeypatch.setattr(dispatch.settings, "INGEST_MODE", "queue")
    enqueued: list[tuple] = []

    async def _fake_enqueue(document_id, job_id):
        enqueued.append((document_id, job_id))

    monkeypatch.setattr("app.workers.queue.enqueue_ingest", _fake_enqueue)
    background = BackgroundTasks()
    doc_id, job_id = uuid.uuid4(), uuid.uuid4()

    await dispatch_ingest(background, doc_id, job_id)

    assert enqueued == [(doc_id, job_id)]
    assert len(background.tasks) == 0


async def test_inline_failures_do_not_escape(monkeypatch):
    """A failed ingest is recorded on the job row; it must not surface as an
    unhandled error in the background task runner."""

    async def _boom(ctx, document_id, job_id):
        raise RuntimeError("ingest exploded")

    monkeypatch.setattr("app.workers.tasks.ingest.ingest_document", _boom)

    await dispatch._run_inline(uuid.uuid4(), uuid.uuid4())


def test_queue_mode_requires_redis(monkeypatch):
    from app.workers.queue import redis_settings

    monkeypatch.setattr(dispatch.settings, "REDIS_URL", None)
    with pytest.raises(RuntimeError, match="REDIS_URL"):
        redis_settings()
