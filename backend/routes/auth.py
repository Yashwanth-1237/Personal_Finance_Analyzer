"""Registration, login, logout and the current user's profile."""
import hashlib
import re
import secrets
import smtplib
import ssl
import json
import urllib.error
import urllib.request
from datetime import timedelta
from email.message import EmailMessage

from flask import Blueprint, current_app, g, jsonify, session
from werkzeug.security import check_password_hash, generate_password_hash

from models import PasswordReset, User, db, utcnow
from utils import ApiError, get_json_body, login_required

auth_bp = Blueprint("auth", __name__)
RESET_MESSAGE = "If an account exists for that email, a password reset link will be sent shortly."

# PBKDF2-SHA256 with 600,000 iterations (OWASP recommendation); works on every Python build.
HASH_METHOD = "pbkdf2:sha256:600000"

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def validate_name(name):
    name = (name or "").strip()
    if not 2 <= len(name) <= 100:
        raise ApiError("Please enter your full name (2–100 characters).",
                       fields={"full_name": "2–100 characters."})
    return name


def validate_password(password, field="password"):
    password = password or ""
    if len(password) < 8 or not re.search(r"[A-Za-z]", password) or not re.search(r"\d", password):
        raise ApiError("Password must be at least 8 characters and include a letter and a number.",
                       fields={field: "At least 8 characters with a letter and a number."})
    if len(password) > 128:
        raise ApiError("Password is too long.", fields={field: "Maximum 128 characters."})
    return password


def start_session(user):
    session.clear()
    session["user_id"] = user.user_id
    session.permanent = True


def smtp_configured():
    if current_app.config.get("BREVO_API_KEY") and current_app.config.get("SMTP_FROM"):
        return True
    return all(current_app.config.get(k) for k in ("SMTP_HOST", "SMTP_FROM", "SMTP_USERNAME", "SMTP_PASSWORD"))


