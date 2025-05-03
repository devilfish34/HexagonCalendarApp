from flask import Flask, request, render_template, jsonify, url_for, redirect, session
import os
import uuid
from data_parser import extract_work_orders, format_for_calendar

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret")
UPLOAD_FOLDER = "uploads"
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route("/", methods=["GET", "POST"])
def upload():
    if request.method == "POST":
        file = request.files["file"]
        if file:
            filename = f"{uuid.uuid4()}_{file.filename}"
            file_path = os.path.join(UPLOAD_FOLDER, filename)
            file.save(file_path)
            session["upload_file"] = filename

            print(f"Uploaded file saved to: {file_path}")
            print(f"Session file set: {session['uploaded_file']}")

            return redirect(url_for("calendar"))
        else:
            return render_template("index.html", error="Please select a valid Excel file.")
    return render_template("index.html")

@app.route("/calendar")
def calendar():
    return render_template("calendar.html")

@app.route("/api/events")
def get_events():
    filename = session.get("uploaded_file")
    if not filename:
        print("No file in session.")
        return jsonify([])

    file_path = os.path.join(UPLOAD_FOLDER, filename)
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return jsonify([])

    print(f"Serving events from: {file_path}")

    df = extract_work_orders(file_path)
    print(f"Loaded {len(df)} rows from Excel")

    events = format_for_calendar(df)
    print(f"Returning {len(events)} events to calendar")
    return jsonify(events)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000)) # Use PORT from environment
    app.run(host="0.0.0.0", port=port, debug=True)