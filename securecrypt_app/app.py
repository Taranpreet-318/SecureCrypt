"""
SecureCrypt — backend server
-------------------------------------------------
Flask app providing:
  - Signup / login / logout with hashed passwords (session-based auth)
  - A protected dashboard page showing account + activity stats
  - A protected encrypt/decrypt page (actual file crypto happens
    client-side in the browser via the Web Crypto API — files are
    never uploaded to this server, only a log entry describing the
    action is recorded: filename + "encrypt"/"decrypt" + timestamp)

Database: PostgreSQL (via psycopg2), configured through the
DATABASE_URL environment variable. Works with any Postgres
provider — this project is set up for Supabase, but Render
Postgres, Neon, ElephantSQL, or a local instance all work the
same way since only the connection string changes.

Run locally:
    pip install -r requirements.txt
    export DATABASE_URL=postgresql://user:password@localhost:5432/securecrypt
    python app.py
Then open http://127.0.0.1:5000

Deploy: see DEPLOY.md in this project for step-by-step instructions
covering GitHub -> Supabase (database) -> Render (hosting).

NOTE: This is a demo-grade auth implementation suitable for learning
and prototyping. Before using in production, add HTTPS, CSRF
protection, rate limiting on auth endpoints, stronger session
config, and set SECRET_KEY from a real secret (e.g. environment
variable), not the fallback below.
"""

import os
import re
from datetime import datetime, timezone
from functools import wraps

from dotenv import load_dotenv
load_dotenv()  # loads variables from a local .env file if present (no-op on Render, which sets env vars directly)

import psycopg2
import psycopg2.extras
from flask import Flask, g, jsonify, redirect, render_template, request, session, url_for
from werkzeug.security import check_password_hash, generate_password_hash

# ---------------------------------------------------------------
# Database URL
# ---------------------------------------------------------------
# Render (and most providers) inject DATABASE_URL automatically once
# a Postgres instance is linked to the web service. Some providers
# hand out a URL starting with "postgres://" — psycopg2 accepts that
# form directly, so no rewriting is needed.
DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:secure123@localhost:5432/securecrypt"
)

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev-secret-change-me")


# ---------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------
def get_db():
    if "db" not in g:
        g.db = psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)
    return g.db


