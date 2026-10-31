"""SQLAlchemy models. They mirror database/schema.sql."""
from datetime import datetime, timezone

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.dialects.mysql import INTEGER as MySQLInteger

db = SQLAlchemy()
MYSQL_ID_TYPE = db.Integer().with_variant(MySQLInteger(unsigned=True), "mysql")


def utcnow():
    """Current UTC time without tzinfo (MySQL DATETIME has no time zone)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)

DEFAULT_CATEGORIES = [
    "Food",
    "Transportation",
    "Shopping",
    "Study",
    "Entertainment",
    "Housing",
    "Other",
]


class User(db.Model):
    __tablename__ = "users"

    user_id = db.Column(MYSQL_ID_TYPE, primary_key=True)
    full_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(255), nullable=False, unique=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    def to_dict(self):
        return {
            "user_id": self.user_id,
            "full_name": self.full_name,
            "email": self.email,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class PasswordReset(db.Model):
    __tablename__ = "password_resets"

    reset_id = db.Column(MYSQL_ID_TYPE, primary_key=True)
    user_id = db.Column(MYSQL_ID_TYPE, db.ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = db.Column(db.String(64), nullable=False, unique=True)
    expires_at = db.Column(db.DateTime, nullable=False, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)


class Category(db.Model):
    __tablename__ = "categories"
    __table_args__ = (db.UniqueConstraint("user_id", "category_name", name="uq_categories_user_name"),)

    category_id = db.Column(MYSQL_ID_TYPE, primary_key=True)
    user_id = db.Column(MYSQL_ID_TYPE, db.ForeignKey("users.user_id", ondelete="CASCADE"), nullable=True)
    category_name = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    def to_dict(self):
        return {
            "category_id": self.category_id,
            "category_name": self.category_name,
            "is_default": self.user_id is None,
        }


class Expense(db.Model):
    __tablename__ = "expenses"
    __table_args__ = (
        db.CheckConstraint("amount > 0", name="chk_expenses_amount"),
        db.Index("idx_expenses_user_date", "user_id", "expense_date"),
    )

    expense_id = db.Column(MYSQL_ID_TYPE, primary_key=True)
    user_id = db.Column(MYSQL_ID_TYPE, db.ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    category_id = db.Column(MYSQL_ID_TYPE, db.ForeignKey("categories.category_id", ondelete="CASCADE"), nullable=False, index=True)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    expense_date = db.Column(db.Date, nullable=False)
    note = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=utcnow, onupdate=utcnow)

    category = db.relationship("Category")
    receipt = db.relationship(
        "ExpenseReceipt",
        back_populates="expense",
        uselist=False,
        cascade="all, delete-orphan",
    )

    def to_dict(self):
        return {
            "expense_id": self.expense_id,
            "category_id": self.category_id,
            "category_name": self.category.category_name if self.category else None,
            "amount": float(self.amount),
            "expense_date": self.expense_date.isoformat(),
            "note": self.note or "",
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class ExpenseReceipt(db.Model):
    __tablename__ = "expense_receipts"

    expense_id = db.Column(
        MYSQL_ID_TYPE,
        db.ForeignKey("expenses.expense_id", ondelete="CASCADE"),
        primary_key=True,
    )
    image_data = db.Column(db.LargeBinary, nullable=False)
    content_type = db.Column(db.String(32), nullable=False)
    uploaded_at = db.Column(db.DateTime, nullable=False, default=utcnow)
    expense = db.relationship("Expense", back_populates="receipt")


class Budget(db.Model):
    __tablename__ = "budgets"
    __table_args__ = (
        db.CheckConstraint("month BETWEEN 1 AND 12", name="chk_budgets_month"),
        db.CheckConstraint("amount > 0", name="chk_budgets_amount"),
        db.Index("idx_budgets_user_period", "user_id", "year", "month"),
    )

    budget_id = db.Column(MYSQL_ID_TYPE, primary_key=True)
    user_id = db.Column(MYSQL_ID_TYPE, db.ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    category_id = db.Column(MYSQL_ID_TYPE, db.ForeignKey("categories.category_id", ondelete="CASCADE"), nullable=True)
    month = db.Column(db.Integer, nullable=False)
    year = db.Column(db.Integer, nullable=False)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    category = db.relationship("Category")

    def to_dict(self):
        return {
            "budget_id": self.budget_id,
            "category_id": self.category_id,
            "category_name": self.category.category_name if self.category else None,
            "month": self.month,
            "year": self.year,
            "amount": float(self.amount),
        }


def ensure_default_categories():
    """Insert any missing system categories (user_id = NULL)."""
    existing = {
        c.category_name
        for c in Category.query.filter(Category.user_id.is_(None)).all()
    }
    for name in DEFAULT_CATEGORIES:
        if name not in existing:
            db.session.add(Category(user_id=None, category_name=name))
    db.session.commit()
