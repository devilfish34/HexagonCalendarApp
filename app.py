from flask import Flask, request, render_template, jsonify
import os
from data_parser import extract_work_orders, format_for_calendar

app = Flask(__name__)
UPLOAD_FOLDER = "uploads"
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route("/", methods=["GET", "POST"])
def index():
    if request.method == "POST":
        file = request.files["file"]
        if file:
            file_path = os.path.join(app.config["UPLOAD_FOLDER"], file.filename)
            file.save(file_path)
            return "Upload successful! Refresh the calendar."
    return render_template("index.html")

@app.route("/api/events")
def get_events():
    files = os.listdir(UPLOAD_FOLDER)
    if not files:
        return jsonify([])

    file_path = os.path.join(UPLOAD_FOLDER, files[-1])
    df = extract_work_orders(file_path)
    events = format_for_calendar(df)
    return jsonify(events)

if __name__ == "__main__":
    app.run(debug=True)