@app.teardown_appcontext
def close_db(exception=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS activity_log (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users (id),
            filename TEXT NOT NULL,
            action TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS auth_log (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users (id),
            username TEXT NOT NULL,
            event TEXT NOT NULL,
            ip_address TEXT,
            created_at TIMESTAMPTZ NOT NULL
        )
        """
    )
    conn.commit()
    cur.close()
    conn.close()


# Ensure tables exist whenever this module is loaded — this covers both
# `python app.py` (local dev) and `gunicorn app:app` (Render/production),
# since gunicorn never runs the `if __name__ == "__main__"` block below.
# CREATE TABLE IF NOT EXISTS makes this safe to run on every startup,
# including every time a new gunicorn worker boots.
init_db()


def now():
    return datetime.now(timezone.utc)


def log_auth_event(user_id, username, event):
    """event: 'signup' | 'login_success' | 'login_failed' | 'logout'"""
    db = get_db()
    cur = db.cursor()
    cur.execute(
        "INSERT INTO auth_log (user_id, username, event, ip_address, created_at) VALUES (%s, %s, %s, %s, %s)",
        (user_id, username, event, request.remote_addr, now()),
    )
    db.commit()
    cur.close()


# ---------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not session.get("user_id"):
            if request.path.startswith("/api/"):
                return jsonify({"error": "Not authenticated"}), 401
            return redirect(url_for("login_page"))
        return view(*args, **kwargs)

    return wrapped


def current_user():
    if not session.get("user_id"):
        return None
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT * FROM users WHERE id = %s", (session["user_id"],))
    user = cur.fetchone()
    cur.close()
    return user


# ---------------------------------------------------------------
# Page routes
# ---------------------------------------------------------------
@app.route("/")
def index():
    return render_template("index.html", user=current_user())


@app.route("/login")
def login_page():
    if session.get("user_id"):
        return redirect(url_for("dashboard_page"))
    return render_template("login.html")


@app.route("/signup")
def signup_page():
    if session.get("user_id"):
        return redirect(url_for("dashboard_page"))
    return render_template("signup.html")


@app.route("/dashboard")
@login_required
def dashboard_page():
    return render_template("dashboard.html", user=current_user())


@app.route("/encrypt-decrypt")
@login_required
def encrypt_decrypt_page():
    return render_template("encrypt_decrypt.html", user=current_user())


# ---------------------------------------------------------------
# Auth API
# ---------------------------------------------------------------
@app.route("/api/signup", methods=["POST"])
def api_signup():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not username or not email or not password:
        return jsonify({"error": "All fields are required."}), 400
    if len(username) < 3:
        return jsonify({"error": "Username must be at least 3 characters."}), 400
    if not EMAIL_RE.match(email):
        return jsonify({"error": "Enter a valid email address."}), 400
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters."}), 400

    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT id FROM users WHERE username = %s OR email = %s", (username, email))
    existing = cur.fetchone()
    if existing:
        cur.close()
        return jsonify({"error": "Username or email is already taken."}), 409

    password_hash = generate_password_hash(password)
    cur.execute(
        "INSERT INTO users (username, email, password_hash, created_at) VALUES (%s, %s, %s, %s) RETURNING id",
        (username, email, password_hash, now()),
    )
    new_id = cur.fetchone()["id"]
    db.commit()
    cur.close()

    session["user_id"] = new_id
    session["username"] = username
    log_auth_event(new_id, username, "signup")
    return jsonify({"success": True, "redirect": url_for("dashboard_page")})


@app.route("/api/login", methods=["POST"])
def api_login():
    data = request.get_json(silent=True) or {}
    identifier = (data.get("username") or "").strip()
    password = data.get("password") or ""

    if not identifier or not password:
        return jsonify({"error": "Enter your username/email and password."}), 400

    db = get_db()
    cur = db.cursor()
    cur.execute(
        "SELECT * FROM users WHERE username = %s OR email = %s", (identifier, identifier.lower())
    )
    user = cur.fetchone()
    cur.close()

    if not user or not check_password_hash(user["password_hash"], password):
        log_auth_event(user["id"] if user else None, identifier, "login_failed")
        return jsonify({"error": "Incorrect username/email or password."}), 401

    session["user_id"] = user["id"]
    session["username"] = user["username"]
    log_auth_event(user["id"], user["username"], "login_success")
    return jsonify({"success": True, "redirect": url_for("dashboard_page")})


@app.route("/api/logout", methods=["POST"])
def api_logout():
    if session.get("user_id"):
        log_auth_event(session["user_id"], session.get("username", ""), "logout")
    session.clear()
    return jsonify({"success": True, "redirect": url_for("login_page")})


# ---------------------------------------------------------------
# Activity log API (used by the encrypt/decrypt + dashboard pages)
# ---------------------------------------------------------------
@app.route("/api/log", methods=["POST"])
@login_required
def api_add_log():
    data = request.get_json(silent=True) or {}
    filename = (data.get("filename") or "").strip()
    action = (data.get("action") or "").strip().lower()

    if not filename or action not in ("encrypt", "decrypt"):
        return jsonify({"error": "Invalid log entry."}), 400

    db = get_db()
    cur = db.cursor()
    cur.execute(
        "INSERT INTO activity_log (user_id, filename, action, created_at) VALUES (%s, %s, %s, %s)",
        (session["user_id"], filename, action, now()),
    )
    db.commit()
    cur.close()
    return jsonify({"success": True})


@app.route("/api/logs")
@login_required
def api_get_logs():
    db = get_db()
    cur = db.cursor()
    cur.execute(
        "SELECT filename, action, created_at FROM activity_log "
        "WHERE user_id = %s ORDER BY id DESC LIMIT 25",
        (session["user_id"],),
    )
    rows = cur.fetchall()
    cur.close()
    return jsonify({"logs": [_serialize(r) for r in rows]})


@app.route("/api/auth-logs")
@login_required
def api_get_auth_logs():
    db = get_db()
    cur = db.cursor()
    cur.execute(
        "SELECT event, ip_address, created_at FROM auth_log "
        "WHERE user_id = %s ORDER BY id DESC LIMIT 25",
        (session["user_id"],),
    )
    rows = cur.fetchall()
    cur.close()
    return jsonify({"logs": [_serialize(r) for r in rows]})


@app.route("/api/stats")
@login_required
def api_get_stats():
    db = get_db()
    cur = db.cursor()
    user_id = session["user_id"]
    cur.execute(
        "SELECT COUNT(*) AS c FROM activity_log WHERE user_id = %s AND action = 'encrypt'",
        (user_id,),
    )
    encrypted = cur.fetchone()["c"]
    cur.execute(
        "SELECT COUNT(*) AS c FROM activity_log WHERE user_id = %s AND action = 'decrypt'",
        (user_id,),
    )
    decrypted = cur.fetchone()["c"]
    cur.close()
    return jsonify({"encrypted": encrypted, "decrypted": decrypted, "total": encrypted + decrypted})


def _serialize(row):
    """Convert a RealDictRow to a plain dict with JSON-safe values (datetimes -> ISO strings)."""
    out = dict(row)
    for k, v in out.items():
        if isinstance(v, datetime):
            out[k] = v.isoformat()
    return out


# ---------------------------------------------------------------
# Health check (useful for Render / uptime monitors)
# ---------------------------------------------------------------
@app.route("/healthz")
def healthz():
    try:
        db = get_db()
        cur = db.cursor()
        cur.execute("SELECT 1")
        cur.close()
        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"status": "error", "detail": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True)
