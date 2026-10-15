from routes.analytics import analytics_bp
from routes.auth import auth_bp
from routes.budgets import budgets_bp
from routes.categories import categories_bp
from routes.demo import demo_bp
from routes.expenses import expenses_bp

ALL_BLUEPRINTS = [auth_bp, expenses_bp, categories_bp, budgets_bp, analytics_bp, demo_bp]
