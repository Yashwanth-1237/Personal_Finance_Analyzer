"""Dashboard summary, category analytics, monthly trend and CSV export."""
import csv
import io
from datetime import date

from flask import Blueprint, Response, g, jsonify, request

from calculations import build_alerts, category_breakdown, monthly_trend, total_spent, usage
from models import Budget, Expense
from utils import ApiError, login_required, month_range, parse_month_year

analytics_bp = Blueprint("analytics", __name__)

MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July",
               "August", "September", "October", "November", "December"]


def build_summary(user_id, month, year):
    spent = total_spent(user_id, month, year)
    overall = Budget.query.filter_by(user_id=user_id, month=month, year=year, category_id=None).first()
    budget_amount = float(overall.amount) if overall else None
    breakdown = category_breakdown(user_id, month, year)

    start, end = month_range(month, year)
    count = Expense.query.filter(
        Expense.user_id == user_id, Expense.expense_date >= start, Expense.expense_date < end
    ).count()

    today = date.today()
    if (year, month) == (today.year, today.month):
        days = today.day
    elif (year, month) < (today.year, today.month):
        days = (end - start).days
    else:
        days = 0

    spending_rows = [row for row in breakdown if row["spent"] > 0]
    top = max(spending_rows, key=lambda r: r["spent"]) if spending_rows else None

    return {
        "month": month,
        "year": year,
        "total_spent": spent,
        "monthly_budget": budget_amount,
        "budget_id": overall.budget_id if overall else None,
        **usage(spent, budget_amount),
        "transaction_count": count,
        "daily_average": round(spent / days, 2) if days else 0,
        "highest_category": (
            {"category_name": top["category_name"], "spent": top["spent"], "share_percent": top["share_percent"]}
            if top else None
        ),
        "alerts": build_alerts(user_id, month, year, breakdown, spent, overall),
        "categories": breakdown,
    }


@analytics_bp.get("/analytics/summary")
@login_required
def summary():
    month, year = parse_month_year()
    data = build_summary(g.user.user_id, month, year)
    start, end = month_range(month, year)
    recent = (
        Expense.query.filter(Expense.user_id == g.user.user_id,
                             Expense.expense_date >= start, Expense.expense_date < end)
        .order_by(Expense.expense_date.desc(), Expense.expense_id.desc())
        .limit(6)
        .all()
    )
    data["recent_transactions"] = [e.to_dict() for e in recent]
    data.pop("categories")
    return jsonify(data)


@analytics_bp.get("/analytics/categories")
@login_required
def categories():
    month, year = parse_month_year()
    return jsonify({"month": month, "year": year,
                    "categories": category_breakdown(g.user.user_id, month, year)})


@analytics_bp.get("/analytics/monthly")
@login_required
def monthly():
    month, year = parse_month_year()
    try:
        months = int(request.args.get("months", 6))
    except ValueError:
        raise ApiError("months must be a number.")
    months = max(1, min(months, 24))
    return jsonify({"months": monthly_trend(g.user.user_id, months, month, year)})


@analytics_bp.get("/reports/export")
@login_required
def export_csv():
    month, year = parse_month_year()
    user_id = g.user.user_id
    data = build_summary(user_id, month, year)
    start, end = month_range(month, year)
    expenses = (
        Expense.query.filter(Expense.user_id == user_id,
                             Expense.expense_date >= start, Expense.expense_date < end)
        .order_by(Expense.expense_date, Expense.expense_id)
        .all()
    )

    def won(value):
        return "" if value is None else int(round(value))

    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow([f"Personal Expense Analyzer — {MONTH_NAMES[month - 1]} {year} report"])
    writer.writerow([f"Student: {g.user.full_name} ({g.user.email})"])
    writer.writerow([])
    writer.writerow(["SUMMARY"])
    writer.writerow(["Total spent (KRW)", won(data["total_spent"])])
    writer.writerow(["Monthly budget (KRW)", won(data["monthly_budget"])])
    writer.writerow(["Remaining budget (KRW)", won(data["remaining"])])
    writer.writerow(["Budget used (%)", "" if data["percent_used"] is None else data["percent_used"]])
    writer.writerow(["Transactions", data["transaction_count"]])
    top = data["highest_category"]
    writer.writerow(["Highest spending category", f"{top['category_name']} ({won(top['spent'])})" if top else ""])
    writer.writerow([])
    writer.writerow(["BUDGET VS ACTUAL BY CATEGORY"])
    writer.writerow(["Category", "Spent (KRW)", "Budget (KRW)", "Remaining (KRW)", "Used (%)", "Share of spending (%)"])
    for row in data["categories"]:
        writer.writerow([row["category_name"], won(row["spent"]), won(row["budget"]), won(row["remaining"]),
                         "" if row["percent_used"] is None else row["percent_used"], row["share_percent"]])
    writer.writerow([])
    writer.writerow(["MONTHLY TREND (LAST 6 MONTHS)"])
    writer.writerow(["Month", "Spent (KRW)", "Budget (KRW)"])
    for item in monthly_trend(user_id, 6, month, year):
        writer.writerow([f"{item['year']}-{item['month']:02d}", won(item["total"]), won(item["budget"])])
    writer.writerow([])
    writer.writerow(["TRANSACTIONS"])
    writer.writerow(["Date", "Category", "Amount (KRW)", "Note"])
    for e in expenses:
        writer.writerow([e.expense_date.isoformat(), e.category.category_name, won(float(e.amount)), e.note or ""])

    filename = f"expense-report-{year}-{month:02d}.csv"
    # The BOM lets Excel open UTF-8 (₩, Korean text) correctly.
    return Response(
        "﻿" + out.getvalue(),
        mimetype="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
