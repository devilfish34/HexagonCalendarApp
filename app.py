from flask import Flask, render_template, request, redirect, flash, session, jsonify
import pandas as pd
import io, os

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret")
app.config["SESSION_COOKIE_SECURE"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"

MAX_FILE_SIZE_MB = 5

def build_event(row, is_activity=False, extra=None):
    def format_date(value):
        if pd.isna(value):
            return None
        return value.isoformat() if hasattr(value, 'isoformat') else str(value)

    if is_activity:
        return {
            "title": extra.get("title", ""),
            "start": format_date(row.get("activity start")),
            "end": format_date(row.get("activity start")),
            "work_order": extra.get("work_order", ""),
            "building": extra.get("building", ""),
            "status": extra.get("status", ""),
            "description": extra.get("description", ""),
            "assigned_to": extra.get("assigned_to", ""),
            "is_activity": True
        }
    else:
        return {
            "title": str(row.get("work order")),
            "start": format_date(row.get("sched. start date")),
            "end": format_date(row.get("sched. end date")),
            "work_order": str(row.get("work order")),
            "building": row.get("data center", ""),
            "status": row.get("status", ""),
            "description": row.get("description", ""),
            "assigned_to": row.get("assigned to name", ""),
            "is_activity": False
        }

def detect_file_type(df: pd.DataFrame) -> str:
    columns = set(df.columns)
    if {"act note", "sched. employee", "wo sched. start date", "activity start", "wo number"}.issubset(columns):
        return "activity"
    elif {"work order", "sched. start date", "sched. end date"}.issubset(columns):
        return "workorder"
    return "unknown"

def parse_workorder_file(df: pd.DataFrame) -> list:
    required = ["work order", "sched. start date", "sched. end date", "data center"]
    missing = [col for col in required if col not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")
    return [build_event(row) for _, row in df.iterrows()]

def parse_uploaded_file(df: pd.DataFrame) -> list:
    df.columns = [col.strip().lower() for col in df.columns]
    df.rename(columns=lambda x: x.strip().lower(), inplace=True)
    file_type = detect_file_type(df)

    app.logger.info("Normalized columns: %s", df.columns.tolist())
    app.logger.info("File type detected: %s", file_type)

    if file_type == "activity":
        return parse_activity_file(df)
    elif file_type == "workorder":
        return parse_workorder_file(df)
    raise ValueError("Unrecognized file format. Expecting Work Order or Activity-level file.")

def parse_activity_file(df: pd.DataFrame) -> list:
    app.logger.info("Parsing activity file. First 3 rows:\n%s", df.head(3).to_string())

    required = [
        "wo number", "wo description", "wo status", "data center",
        "wo sched. start date", "wo sched. end date", "act note",
        "sched. employee", "activity start"
    ]
    missing = [col for col in required if col not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    df = df.dropna(subset=["activity start"])
    events = []
    grouped = df.groupby(df["wo number"])
    for wo_number, group in grouped:
        # ... [unchanged parsing logic here] ...
        pass  # keep the rest of your original logic
    return events


@app.route("/", methods=["GET", "POST"])
def upload_file():
    if request.method == "POST":
        file = request.files.get("file")

        if not file:
            flash("No file uploaded.", "error")
            return redirect("/calendar")

        if not file.filename.endswith(".xlsx"):
            flash("Only Excel (.xlsx) files are supported.", "error")
            return redirect("/calendar")

        file.seek(0, io.SEEK_END)
        file_size = file.tell()
        file.seek(0)

        if file_size > MAX_FILE_SIZE_MB * 1024 * 1024:
            flash(f"File is too large. Limit is {MAX_FILE_SIZE_MB}MB.", "error")
            return redirect("/calendar")

        try:
            df = pd.read_excel(file)
            df.columns = [col.strip().lower() for col in df.columns]
            df.rename(columns=lambda x: x.strip().lower(), inplace=True)

            app.logger.info("UPLOAD DEBUG: Columns after normalization: %s", df.columns.tolist())
            app.logger.info("UPLOAD DEBUG: First few rows:\n%s", df.head(3).to_string())

            session["events"] = parse_uploaded_file(df)
            flash("File uploaded and parsed successfully.", "success")
        except Exception as e:
            app.logger.exception("Error during file processing: %s", str(e))
            flash(f"Failed to process file: {str(e)}", "error")

        return redirect("/calendar")

    if "events" in session:
        return redirect("/calendar")
    else:
        return render_template("index.html")

@app.route("/calendar")
def calendar_page():
    if "events" in session:
        return render_template("calendar.html")
    else:
        return redirect("/")

@app.route("/api/events")
def get_events():
    return jsonify(session.get("events", []))

if __name__ == "__main__":
    print("✅ app.py loaded at deploy time")
    app.run(debug=True)
