"""Small helpers shared by the route modules."""
from datetime import date
from decimal import Decimal, InvalidOperation
from functools import wraps

from flask import g, jsonify, request, session

from models import Category, User, db

MAX_AMOUNT = Decimal("100000000")  # ₩100,000,000 upper limit per record


class ApiError(Exception):
    """Raise inside a route to return {"error": message} with a status code."""

    def __init__(self, message, status=400, fields=None):
        super().__init__(message)
        self.message = message
        self.status = status
        self.fields = fields or {}


def error_response(message, status=400, fields=None):
    body = {"error": message}
    if fields:
        body["fields"] = fields
    return jsonify(body), status


def login_required(view):
    """Reject the request with 401 unless a valid user is in the session."""

    @wraps(view)
    def wrapper(*args, **kwargs):
        user_id = session.get("user_id")
        user = db.session.get(User, user_id) if user_id else None
        if user is None:
            session.clear()
            return error_response("Please log in to continue.", 401)
        g.user = user
        return view(*args, **kwargs)

    return wrapper


def get_json_body():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ApiError("Request body must be a JSON object.")
    return data


def format_won(value):
    return f"₩{int(round(float(value))):,}"


def parse_amount(value, field="amount"):
    try:
        amount = Decimal(str(value).replace(",", "").strip())
    except (InvalidOperation, AttributeError):
        raise ApiError("Amount must be a number.", fields={field: "Enter a valid number."})
    if not amount.is_finite() or amount <= 0:
        raise ApiError("Amount must be greater than 0.", fields={field: "Must be greater than 0."})
    if amount > MAX_AMOUNT:
        raise ApiError("Amount is too large.", fields={field: "Maximum is ₩100,000,000."})
    return amount.quantize(Decimal("0.01"))


def parse_date(value, field="expense_date"):
    try:
        return date.fromisoformat(str(value))
    except (TypeError, ValueError):
        raise ApiError("Date must be in YYYY-MM-DD format.", fields={field: "Enter a valid date."})


def parse_month_year(source=None):
    """Read ?month=&year= (or a dict). Defaults to the current month."""
    source = source if source is not None else request.args
    today = date.today()
    try:
        month = int(source.get("month", today.month))
        year = int(source.get("year", today.year))
    except (TypeError, ValueError):
        raise ApiError("Month and year must be numbers.")
    if not 1 <= month <= 12:
        raise ApiError("Month must be between 1 and 12.", fields={"month": "1–12"})
    if not 2000 <= year <= 2100:
        raise ApiError("Year must be between 2000 and 2100.", fields={"year": "2000–2100"})
    return month, year


def month_range(month, year):
    """Return (first day of month, first day of next month)."""
    start = date(year, month, 1)
    end = date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1)
    return start, end


def shift_month(month, year, delta):
    index = year * 12 + (month - 1) + delta
    return index % 12 + 1, index // 12


def visible_categories_query(user_id):
    """Default categories plus the user's own custom ones."""
    return Category.query.filter(
        db.or_(Category.user_id.is_(None), Category.user_id == user_id)
    )


def get_user_category(category_id, user_id):
    """Return a category the user may use, or raise 400."""
    try:
        category_id = int(category_id)
    except (TypeError, ValueError):
        raise ApiError("Please choose a category.", fields={"category_id": "Required."})
    category = visible_categories_query(user_id).filter(Category.category_id == category_id).first()
    if category is None:
        raise ApiError("Category not found.", fields={"category_id": "Invalid category."})
    return category
