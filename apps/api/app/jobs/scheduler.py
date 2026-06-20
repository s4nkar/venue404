# app/jobs/scheduler.py
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from app.core.database import SessionLocal
from app.modules.booking.jobs import (
    run_hold_expiry_job,
    run_request_expiry_job,
    run_booking_completion_job,
    run_balance_overdue_flag_job,
    run_balance_overdue_autocancel_job,
    run_balance_due_reminders_job
)

logger = logging.getLogger(__name__)
scheduler = BackgroundScheduler()


def _wrap_job(job_func):
    """Wrapper to inject DB session and add logging"""

    def wrapper():
        logger.info(f"🔄 Starting job: {job_func.__name__}")
        db = SessionLocal()
        try:
            count = job_func(db)
            logger.info(f"✅ {job_func.__name__} completed. Processed: {count}")
        except Exception as e:
            logger.error(f"❌ Error in {job_func.__name__}: {e}", exc_info=True)
        finally:
            db.close()

    return wrapper


def start():
    """Register and start all background jobs"""
    try:
        scheduler.add_job(
            _wrap_job(run_hold_expiry_job), "interval", hours=1, id="hold_expiry"
        )
        scheduler.add_job(
            _wrap_job(run_request_expiry_job), "interval", hours=6, id="request_expiry"
        )
        scheduler.add_job(
            _wrap_job(run_booking_completion_job),
            "interval",
            hours=24,
            id="booking_completion",
        )
        scheduler.add_job(
            _wrap_job(run_balance_overdue_flag_job),
            "interval",
            hours=1,
            id="balance_overdue_flag",
        )
        scheduler.add_job(
            _wrap_job(run_balance_overdue_autocancel_job),
            "interval",
            hours=1,
            id="balance_overdue_autocancel",
        )

        scheduler.add_job(
            _wrap_job(run_balance_due_reminders_job),
            "interval",
            hours=1,
            id="balance_due_reminders_job",
        )

        scheduler.start()
        logger.info("✅ APScheduler started successfully")
        logger.info(f"Registered jobs: {[job.id for job in scheduler.get_jobs()]}")

    except Exception as e:
        logger.error(f"Failed to start APScheduler: {e}", exc_info=True)
        raise


def shutdown():
    """Gracefully shutdown scheduler"""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("APScheduler shutdown")
