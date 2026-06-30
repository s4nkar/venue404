import logging

from app.core.config import settings
from app.core.database import SessionLocal
from app.modules.search.indexer import process_job, retryable_job_ids

logger = logging.getLogger(__name__)


def _dequeue_from_upstash(limit: int) -> list[str]:
    if not settings.upstash_redis_url or not settings.upstash_redis_token:
        return []
    try:
        from upstash_redis import Redis
        r = Redis(url=settings.upstash_redis_url, token=settings.upstash_redis_token)
        ids = [r.rpop(settings.upstash_search_queue_key) for _ in range(limit)]
        return [i for i in ids if i]
    except Exception as exc:
        logger.warning("search_indexer: Upstash unavailable (%s), falling back to DB poll", exc)
        return []


def run() -> None:
    db = SessionLocal()
    try:
        job_ids = _dequeue_from_upstash(limit=10)
        if not job_ids:
            job_ids = retryable_job_ids(db, limit=10)

        if not job_ids:
            return

        logger.info("search_indexer: processing %d job(s)", len(job_ids))
        for job_id in job_ids:
            process_job(db, job_id)
    finally:
        db.close()
