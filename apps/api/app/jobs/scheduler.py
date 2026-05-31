from apscheduler.schedulers.background import BackgroundScheduler
from app.jobs import hold_expiry, stale_requests, payment_reminders, booking_completion

scheduler = BackgroundScheduler()


def start():
    scheduler.add_job(hold_expiry.run, "interval", hours=1, id="hold_expiry")
    scheduler.add_job(stale_requests.run, "interval", hours=6, id="stale_requests")
    scheduler.add_job(payment_reminders.run, "cron", hour=8, id="payment_reminders")
    scheduler.add_job(booking_completion.run, "cron", hour=0, id="booking_completion")
    scheduler.start()
