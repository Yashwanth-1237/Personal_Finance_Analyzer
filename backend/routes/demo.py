"""DEMO MODE ONLY: fills the logged-in account with labelled sample data.

Sample rows are only created when the student presses "Load demo data" in
Settings. Every sample expense note starts with "[Demo]" so it is easy to spot.
"""
import random
from datetime import date
from decimal import Decimal

from flask import Blueprint, current_app, g, jsonify

from models import Budget, Category, Expense, db
from utils import ApiError, get_json_body, login_required, month_range, shift_month

demo_bp = Blueprint("demo", __name__)

# (category, note, min, max) — amounts in won
SAMPLES = [
    ("Food", "Lunch at campus cafeteria", 5000, 9000),
    ("Food", "Convenience store snacks", 2000, 6000),
    ("Food", "Dinner with friends", 12000, 25000),
    ("Food", "Coffee", 3000, 5500),
    ("Transportation", "T-money top-up", 10000, 20000),
    ("Transportation", "Bus to Daejeon Station", 1500, 1500),
    ("Shopping", "Daiso supplies", 5000, 15000),
    ("Shopping", "New hoodie", 25000, 45000),
    ("Study", "Textbook", 18000, 32000),
    ("Study", "Printing", 1000, 4000),
    ("Entertainment", "Movie ticket", 12000, 15000),
    ("Entertainment", "Karaoke (noraebang)", 8000, 15000),
    ("Housing", "Dormitory utilities", 30000, 50000),
    ("Other", "Phone bill", 33000, 33000),
]


@demo_bp.post("/demo/seed")
@login_required
def seed_demo():
    if not current_app.config["ENABLE_DEMO_SEED"]:
        raise ApiError("Demo mode is disabled on this server.", 403)
    user_id = g.user.user_id
    if Expense.query.filter_by(user_id=user_id).first():
        raise ApiError("Demo data can only be loaded into an account with no expenses.", 409)

    categories = {c.category_name: c.category_id for c in Category.query.filter(Category.user_id.is_(None))}
    rng = random.Random(user_id)
    today = date.today()
    created = 0

    for back in range(3, -1, -1):  # three previous months + the current month
        month, year = shift_month(today.month, today.year, -back)
        start, end = month_range(month, year)
        last_day = (today.day if back == 0 else (end - start).days)
        for _ in range(26 if back else max(6, today.day)):
            name, note, low, high = rng.choice(SAMPLES)
            amount = round(rng.randint(low, high), -2)
            db.session.add(Expense(
                user_id=user_id,
                category_id=categories[name],
                amount=Decimal(amount),
                expense_date=date(year, month, rng.randint(1, last_day)),
                note=f"[Demo] {note}",
            ))
            created += 1

        existing = {b.category_id for b in Budget.query.filter_by(user_id=user_id, month=month, year=year)}
        for name, amount in ((None, 600000), ("Food", 150000), ("Transportation", 50000), ("Entertainment", 60000)):
            category_id = categories[name] if name else None
            if category_id not in existing:  # never overwrite a budget the student set
                db.session.add(Budget(user_id=user_id, category_id=category_id,
                                      month=month, year=year, amount=Decimal(amount)))

    db.session.commit()
    return jsonify({"message": f"Loaded {created} demo expenses and sample budgets.", "created": created}), 201


@demo_bp.post("/demo/reset")
@login_required
def reset_data():
    """Delete ALL of the student's expenses, budgets and custom categories."""
    if get_json_body().get("confirm") != "DELETE":
        raise ApiError('Type "DELETE" to confirm.', fields={"confirm": 'Type "DELETE".'})
    user_id = g.user.user_id
    Expense.query.filter_by(user_id=user_id).delete()
    Budget.query.filter_by(user_id=user_id).delete()
    Category.query.filter_by(user_id=user_id).delete()
    db.session.commit()
    return jsonify({"message": "All your expenses, budgets and custom categories were deleted."})
