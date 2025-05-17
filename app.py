from flask import Flask, render_template, request, redirect, flash, session, jsonify
import pandas as pd
import io, os

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret")
app.config["SESSION_COOKIE_SECURE"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"

MAX_FILE_SIZE_MB = 5

# Updated parser logic inside this file for clarity (replaces import)
def detect_file_type(df: pd.DataFrame) -> str:
    if "Act Note" in df.columns and "Sched. Employee" in df.columns:
        return "activity"
    elif "Sched. Start Date" in df.columns and "Work Order" in df.columns:
        return "workorder"
    return "unknown"

def parse_workorder_file(df: pd.DataFrame) -> list:
    required = ["Work Order", "Sched. Start Date", "Sched. End Date", "Data Center"]
    for col in required:
        if col not in df.columns:
            raise ValueError(f"Missing required columns: {required}")

    events = []
    for _, row in df.iterrows():
        events.append({
            "title": str(row["Work Order"]),
            "start": row["Sched. Start Date"],
            "end": row["Sched. End Date"],
            "work_order": str(row["Work Order"]),
            "building": row.get("Data Center", ""),
            "status": row.get("Status", ""),
            "description": row.get("Description", ""),
            "assigned_to": row.get("Assigned To Name", ""),
            "is_activity": False
        })
    return events

def parse_activity_file(df: pd.DataFrame) -> list:
    events = []
    grouped = df.groupby("WO Number")
    for wo_number, group in grouped:
        wo_desc = group["WO Description"].iloc[0]
        wo_status = group["WO Status"].iloc[0]
        building = group["Data Center"].iloc[0]
        start = group["WO Sched. Start Date"].iloc[0]
        end = group["WO Sched. End Date"].iloc[0]
        assigned = group["WO Assigned To"].iloc[0]

        activities = []
        for _, row in group.iterrows():
            emp = row["Sched. Employee"]
            note = row["Act Note"]
            emp_display = "⚠️ Unassigned" if pd.isna(emp) else emp
            activities.append(f"{emp_display} – {note}")

        events.append({
            "title": str(wo_number),
            "start": start,
            "end": end,
            "description": wo_desc,
            "status": wo_status,
            "assigned_to": assigned,
            "building": building,
            "activities": activities,
            "work_order": str(wo_number),
            "is_activity": False
        })

        for _, row in group.iterrows():
            emp = row["Sched. Employee"]
            note = row["Act Note"]
            act_start = row["Activity Start"]
            status = "Unassigned" if pd.isna(emp) else row["WO Status"]
            events.append({
                "title": f"{wo_number} – {'⚠️ Unassigned' if pd.isna(emp) else emp} – {note}",
                "start": act_start,
                "end": act_start,
                "description": note,
                "status": status,
                "assigned_to": emp if pd.notna(emp) else "",
                "building": building,
                "work_order": str(wo_number),
                "is_activity": True
            })
    return events

def parse_uploaded_file(df: pd.DataFrame) -> list:
    file_type = detect_file_type(df)
    if file_type == "activity":
        return parse_activity_file(df)
    elif file_type == "workorder":
        return parse_workorder_file(df)
    raise ValueError("Unrecognized file format. Expecting Work Order or Activity-level file.")

@app.route("/", methods=["GET", "POST"])
def upload_file():
    if request.method == "POST":
        file = request.files.get("file")

        if not file:
            flash("No file uploaded.", "error")
            return render_template("calendar.html")

        if not file.filename.endswith(".xlsx"):
            flash("Only .xlsx files are supported.", "error")
            return render_template("calendar.html")

        file.seek(0, io.SEEK_END)
        file_size = file.tell()
        file.seek(0)

        if file_size > MAX_FILE_SIZE_MB * 1024 * 1024:
            flash(f"File is too large. Limit is {MAX_FILE_SIZE_MB}MB.", "error")
            return render_template("calendar.html")

        try:
            df = pd.read_excel(file)
            session['events'] = parse_uploaded_file(df)
            flash("File uploaded and parsed successfully.", "success")
        except Exception as e:
            flash(f"Failed to process file: {str(e)}", "error")

        return render_template("calendar.html")

    # GET request
    if 'events' in session:
        return render_template("calendar.html")
    else:
        return render_template("index.html")

@app.route("/api/events")
def get_events():
    events = session.get("events", [])
    return jsonify(events)

if __name__ == "__main__":
    app.run(debug=True)
