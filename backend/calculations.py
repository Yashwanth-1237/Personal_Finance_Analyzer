"""Budget and spending calculations. Everything is computed from database rows."""
from sqlalchemy import func

from models import Budget, Category, Expense, db
from utils import format_won, month_range, shift_month, visible_categories_query

WARNING_THRESHOLD = 80  # percent of a budget that triggers a "close to limit" alert


def total_spent(user_id, month, year):
    start, end = month_range(month, year)
    value = (
        db.session.query(func.coalesce(func.sum(Expense.amount), 0))
        .filter(Expense.user_id == user_id, Expense.expense_date >= start, Expense.expense_date < end)
        .scalar()
    )
    return float(value or 0)


def spending_by_category(user_id, month, year):
    """{category_id: total} for the month."""
    start, end = month_range(month, year)
    rows = (
        db.session.query(Expense.category_id, func.sum(Expense.amount), func.count(Expense.expense_id))
        .filter(Expense.user_id == user_id, Expense.expense_date >= start, Expense.expense_date < end)
        .group_by(Expense.category_id)
        .all()
    )
    return {cid: {"total": float(total or 0), "count": count} for cid, total, count in rows}


def budgets_for_month(user_id, month, year):
    return Budget.query.filter_by(user_id=user_id, month=month, year=year).all()


def usage(spent, budget_amount):
    """Remaining money, percentage used and a status label."""
    if not budget_amount:
        return {"remaining": None, "percent_used": None, "status": "no_budget"}
    percent = round(spent / budget_amount * 100, 1)
    if spent > budget_amount:
        status = "over"
    elif percent >= WARNING_THRESHOLD:
        status = "warning"
    else:
        status = "ok"
    return {"remaining": round(budget_amount - spent, 2), "percent_used": percent, "status": status}


def category_breakdown(user_id, month, year):
    """One row per category that has spending or a budget this month."""
    spending = spending_by_category(user_id, month, year)
    budgets = {b.category_id: b for b in budgets_for_month(user_id, month, year) if b.category_id}
    month_total = sum(item["total"] for item in spending.values())

    rows = []
    for category in visible_categories_query(user_id).order_by(Category.category_id).all():
        cid = category.category_id
        spent = spending.get(cid, {}).get("total", 0.0)
        budget = budgets.get(cid)
        if not spent and budget is None:
            continue
        budget_amount = float(budget.amount) if budget else None
        rows.append({
            "category_id": cid,
            "category_name": category.category_name,
            "spent": spent,
            "transaction_count": spending.get(cid, {}).get("count", 0),
            "share_percent": round(spent / month_total * 100, 1) if month_total else 0,
            "budget_id": budget.budget_id if budget else None,
            "budget": budget_amount,
            **usage(spent, budget_amount),
        })
    return rows


def build_alerts(user_id, month, year, breakdown=None, spent=None, overall=None):
    """Overspending and near-limit warnings for the month."""
    breakdown = breakdown if breakdown is not None else category_breakdown(user_id, month, year)
    spent = spent if spent is not None else total_spent(user_id, month, year)
    if overall is None:
        overall = Budget.query.filter_by(user_id=user_id, month=month, year=year, category_id=None).first()

    alerts = []
    if overall:
        budget_amount = float(overall.amount)
        info = usage(spent, budget_amount)
        if info["status"] == "over":
            alerts.append({
                "level": "danger",
                "category_name": None,
                "message": f"Warning: Your monthly budget has been exceeded by {format_won(spent - budget_amount)}.",
            })
        elif info["status"] == "warning":
            alerts.append({
                "level": "warning",
                "category_name": None,
                "message": f"You have used {info['percent_used']}% of your monthly budget. "
                           f"{format_won(budget_amount - spent)} left.",
            })

    for row in breakdown:
        if row["status"] == "over":
            alerts.append({
                "level": "danger",
                "category_name": row["category_name"],
                "message": f"Warning: Your {row['category_name']} budget has been exceeded by "
                           f"{format_won(row['spent'] - row['budget'])}.",
            })
        elif row["status"] == "warning":
            alerts.append({
                "level": "warning",
                "category_name": row["category_name"],
                "message": f"You have used {row['percent_used']}% of your {row['category_name']} budget.",
            })
    return alerts


def monthly_trend(user_id, months, end_month, end_year):
    """Totals and overall budgets for the `months` months ending at end_month/end_year."""
    first_month, first_year = shift_month(end_month, end_year, -(months - 1))
    start, _ = month_range(first_month, first_year)
    _, end = month_range(end_month, end_year)

    totals = {}
    for expense_date, amount in (
        db.session.query(Expense.expense_date, Expense.amount)
        .filter(Expense.user_id == user_id, Expense.expense_date >= start, Expense.expense_date < end)
        .all()
    ):
        key = (expense_date.year, expense_date.month)
        totals[key] = totals.get(key, 0.0) + float(amount)

    budgets = {
        (b.year, b.month): float(b.amount)
        for b in Budget.query.filter(Budget.user_id == user_id, Budget.category_id.is_(None)).all()
    }

    result = []
    for offset in range(months):
        month, year = shift_month(first_month, first_year, offset)
        result.append({
            "month": month,
            "year": year,
            "total": round(totals.get((year, month), 0.0), 2),
            "budget": budgets.get((year, month)),
        })
    return result
