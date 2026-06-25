import os
import random
import sys

from flask import Flask, jsonify, request, send_from_directory

from db import get_connection, init_db
from geo import haversine_distance_km, score_from_distance
from monuments import get_active_monuments, get_monument_by_id

if getattr(sys, "frozen", False):
    _BASE = sys._MEIPASS
else:
    _BASE = os.path.join(os.path.dirname(__file__), "..")

PUBLIC_DIR = os.path.join(_BASE, "public")
IMAGES_DIR = os.path.join(_BASE, "images")

MIN_ROUNDS = 2
MAX_ROUNDS = 20
DEFAULT_ROUNDS = 5

app = Flask(__name__, static_folder=PUBLIC_DIR, static_url_path="")


def public_monument(monument, order_index):
    return {
        "id": monument["id"],
        "name": monument["name"],
        "country": monument["country"],
        "imageUrl": monument["imageUrl"],
        "imageAttribution": monument["imageAttribution"],
        "orderIndex": order_index,
    }


def get_or_create_player(conn, name):
    row = conn.execute("SELECT * FROM players WHERE name = ?", (name,)).fetchone()
    if row:
        return row
    cur = conn.execute("INSERT INTO players (name) VALUES (?)", (name,))
    conn.commit()
    return conn.execute("SELECT * FROM players WHERE id = ?", (cur.lastrowid,)).fetchone()


def round_to_breakdown(round_row):
    monument = get_monument_by_id(round_row["monument_id"])
    return {
        "monumentId": round_row["monument_id"],
        "monumentName": monument["name"] if monument else round_row["monument_id"],
        "orderIndex": round_row["order_index"],
        "guessLat": round_row["guess_lat"],
        "guessLng": round_row["guess_lng"],
        "actualLat": monument["latitude"] if monument else None,
        "actualLng": monument["longitude"] if monument else None,
        "distanceKm": round_row["distance_km"],
        "score": round_row["score"],
    }


@app.route("/api/sessions", methods=["POST"])
def create_session():
    body = request.get_json(silent=True) or {}
    player_name = body.get("playerName")
    round_count = body.get("roundCount")

    if not isinstance(player_name, str) or player_name.strip() == "":
        return jsonify({"error": "playerName is required and cannot be blank."}), 400

    if not isinstance(round_count, int) or isinstance(round_count, bool):
        count = DEFAULT_ROUNDS
    else:
        count = round_count

    if count < MIN_ROUNDS or count > MAX_ROUNDS:
        return jsonify({"error": f"roundCount must be between {MIN_ROUNDS} and {MAX_ROUNDS}."}), 400

    pool = get_active_monuments()
    if len(pool) < count:
        return jsonify({"error": "Not enough active monuments to start a session."}), 500

    trimmed_name = player_name.strip()
    selected = random.sample(pool, count)

    conn = get_connection()
    try:
        player = get_or_create_player(conn, trimmed_name)
        cur = conn.execute(
            "INSERT INTO sessions (player_id, round_count, status) VALUES (?, ?, ?)",
            (player["id"], count, "active"),
        )
        session_id = cur.lastrowid
        for index, monument in enumerate(selected):
            conn.execute(
                "INSERT INTO session_monuments (session_id, monument_id, order_index) VALUES (?, ?, ?)",
                (session_id, monument["id"], index),
            )
        conn.commit()
    finally:
        conn.close()

    return jsonify(
        {
            "sessionId": session_id,
            "playerName": trimmed_name,
            "roundCount": count,
            "monuments": [public_monument(m, i) for i, m in enumerate(selected)],
        }
    ), 201


@app.route("/api/sessions/<int:session_id>/guess", methods=["POST"])
def submit_guess(session_id):
    body = request.get_json(silent=True) or {}
    monument_id = body.get("monumentId")
    lat = body.get("lat")
    lng = body.get("lng")

    conn = get_connection()
    try:
        session = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
        if not session:
            return jsonify({"error": "Session not found."}), 404
        if session["status"] != "active":
            return jsonify({"error": "Session is no longer active."}), 409

        if not isinstance(monument_id, str):
            return jsonify({"error": "monumentId is required."}), 400

        if not isinstance(lat, (int, float)) or isinstance(lat, bool) or not isinstance(lng, (int, float)) or isinstance(lng, bool):
            return jsonify({"error": "lat and lng must be numbers."}), 400

        if lat < -90 or lat > 90 or lng < -180 or lng > 180:
            return jsonify({"error": "lat/lng out of valid range."}), 400

        round_row = conn.execute(
            "SELECT * FROM session_monuments WHERE session_id = ? AND monument_id = ?",
            (session_id, monument_id),
        ).fetchone()
        if not round_row:
            return jsonify({"error": "Monument is not part of this session."}), 404
        if round_row["answered_at"]:
            return jsonify({"error": "This round has already been answered."}), 409

        monument = get_monument_by_id(monument_id)
        if not monument:
            return jsonify({"error": "Monument metadata not found."}), 500

        distance_km = haversine_distance_km(lat, lng, monument["latitude"], monument["longitude"])
        score = score_from_distance(distance_km)

        conn.execute(
            """UPDATE session_monuments
               SET guess_lat = ?, guess_lng = ?, distance_km = ?, score = ?, answered_at = datetime('now')
               WHERE id = ?""",
            (lat, lng, distance_km, score, round_row["id"]),
        )
        conn.commit()
    finally:
        conn.close()

    return jsonify(
        {
            "monumentId": monument_id,
            "distanceKm": distance_km,
            "score": score,
            "guessLat": lat,
            "guessLng": lng,
            "actualLat": monument["latitude"],
            "actualLng": monument["longitude"],
        }
    )


