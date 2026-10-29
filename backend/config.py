"""Application settings, read from environment variables (.env file)."""
import os
from datetime import timedelta
from urllib.parse import quote_plus

from dotenv import load_dotenv

# Look for .env in the project root first, then in backend/
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, "..", ".env"))
load_dotenv(os.path.join(BASE_DIR, ".env"))


def _mysql_url():
    user = os.getenv("MYSQL_USER") or os.getenv("MYSQLUSER", "root")
    password = quote_plus(os.getenv("MYSQL_PASSWORD") or os.getenv("MYSQLPASSWORD", ""))
    host = os.getenv("MYSQL_HOST") or os.getenv("MYSQLHOST", "localhost")
    port = os.getenv("MYSQL_PORT") or os.getenv("MYSQLPORT", "3306")
    name = os.getenv("MYSQL_DATABASE") or os.getenv("MYSQLDATABASE", "expense_analyzer")
    return f"mysql+pymysql://{quote_plus(user)}:{password}@{host}:{port}/{quote_plus(name)}?charset=utf8mb4"


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-change-me")

    # Railway marks deployed services with RAILWAY_ENVIRONMENT.
    if os.getenv("RAILWAY_ENVIRONMENT") and SECRET_KEY == "dev-only-change-me":
        raise RuntimeError("Set a unique SECRET_KEY before deploying.")

    # Hosted PostgreSQL providers may supply either legacy postgres:// or
    # standard postgresql:// URLs. Pin SQLAlchemy to the psycopg 3 driver.
    database_url = os.getenv("DATABASE_URL")
    if database_url and database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql+psycopg://", 1)
    elif database_url and database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+psycopg://", 1)

    # DATABASE_URL overrides MYSQL_* settings (used by tests and hosted databases).
    SQLALCHEMY_DATABASE_URI = database_url or _mysql_url()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True, "pool_recycle": 280}

    # Session cookie: HttpOnly so JavaScript cannot read it.
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = os.getenv(
        "SESSION_COOKIE_SECURE", "true" if os.getenv("RAILWAY_ENVIRONMENT") else "false"
    ).lower() == "true"
    PERMANENT_SESSION_LIFETIME = timedelta(days=7)

    # Lets the "Load demo data" button in Settings work. Set to false to disable.
    ENABLE_DEMO_SEED = os.getenv("ENABLE_DEMO_SEED", "true").lower() == "true"
