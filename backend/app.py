"""Flask entry point.  Run with:  python app.py   (http://localhost:5001)"""
import logging
import os

from flask import Flask, abort, jsonify
from sqlalchemy.exc import IntegrityError, OperationalError
from werkzeug.exceptions import HTTPException

from config import Config
from models import db, ensure_default_categories
from routes import ALL_BLUEPRINTS
from utils import ApiError, error_response


def create_app(config_object=Config):
    static_folder = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))
    if not os.path.isdir(static_folder):
        static_folder = None

    app = Flask(
        __name__,
        static_folder=static_folder,
        static_url_path="" if static_folder else None,
    )
    app.config.from_object(config_object)
    db.init_app(app)

    for blueprint in ALL_BLUEPRINTS:
        app.register_blueprint(blueprint, url_prefix="/api")

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok"})

    if static_folder:
        @app.get("/")
        def index():
            return app.send_static_file("index.html")

        @app.get("/<path:path>")
        def frontend_route(path):
            if path.startswith("api/"):
                abort(404)
            return app.send_static_file("index.html")

    @app.errorhandler(ApiError)
    def handle_api_error(exc):
        db.session.rollback()
        return error_response(exc.message, exc.status, exc.fields)

    @app.errorhandler(HTTPException)
    def handle_http_error(exc):
        return error_response(exc.description, exc.code)

    @app.errorhandler(IntegrityError)
    def handle_conflict(exc):
        # e.g. two identical requests at the same moment hit a UNIQUE key
        db.session.rollback()
        return error_response("That record already exists or conflicts with existing data.", 409)

    @app.errorhandler(OperationalError)
    def handle_db_down(exc):
        db.session.rollback()
        app.logger.error("Database error: %s", exc)
        return error_response("Cannot reach the database. Is MySQL running?", 503)

    @app.errorhandler(Exception)
    def handle_unexpected(exc):
        db.session.rollback()
        app.logger.exception("Unexpected error")
        return error_response("Something went wrong on the server.", 500)

    with app.app_context():
        try:
            # Creates any missing tables (schema.sql is the recommended way) and default categories.
            db.create_all()
            ensure_default_categories()
        except OperationalError as exc:
            logging.getLogger(__name__).error(
                "Could not connect to the database. Check MySQL is running and your .env settings.\n%s", exc
            )
            raise SystemExit(1)

    return app


app = create_app()


if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=int(os.getenv("FLASK_PORT", "5001")),
        debug=os.getenv("FLASK_DEBUG", "false").lower() == "true",
    )
