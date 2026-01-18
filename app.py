from flask import Flask, render_template, request, jsonify, session, redirect, url_for
import json
import os
from functools import wraps

app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "default_secret_key_change_me")

ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD")
READER_PASSWORD = os.environ.get("READER_PASSWORD")

NOTES_FILE = "notes.json"

def login_required(role=None):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if "user_role" not in session:
                return jsonify({"error": "Unauthorized"}), 401
            if role == "admin" and session.get("user_role") != "admin":
                return jsonify({"error": "Forbidden"}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def load_notes():
    if os.path.exists(NOTES_FILE):
        with open(NOTES_FILE, "r") as f:
            try: return json.load(f)
            except: return []
    return []

def save_notes(notes):
    with open(NOTES_FILE, "w") as f:
        json.dump(notes, f, indent=2)

@app.route("/")
def index():
    user_role = session.get("user_role")
    return render_template("index.html", role=user_role) if user_role else render_template("login.html")

@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    password = data.get("password")
    if password == ADMIN_PASSWORD:
        session["user_role"] = "admin"
        return jsonify({"success": True, "role": "admin"})
    elif password == READER_PASSWORD:
        session["user_role"] = "reader"
        return jsonify({"success": True, "role": "reader"})
    return jsonify({"error": "Invalid password"}), 401

@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("index"))

@app.route("/api/notes", methods=["GET"])
@login_required()
def get_notes(): return jsonify(load_notes())

@app.route("/api/notes", methods=["POST"])
@login_required(role="admin")
def create_note():
    data = request.get_json()
    notes = load_notes()
    new_note = {"id": len(notes) + 1, "title": data.get("title", ""), "content": data.get("content", "")}
    notes.append(new_note)
    save_notes(notes)
    return jsonify(new_note), 201

@app.route("/api/notes/<int:note_id>", methods=["DELETE"])
@login_required(role="admin")
def delete_note(note_id):
    notes = [n for n in load_notes() if n["id"] != note_id]
    save_notes(notes)
    return jsonify({"success": True})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
