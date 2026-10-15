"""Default and custom categories."""
from flask import Blueprint, g, jsonify

from models import Budget, Category, Expense, db
from utils import ApiError, get_json_body, login_required, visible_categories_query

categories_bp = Blueprint("categories", __name__)


@categories_bp.get("/categories")
@login_required
def list_categories():
    categories = visible_categories_query(g.user.user_id).order_by(Category.category_id).all()
    counts = dict(
        db.session.query(Expense.category_id, db.func.count(Expense.expense_id))
        .filter(Expense.user_id == g.user.user_id)
        .group_by(Expense.category_id)
        .all()
    )
    return jsonify({
        "categories": [
            {**c.to_dict(), "expense_count": counts.get(c.category_id, 0)} for c in categories
        ]
    })


@categories_bp.post("/categories")
@login_required
def create_category():
    name = (get_json_body().get("category_name") or "").strip()
    if not 1 <= len(name) <= 50:
        raise ApiError("Category name must be 1–50 characters.", fields={"category_name": "1–50 characters."})

    duplicate = visible_categories_query(g.user.user_id).filter(
        db.func.lower(Category.category_name) == name.lower()
    ).first()
    if duplicate:
        raise ApiError(f'A category named "{duplicate.category_name}" already exists.', 409,
                       fields={"category_name": "Already exists."})

    category = Category(user_id=g.user.user_id, category_name=name)
    db.session.add(category)
    db.session.commit()
    return jsonify({"category": {**category.to_dict(), "expense_count": 0}}), 201


@categories_bp.delete("/categories/<int:category_id>")
@login_required
def delete_category(category_id):
    """Delete a custom category. Its expenses move to "Other"; its budgets are removed."""
    category = Category.query.filter_by(category_id=category_id, user_id=g.user.user_id).first()
    if category is None:
        raise ApiError("Custom category not found. Default categories cannot be deleted.", 404)

    other = Category.query.filter(Category.user_id.is_(None), Category.category_name == "Other").first()
    moved = Expense.query.filter_by(user_id=g.user.user_id, category_id=category_id).update(
        {"category_id": other.category_id}, synchronize_session=False
    )
    Budget.query.filter_by(user_id=g.user.user_id, category_id=category_id).delete(synchronize_session=False)
    db.session.delete(category)
    db.session.commit()
    return jsonify({"message": "Category deleted.", "moved_expenses": moved})