def send_password_reset_email(email, token):
    message = EmailMessage()
    message["Subject"] = "Reset your Personal Expense Analyzer password"
    message["From"] = current_app.config["SMTP_FROM"]
    message["To"] = email
    reset_url = f"{current_app.config['APP_BASE_URL'].rstrip('/')}/reset-password?token={token}"
    message.set_content(
        "We received a request to reset your Personal Expense Analyzer password.\n\n"
        f"Use this one-time link within 30 minutes:\n{reset_url}\n\n"
        "If you did not request this, you can ignore this email."
    )
    if current_app.config.get("BREVO_API_KEY") and current_app.config.get("SMTP_FROM"):
        request = urllib.request.Request(
            "https://api.brevo.com/v3/smtp/email",
            data=json.dumps({
                "sender": {"email": current_app.config["SMTP_FROM"], "name": "Personal Expense Analyzer"},
                "to": [{"email": email}],
                "subject": message["Subject"],
                "textContent": message.get_content(),
            }).encode("utf-8"),
            headers={"api-key": current_app.config["BREVO_API_KEY"],
                     "content-type": "application/json", "accept": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(request, timeout=15):
            return
    if not smtp_configured():
        # Development only: no SMTP, so print the link on the server console instead of emailing it.
        current_app.logger.warning("DEV password reset link for %s: %s", email, reset_url)
        return
    with smtplib.SMTP(
        current_app.config["SMTP_HOST"],
        current_app.config["SMTP_PORT"],
        timeout=15,
    ) as connection:
        if current_app.config["SMTP_USE_TLS"]:
            connection.starttls(context=ssl.create_default_context())
        connection.login(current_app.config["SMTP_USERNAME"], current_app.config["SMTP_PASSWORD"])
        connection.send_message(message)


@auth_bp.post("/register")
def register():
    data = get_json_body()
    full_name = validate_name(data.get("full_name"))
    email = (data.get("email") or "").strip().lower()
    if not EMAIL_RE.match(email) or len(email) > 255:
        raise ApiError("Please enter a valid email address.", fields={"email": "Invalid email."})
    password = validate_password(data.get("password"))

    if User.query.filter_by(email=email).first():
        raise ApiError("An account with this email already exists.", 409,
                       fields={"email": "Already registered."})

    user = User(full_name=full_name, email=email, password_hash=generate_password_hash(password, method=HASH_METHOD))
    db.session.add(user)
    db.session.commit()
    start_session(user)
    return jsonify({"user": user.to_dict()}), 201


@auth_bp.post("/forgot-password")
def forgot_password():
    if not smtp_configured() and current_app.config["IS_PRODUCTION"]:
        current_app.logger.error("Password reset email is unavailable: SMTP settings are incomplete.")
        raise ApiError("Email service is not configured.", 503)

    data = get_json_body()
    email = (data.get("email") or "").strip().lower()
    if not EMAIL_RE.match(email) or len(email) > 255:
        raise ApiError("Please enter a valid email address.", fields={"email": "Invalid email."})

    user = User.query.filter_by(email=email).first()
    now = utcnow()
    if user is None:
        return jsonify({"message": RESET_MESSAGE})

    recently_sent = PasswordReset.query.filter(
        PasswordReset.user_id == user.user_id,
        PasswordReset.created_at > now - timedelta(minutes=1),
    ).first()
    if recently_sent:
        return jsonify({"message": RESET_MESSAGE})

    token = secrets.token_urlsafe(32)
    reset = PasswordReset(
        user_id=user.user_id,
        token_hash=hashlib.sha256(token.encode("utf-8")).hexdigest(),
        expires_at=now + timedelta(minutes=30),
    )
    PasswordReset.query.filter_by(user_id=user.user_id).delete()
    db.session.add(reset)
    db.session.commit()

    try:
        send_password_reset_email(email, token)
    except (OSError, smtplib.SMTPException, urllib.error.URLError) as exc:
        db.session.delete(reset)
        db.session.commit()
        # Class name only: never log credentials, the token, or the provider's message.
        current_app.logger.error("Could not send password reset email (%s).", type(exc).__name__)
        raise ApiError("Could not send the reset email. Please try again later.", 503)

    return jsonify({"message": RESET_MESSAGE})


@auth_bp.post("/reset-password")
def reset_password():
    data = get_json_body()
    token = data.get("token") or ""
    if not isinstance(token, str) or not token or len(token) > 128:
        raise ApiError("This password reset link is invalid or has expired.", 400)

    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    reset = PasswordReset.query.filter(
        PasswordReset.token_hash == token_hash,
        PasswordReset.expires_at > utcnow(),
    ).first()
    if reset is None:
        raise ApiError("This password reset link is invalid or has expired.", 400)

    new_password = validate_password(data.get("password"))
    user = db.session.get(User, reset.user_id)
    if user is None:
        db.session.delete(reset)
        db.session.commit()
        raise ApiError("This password reset link is invalid or has expired.", 400)

    user.password_hash = generate_password_hash(new_password, method=HASH_METHOD)
    PasswordReset.query.filter_by(user_id=user.user_id).delete()
    db.session.commit()
    session.clear()
    return jsonify({"message": "Password updated. You can now sign in."})


@auth_bp.post("/login")
def login():
    data = get_json_body()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    if not email or not password:
        raise ApiError("Email and password are required.")

    user = User.query.filter_by(email=email).first()
    if user is None or not check_password_hash(user.password_hash, password):
        raise ApiError("Incorrect email or password.", 401)

    start_session(user)
    return jsonify({"user": user.to_dict()})


@auth_bp.post("/logout")
def logout():
    session.clear()
    return jsonify({"message": "Logged out."})


@auth_bp.get("/me")
@login_required
def me():
    return jsonify({"user": g.user.to_dict()})


@auth_bp.put("/me")
@login_required
def update_me():
    data = get_json_body()
    g.user.full_name = validate_name(data.get("full_name"))
    db.session.commit()
    return jsonify({"user": g.user.to_dict()})


@auth_bp.put("/me/password")
@login_required
def change_password():
    data = get_json_body()
    if not check_password_hash(g.user.password_hash, data.get("current_password") or ""):
        raise ApiError("Your current password is incorrect.", 400,
                       fields={"current_password": "Incorrect password."})
    new_password = validate_password(data.get("new_password"), field="new_password")
    g.user.password_hash = generate_password_hash(new_password, method=HASH_METHOD)
    PasswordReset.query.filter_by(user_id=g.user.user_id).delete()
    db.session.commit()
    return jsonify({"message": "Password updated."})