@app.route("/api/sessions/<int:session_id>/complete", methods=["POST"])
def complete_session(session_id):
    conn = get_connection()
    try:
        session = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
        if not session:
            return jsonify({"error": "Session not found."}), 404

        player = conn.execute("SELECT * FROM players WHERE id = ?", (session["player_id"],)).fetchone()

        if session["status"] == "completed":
            rounds = conn.execute(
                "SELECT * FROM session_monuments WHERE session_id = ? ORDER BY order_index",
                (session_id,),
            ).fetchall()
            return jsonify(
                {
                    "sessionId": session_id,
                    "playerName": player["name"],
                    "totalScore": session["total_score"],
                    "roundCount": session["round_count"],
                    "breakdown": [round_to_breakdown(r) for r in rounds],
                }
            )

        rounds = conn.execute(
            "SELECT * FROM session_monuments WHERE session_id = ? ORDER BY order_index",
            (session_id,),
        ).fetchall()

        if any(r["answered_at"] is None for r in rounds):
            return jsonify({"error": "All rounds must be answered before completing the session."}), 409

        total_score = sum(r["score"] or 0 for r in rounds)

        conn.execute(
            "UPDATE sessions SET status = 'completed', ended_at = datetime('now'), total_score = ? WHERE id = ?",
            (total_score, session_id),
        )
        conn.commit()
    finally:
        conn.close()

    return jsonify(
        {
            "sessionId": session_id,
            "playerName": player["name"],
            "totalScore": total_score,
            "roundCount": session["round_count"],
            "breakdown": [round_to_breakdown(r) for r in rounds],
        }
    )


@app.route("/api/leaderboard", methods=["GET"])
def leaderboard():
    conn = get_connection()
    try:
        rows = conn.execute(
            """SELECT p.name AS playerName,
                      MAX(s.total_score) AS bestScore,
                      COUNT(s.id) AS gamesPlayed,
                      AVG(s.total_score) AS averageScore,
                      MAX(s.ended_at) AS lastPlayedAt
               FROM sessions s
               JOIN players p ON p.id = s.player_id
               WHERE s.status = 'completed'
               GROUP BY p.id
               ORDER BY bestScore DESC
               LIMIT 50"""
        ).fetchall()
    finally:
        conn.close()

    return jsonify(
        {
            "leaderboard": [
                {
                    "playerName": row["playerName"],
                    "bestScore": row["bestScore"],
                    "gamesPlayed": row["gamesPlayed"],
                    "averageScore": round(row["averageScore"]),
                    "lastPlayedAt": row["lastPlayedAt"],
                }
                for row in rows
            ]
        }
    )


@app.route("/api/players/<name>/stats", methods=["GET"])
def player_stats(name):
    conn = get_connection()
    try:
        player = conn.execute("SELECT * FROM players WHERE name = ?", (name,)).fetchone()
        if not player:
            return jsonify({"error": "Player not found."}), 404

        sessions = conn.execute(
            """SELECT id, started_at, ended_at, total_score, round_count, status
               FROM sessions WHERE player_id = ? AND status = 'completed' ORDER BY ended_at DESC""",
            (player["id"],),
        ).fetchall()

        summary = conn.execute(
            """SELECT MAX(total_score) AS bestScore, COUNT(*) AS gamesPlayed, AVG(total_score) AS averageScore
               FROM sessions WHERE player_id = ? AND status = 'completed'""",
            (player["id"],),
        ).fetchone()
    finally:
        conn.close()

    games_played = summary["gamesPlayed"] or 0

    return jsonify(
        {
            "playerName": player["name"],
            "bestScore": summary["bestScore"] or 0,
            "gamesPlayed": games_played,
            "averageScore": round(summary["averageScore"]) if games_played else 0,
            "sessions": [
                {
                    "sessionId": s["id"],
                    "startedAt": s["started_at"],
                    "endedAt": s["ended_at"],
                    "totalScore": s["total_score"],
                    "roundCount": s["round_count"],
                }
                for s in sessions
            ],
        }
    )


@app.route("/api/monuments", methods=["GET"])
def monuments_preview():
    try:
        count = int(request.args.get("count", DEFAULT_ROUNDS))
    except (TypeError, ValueError):
        count = DEFAULT_ROUNDS
    count = min(max(count, MIN_ROUNDS), MAX_ROUNDS)

    selected = random.sample(get_active_monuments(), count)
    return jsonify({"monuments": [public_monument(m, i) for i, m in enumerate(selected)]})


@app.route("/images/<path:filename>")
def serve_image(filename):
    return send_from_directory(IMAGES_DIR, filename)


@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


if __name__ == "__main__":
    init_db()
    port = int(os.environ.get("PORT", 3000))
    if getattr(sys, "frozen", False):
        import threading
        import webbrowser
        threading.Timer(1.2, lambda: webbrowser.open(f"http://localhost:{port}")).start()
    app.run(host="0.0.0.0", port=port)
