"""CRUD for expenses. A student can only see and change their own rows."""
from datetime import date, timedelta

from flask import Blueprint, g, jsonify, request

from models import Category, Expense, db
from utils import ApiError, get_json_body, get_user_category, login_required, parse_amount, parse_date

expenses_bp = Blueprint("expenses", __name__)


def find_own_expense(expense_id):
    expense = Expense.query.filter_by(expense_id=expense_id, user_id=g.user.user_id).first()
    if expense is None:
        raise ApiError("Expense not found.", 404)
    return expense


def apply_fields(expense, data):
    """Validate the request body and copy it onto the expense."""
    errors = {}
    values = {}
    for field, parser in (
        ("amount", parse_amount),
        ("expense_date", parse_date),
        ("category_id", lambda v: get_user_category(v, g.user.user_id)),
    ):
        try:
            values[field] = parser(data.get(field))
        except ApiError as exc:
            errors.update(exc.fields or {field: exc.message})

    note = (data.get("note") or "").strip()
    if len(note) > 255:
        errors["note"] = "Maximum 255 characters."
    if "expense_date" in values and values["expense_date"] > date.today() + timedelta(days=365):
        errors["expense_date"] = "Date is too far in the future."
    if errors:
        raise ApiError("Please fix the highlighted fields.", fields=errors)

    expense.amount = values["amount"]
    expense.expense_date = values["expense_date"]
    expense.category_id = values["category_id"].category_id
    expense.note = note or None


@expenses_bp.get("/expenses")
@login_required
def list_expenses():
    query = Expense.query.filter(Expense.user_id == g.user.user_id)

    start = request.args.get("start_date")
    end = request.args.get("end_date")
    start = parse_date(start, "start_date") if start else None
    end = parse_date(end, "end_date") if end else None
    if start and end and start > end:
        raise ApiError("The start date must be on or before the end date.", fields={"start_date": "After end date."})
    if start:
        query = query.filter(Expense.expense_date >= start)
    if end:
        query = query.filter(Expense.expense_date <= end)

    category_id = request.args.get("category_id")
    if category_id:
        query = query.filter(Expense.category_id == get_user_category(category_id, g.user.user_id).category_id)

    search = (request.args.get("search") or "").strip()
    if search:
        # Escape LIKE wildcards so "%" and "_" are searched literally
        escaped = search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        like = f"%{escaped}%"
        query = query.join(Category).filter(db.or_(Expense.note.ilike(like, escape="\\"),
                                                   Category.category_name.ilike(like, escape="\\")))

    query = query.order_by(Expense.expense_date.desc(), Expense.expense_id.desc())
    try:
        limit = int(request.args.get("limit", 0))
    except ValueError:
        limit = 0
    if limit > 0:
        query = query.limit(min(limit, 500))

    expenses = query.all()
    return jsonify({
        "expenses": [e.to_dict() for e in expenses],
        "count": len(expenses),
        "total": round(sum(float(e.amount) for e in expenses), 2),
    })


@expenses_bp.post("/expenses")
@login_required
def create_expense():
    expense = Expense(user_id=g.user.user_id)
    apply_fields(expense, get_json_body())
    db.session.add(expense)
    db.session.commit()
    return jsonify({"expense": expense.to_dict()}), 201


@expenses_bp.get("/expenses/<int:expense_id>")
@login_required
def get_expense(expense_id):
    return jsonify({"expense": find_own_expense(expense_id).to_dict()})


@expenses_bp.put("/expenses/<int:expense_id>")
@login_required
def update_expense(expense_id):
    expense = find_own_expense(expense_id)
    apply_fields(expense, get_json_body())
    db.session.commit()
    return jsonify({"expense": expense.to_dict()})


@expenses_bp.delete("/expenses/<int:expense_id>")
@login_required
def delete_expense(expense_id):
    expense = find_own_expense(expense_id)
    db.session.delete(expense)
    db.session.commit()
    return jsonify({"message": "Expense deleted."})
