from flask import Flask, request, session, render_template, flash, redirect, url_for, jsonify
import os
from data_parser import extract_work_orders, format_for_calendar

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret")
app.config["SESSION_COOKIE_SECURE"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"

@app.route("/", methods=["GET", "POST"])
def upload_file():
    if request.method == "POST":
        file = request.files.get("file")

        if not file or not file.filename.endswith(".xlsx"):
            flash("Only .xlsx files are supported.", "error")
            return redirect(request.url)

        try:
            df = extract_work_orders(file)
            events = format_for_calendar(df)
            session["parsed_events"] = events
            flash("File uploaded and parsed successfully.", "success")
            return redirect("/calendar?uploaded=true")
        except Exception as e:
            flash(f"Failed to process file: {e}", "error")
            return redirect(request.url)

    return render_template("index.html")

@app.route("/calendar")
def calendar():
    return render_template("calendar.html")

@app.route("/api/events")
def get_events():
    return jsonify(session.get("parsed_events", []))


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000)) # Use PORT from environment
    app.run(host="0.0.0.0", port=port, debug=True)
