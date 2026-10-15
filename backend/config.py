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
    user = os.getenv("MYSQL_USER", "root")
    password = quote_plus(os.getenv("MYSQL_PASSWORD", ""))
    host = os.getenv("MYSQL_HOST", "localhost")
    port = os.getenv("MYSQL_PORT", "3306")
    name = os.getenv("MYSQL_DATABASE", "expense_analyzer")
    return f"mysql+pymysql://{user}:{password}@{host}:{port}/{name}?charset=utf8mb4"


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-change-me")

    # DATABASE_URL overrides the MYSQL_* settings (used by the automated tests).
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL") or _mysql_url()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True, "pool_recycle": 280}

    # Session cookie: HttpOnly so JavaScript cannot read it.
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", "false").lower() == "true"
    PERMANENT_SESSION_LIFETIME = timedelta(days=7)

    # Lets the "Load demo data" button in Settings work. Set to false to disable.
    ENABLE_DEMO_SEED = os.getenv("ENABLE_DEMO_SEED", "true").lower() == "true"
