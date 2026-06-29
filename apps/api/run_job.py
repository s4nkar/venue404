# apps/api/run_job.py
# Manual / cron entrypoint for the background jobs. These are the SAME canonical
# functions the in-process APScheduler runs (app/jobs/*); each manages its own
# session (with_session: commit on success, rollback on error) and returns the
# number of rows it processed.
import sys
from pathlib import Path

# Force load all models so SQLAlchemy relationships resolve.
sys.path.insert(0, str(Path(__file__).parent))

import app.modules.venue.models  # noqa: F401
import app.modules.profile.models  # noqa: F401
import app.modules.booking.models  # noqa: F401

from app.jobs import (
    hold_expiry,
    stale_requests,
    booking_completion,
    payment_reminders,
    balance_overdue,
)

JOBS = {
    "hold_expiry": hold_expiry.run,
    "request_expiry": stale_requests.run,
    "completion": booking_completion.run,
    "payment_reminders": payment_reminders.run,
    "overdue_flag": balance_overdue.run_flag,
    "overdue_autocancel": balance_overdue.run_autocancel,
}


def run_job(job_name: str):
    if job_name not in JOBS:
        print(f"Unknown job: {job_name}")
        return False

    job_func = JOBS[job_name]
    print(f"🚀 Running {job_name}...")

    try:
        count = job_func()
        print(f"✅ {job_name} completed. Processed: {count}")
        return True
    except Exception as e:
        print(f"❌ Error in {job_name}: {e}")
        import traceback

        traceback.print_exc()
        return False


def run_all():
    print("Running ALL jobs...\n")
    success = 0
    for name in JOBS.keys():
        if run_job(name):
            success += 1
    print(f"\nCompleted {success}/{len(JOBS)} jobs.")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "all":
        run_all()
    elif len(sys.argv) > 1:
        run_job(sys.argv[1])
    else:
        print("Usage:")
        print("  python run_job.py <job_name>")
        print("  python run_job.py all")
        print("\nAvailable jobs:", list(JOBS.keys()))
