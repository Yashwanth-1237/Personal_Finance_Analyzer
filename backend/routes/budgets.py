"""Overall monthly budgets and per-category budgets."""
from flask import Blueprint, g, jsonify

from calculations import category_breakdown, total_spent, usage
from models import Budget, db
from utils import (ApiError, get_json_body, get_user_category, login_required, parse_amount,
                   parse_month_year, shift_month)

budgets_bp = Blueprint("budgets", __name__)


def find_own_budget(budget_id):
    budget = Budget.query.filter_by(budget_id=budget_id, user_id=g.user.user_id).first()
    if budget is None:
        raise ApiError("Budget not found.", 404)
    return budget


@budgets_bp.get("/budgets")
@login_required
def list_budgets():
    month, year = parse_month_year()
    user_id = g.user.user_id
    overall = Budget.query.filter_by(user_id=user_id, month=month, year=year, category_id=None).first()
    spent = total_spent(user_id, month, year)
    overall_amount = float(overall.amount) if overall else None

    breakdown = category_breakdown(user_id, month, year)
    category_budgets = [row for row in breakdown if row["budget_id"]]
    allocated = sum(row["budget"] for row in category_budgets)

    return jsonify({
        "month": month,
        "year": year,
        "overall": {
            "budget_id": overall.budget_id if overall else None,
            "amount": overall_amount,
            "spent": spent,
            **usage(spent, overall_amount),
        },
        "categories": category_budgets,
        "allocated_to_categories": allocated,
    })


@budgets_bp.post("/budgets")
@login_required
def create_budget():
    """Create a budget. If one already exists for that month/category it is updated instead."""
    data = get_json_body()
    month, year = parse_month_year(data)
    amount = parse_amount(data.get("amount"))
    category_id = data.get("category_id")
    category_id = get_user_category(category_id, g.user.user_id).category_id if category_id else None

    budget = Budget.query.filter_by(
        user_id=g.user.user_id, month=month, year=year, category_id=category_id
    ).first()
    status = 200
    if budget is None:
        budget = Budget(user_id=g.user.user_id, month=month, year=year, category_id=category_id)
        db.session.add(budget)
        status = 201
    budget.amount = amount
    db.session.commit()
    return jsonify({"budget": budget.to_dict()}), status


@budgets_bp.put("/budgets/<int:budget_id>")
@login_required
def update_budget(budget_id):
    budget = find_own_budget(budget_id)
    budget.amount = parse_amount(get_json_body().get("amount"))
    db.session.commit()
    return jsonify({"budget": budget.to_dict()})


@budgets_bp.delete("/budgets/<int:budget_id>")
@login_required
def delete_budget(budget_id):
    db.session.delete(find_own_budget(budget_id))
    db.session.commit()
    return jsonify({"message": "Budget removed."})


@budgets_bp.post("/budgets/copy-previous")
@login_required
def copy_previous():
    """Copy last month's budgets into the given month (existing ones are kept)."""
    month, year = parse_month_year(get_json_body())
    prev_month, prev_year = shift_month(month, year, -1)
    previous = Budget.query.filter_by(user_id=g.user.user_id, month=prev_month, year=prev_year).all()
    if not previous:
        raise ApiError("There are no budgets in the previous month to copy.", 404)

    existing = {
        b.category_id
        for b in Budget.query.filter_by(user_id=g.user.user_id, month=month, year=year).all()
    }
    copied = 0
    for old in previous:
        if old.category_id not in existing:
            db.session.add(Budget(user_id=g.user.user_id, category_id=old.category_id,
                                  month=month, year=year, amount=old.amount))
            copied += 1
    db.session.commit()
    return jsonify({"message": f"Copied {copied} budget(s).", "copied": copied})
