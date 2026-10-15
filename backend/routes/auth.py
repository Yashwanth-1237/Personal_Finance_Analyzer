"""Registration, login, logout and the current user's profile."""
import re

from flask import Blueprint, g, jsonify, session
from werkzeug.security import check_password_hash, generate_password_hash

from models import User, db
from utils import ApiError, get_json_body, login_required

auth_bp = Blueprint("auth", __name__)

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
    db.session.commit()
    return jsonify({"message": "Password updated."})
