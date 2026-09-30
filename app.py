import os
import re
import sqlite3
from contextlib import closing

from flask import Flask, jsonify, render_template, request, session
from werkzeug.security import check_password_hash, generate_password_hash

BASE = os.path.dirname(os.path.abspath(__file__))
SQL_DIR = os.path.join(BASE, "database")                       # database/panda.sql
DB_DIR = os.environ.get("PANDA_DB_DIR", SQL_DIR)               # donde se guarda panda.db
DB_PATH = os.path.join(DB_DIR, "panda.db")                     # usuarios + ranking

GAMES = {"surprise", "run", "shot"}
LEVELS = {"A1", "A2", "B1", "B2"}
MAX_XP_PER_GAME = 210          # 10 preguntas x (15 XP + 6 de bonus por racha)

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "cambia-esta-clave-en-produccion")


# ---------------------------------------------------------------- bases de datos
def db():
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys = ON")
    return con


def init_db():
    os.makedirs(DB_DIR, exist_ok=True)
    with open(os.path.join(SQL_DIR, "panda.sql"), encoding="utf-8") as f:
        script = f.read()
    with closing(db()) as con:
        con.executescript(script)


RANK_SQL = """
SELECT position, user_id, username, xp, games_played FROM (
  SELECT RANK() OVER (ORDER BY r.xp DESC) AS position,
         r.user_id AS user_id, u.username AS username,
         r.xp AS xp, r.games_played AS games_played
  FROM ranking r JOIN users u ON u.id = r.user_id
)
"""


def my_row(uid):
    with closing(db()) as con:
        r = con.execute(RANK_SQL + " WHERE user_id = ?", (uid,)).fetchone()
    return dict(r) if r else None


init_db()


# ---------------------------------------------------------------- páginas
@app.route("/")
def home():
    return render_template("index.html")


@app.route("/surprise")
def surprise():
    return render_template("surprise.html")


@app.route("/run")
def run():
    return render_template("run.html")


@app.route("/shot")
def shot():
    return render_template("shot.html")


@app.route("/register")
def register_page():
    return render_template("register.html")


@app.route("/login")
def login_page():
    return render_template("login.html")


@app.route("/ranking")
def ranking_page():
    return render_template("ranking.html")


@app.route("/health")
def health():
    return {"status": "ok"}


# ---------------------------------------------------------------- API: cuentas
def clean_credentials(data):
    username = str((data or {}).get("username", "")).strip()
    password = str((data or {}).get("password", ""))
    return username, password


@app.post("/api/register")
def api_register():
    username, password = clean_credentials(request.get_json(silent=True))
    if not re.fullmatch(r"[A-Za-z0-9_]{3,20}", username):
        return jsonify(error="Username: 3-20 letters, numbers or _"), 400
    if len(password) < 6:
        return jsonify(error="Password must have at least 6 characters"), 400

    try:
        with closing(db()) as con, con:
            cur = con.execute(
                "INSERT INTO users (username, password_hash) VALUES (?, ?)",
                (username, generate_password_hash(password)),
            )
            uid = cur.lastrowid
            con.execute("INSERT INTO ranking (user_id) VALUES (?)", (uid,))
    except sqlite3.IntegrityError:
        return jsonify(error="That username is already taken"), 409

    session["uid"], session["username"] = uid, username
    return jsonify(ok=True, username=username)


@app.post("/api/login")
def api_login():
    username, password = clean_credentials(request.get_json(silent=True))
    with closing(db()) as con:
        u = con.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    if not u or not check_password_hash(u["password_hash"], password):
        return jsonify(error="Wrong username or password"), 401

    with closing(db()) as con, con:
        con.execute("INSERT OR IGNORE INTO ranking (user_id) VALUES (?)", (u["id"],))
    session["uid"], session["username"] = u["id"], u["username"]
    return jsonify(ok=True, username=u["username"])


@app.post("/api/logout")
def api_logout():
    session.clear()
    return jsonify(ok=True)


@app.get("/api/me")
def api_me():
    uid = session.get("uid")
    row = my_row(uid) if uid else None
    if not row:
        return jsonify(logged_in=False)
    return jsonify(logged_in=True, username=row["username"], xp=row["xp"],
                   position=row["position"], games_played=row["games_played"])


# ---------------------------------------------------------------- API: puntos y puestos
@app.post("/api/score")
def api_score():
    uid = session.get("uid")
    if not uid:
        return jsonify(error="not_logged_in"), 401

    data = request.get_json(silent=True) or {}
    xp, game, level = data.get("xp"), data.get("game"), data.get("level")
    if (not isinstance(xp, int) or isinstance(xp, bool) or not 0 <= xp <= MAX_XP_PER_GAME
            or game not in GAMES or level not in LEVELS):
        return jsonify(error="Invalid score"), 400

    with closing(db()) as con, con:
        con.execute("INSERT INTO scores (user_id, game, level, xp) VALUES (?, ?, ?, ?)",
                    (uid, game, level, xp))
        con.execute(
            "UPDATE ranking SET xp = xp + ?, games_played = games_played + 1, "
            "updated_at = datetime('now') WHERE user_id = ?",
            (xp, uid),
        )
    row = my_row(uid)
    return jsonify(ok=True, xp=row["xp"], position=row["position"])


@app.get("/api/ranking")
def api_ranking():
    with closing(db()) as con:
        rows = con.execute(RANK_SQL + " ORDER BY position, username LIMIT 50").fetchall()
    uid = session.get("uid")
    return jsonify(ranking=[dict(r) for r in rows], me=my_row(uid) if uid else None)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
