from flask import Flask, request, render_template, jsonify, redirect, session, flash
import os
import io
import pandas as pd
from data_parser import extract_work_orders, format_for_calendar
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret")
app.config["SESSION_COOKIE_SECURE"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
UPLOAD_FOLDER = "uploads"
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

MAX_FILE_SIZE_MB = 5

@app.route("/", methods=["GET", "POST"])
def upload_file():
    if request.method == "POST":
        file = request.files.get("file")

        if not file:
            flash("No file uploaded.", "error")
            return redirect(request.url)

        if not file.filename.endswith(".xlsx"):
            flash("Only .xlsx files are supported.", "error")
            return redirect(request.url)

        file.seek(0, io.SEEK_END)
        file_size = file.tell()
        file.seek(0)

        if file_size > MAX_FILE_SIZE_MB * 1024 * 1024:
            flash(f"File is too large. Limit is {MAX_FILE_SIZE_MB}MB.", "error")
            return redirect(request.url)

        try:
            df = pd.read_excel(file)

        # REMOVED FILE SAVING IN FAVOR OF PROCESSING STRAIGHT FROM MEMORY
        # filename = secure_filename(file.filename)
        # save_path = os.path.join("uploads", filename)
        # file.save(save_path)

            if 'upload_history' not in session:
                session['upload_history'] = []
            session['upload_history'].append({
                "filename": file.filename,
                "size_kb": round(file_size / 1024, 2)
            })

            return redirect("/calendar")
        except Exception as e:
            flash("There was an error processing the Excel file.", "error")
            print(e)
            return redirect(request.url)

    return render_template("index.html")


@app.route("/calendar", methods=["GET", "POST"])
def calendar_view():
    if request.method == "POST":
        file = request.files.get("file")
        if not file:
            flash("No file uploaded.", category="warning")
            return redirect("/calendar")

        filename = secure_filename(file.filename)
        if not filename.endswith(".xlsx"):
            flash("Invalid file format. Please upload an Excel (.xlsx) file.", category="warning")
            return redirect("/calendar")

        file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
        file.save(file_path)
        session["uploaded_file"] = filename
        flash("File uploaded successfully.", category="success")
        return redirect("/calendar")
    return render_template("calendar.html")


@app.route("/api/events")
def get_events():
    print("🚨 /api/events CALLED")
    try:
        filename = session.get("uploaded_file")
        print(f"📥 Session uploaded_file: {filename}")

        if not filename:
            print("⚠️ No uploaded file in session.")
            return jsonify([])

        file_path = os.path.join(UPLOAD_FOLDER, filename)
        print(f"📦 Looking for file at: {file_path}")

        if not os.path.exists(file_path):
            print("❌ Uploaded file not found on disk.")
            return jsonify([])

        df = extract_work_orders(file_path)

        print(f"✅ Extracted {len(df)} rows from Excel")
        print(df.head().to_string())  # show a sample

        events = format_for_calendar(df)
        print(f"📅 Returning {len(events)} events to calendar")

        return jsonify(events)

    except Exception as e:
        print("🔥 ERROR in /api/events:", str(e))
        import traceback
        traceback.print_exc()
        return jsonify([])


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000)) # Use PORT from environment
    app.run(host="0.0.0.0", port=port, debug=True)