# apps/api/run_all_jobs.py
import sys
from pathlib import Path

# Force load all models
sys.path.insert(0, str(Path(__file__).parent))

import app.modules.venue.models
import app.modules.profile.models
import app.modules.booking.models
import app.modules.booking._stubs

from app.core.database import SessionLocal
from app.modules.booking.jobs import (
    run_hold_expiry_job,
    run_request_expiry_job,
    run_booking_completion_job,
    run_balance_overdue_flag_job,
    run_balance_overdue_autocancel_job,
)

JOBS = {
    "hold_expiry": run_hold_expiry_job,
    "request_expiry": run_request_expiry_job,
    "completion": run_booking_completion_job,
    "overdue_flag": run_balance_overdue_flag_job,
    "overdue_autocancel": run_balance_overdue_autocancel_job,
}


def run_job(job_name: str):
    if job_name not in JOBS:
        print(f"Unknown job: {job_name}")
        return False

    job_func = JOBS[job_name]
    print(f"🚀 Running {job_name}...")

    db = SessionLocal()
    try:
        count = job_func(db)
        print(f"✅ {job_name} completed. Processed: {count}")
        return True
    except Exception as e:
        print(f"❌ Error in {job_name}: {e}")
        import traceback

        traceback.print_exc()
        return False
    finally:
        db.close()


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
        print("  python run_all_jobs.py <job_name>")
        print("  python run_all_jobs.py all")
        print("\nAvailable jobs:", list(JOBS.keys()))
