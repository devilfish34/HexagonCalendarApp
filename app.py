from flask import Flask, request, render_template, jsonify, redirect, session, flash
import os
import io
import uuid
from data_parser import extract_work_orders, format_for_calendar
from werkzeug.utils import secure_filename


UPLOAD_FOLDER = "uploads"
MAX_FILE_SIZE_MB = 5
ALLOWED_EXTENSIONS = {".xlsx"}
app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret")
app.config["SESSION_COOKIE_SECURE"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


@app.route("/", methods=["GET", "POST"])
def upload_file():
    if request.method == "POST":
        file = request.files.get("file")

        if not file:
            flash("No file uploaded.", "error")
            return redirect(request.url)

        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            flash("Only .xlsx files are supported.", "error")
            return redirect(request.url)

        file.seek(0, io.SEEK_END)
        file_size = file.tell()
        file.seek(0)
        if file_size > MAX_FILE_SIZE_MB * 1024 * 1024:
            flash(f"File is too large. Limit is {MAX_FILE_SIZE_MB}MB.", "error")
            return redirect(request.url)

        try:
            if "user_id" not in session:
                session["user_id"] = str(uuid.uuid4())

            filename = f"{session['user_id']}.xlsx"
            save_path = os.path.join(UPLOAD_FOLDER, filename)
            file.save(save_path)

            session["upload_history"] = session.get("upload_history", [])
            session["upload_history"].append({
                "filename": file.filename,
                "size_kb": round(file_size / 1024, 2)
            })

            flash("File uploaded and saved successfully.", "success")
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
    user_id = session["user_id"]
    if not user_id:
        return jsonify([])

    file_path = os.path.join(UPLOAD_FOLDER, f"{user_id}.xlsx")
    if not os.path.exists(file_path):
        return jsonify([])

    try:
        df = extract_work_orders(file_path)
        events = format_for_calendar(df)
        return jsonify(events)
    except Exception as e:
        print(f"Error parsing Excel file for user {user_id}: {e}")
        return jsonify([])


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000)) # Use PORT from environment
    app.run(host="0.0.0.0", port=port, debug=True)