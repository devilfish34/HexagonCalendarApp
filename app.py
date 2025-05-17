from flask import Flask, render_template, request, redirect, flash, session, jsonify
import pandas as pd
import io, os
from data_parser import parse_uploaded_file

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret")
app.config["SESSION_COOKIE_SECURE"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"

MAX_FILE_SIZE_MB = 5

@app.route("/", methods=["GET", "POST"])
def upload_file():
    if request.method == "POST":
        file = request.files.get("file")

        if not file or not file.filename.endswith(".xlsx"):
            flash("Only Excel (.xlsx) files are supported.", "error")
            return redirect(request.url)

        file.seek(0, io.SEEK_END)
        if file.tell() > MAX_FILE_SIZE_MB * 1024 * 1024:
            flash(f"File is too large. Limit is {MAX_FILE_SIZE_MB}MB.", "error")
            return redirect(request.url)
        file.seek(0)

        try:
            df = pd.read_excel(file)
            session["events"] = parse_uploaded_file(df)
            flash("File uploaded and parsed successfully.", "success")
            return render_template("calendar.html")
        except Exception as e:
            flash(f"Failed to process file: {str(e)}", "error")
            return render_template("calendar.html")

    return render_template("index.html")


@app.route("/api/events")
def get_events():
    events = session.get("events", [])
    return jsonify(events)

if __name__ == "__main__":
    app.run(debug=True)
