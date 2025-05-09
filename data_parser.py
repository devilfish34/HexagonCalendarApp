import pandas as pd

# Central column definitions
REQUIRED_COLUMNS = {
    "work_order": "Work Order",
    "start_date": "Sched. Start Date",
    "end_date": "Sched. End Date",
    "building": "Data Center"
}

OPTIONAL_COLUMNS = {
    "description": "Description",
    "status": "Status",
    "type": "Type",
    "assigned_to": "Assigned To Name"
}

ALL_COLUMNS = {**REQUIRED_COLUMNS, **OPTIONAL_COLUMNS}

BASE_URL = "https://eamprod.thefacebook.com/web/base/logindisp?tenant=DS_MP_1&FROMEMAIL=YES&SYSTEM_FUNCTION_NAME=WSJOBS&workordernum="

def extract_work_orders(file_path):
    df = pd.read_excel(file_path, sheet_name="Sheet1")
    df = df.dropna(subset=[REQUIRED_COLUMNS["start_date"]])

    # Ensure date columns
    df[REQUIRED_COLUMNS["start_date"]] = pd.to_datetime(df[REQUIRED_COLUMNS["start_date"]])
    df[REQUIRED_COLUMNS["end_date"]] = pd.to_datetime(df[REQUIRED_COLUMNS["end_date"]])

    # Check required
    required = list(REQUIRED_COLUMNS.values())
    missing_required = [col for col in required if col not in df.columns]
    if missing_required:
        raise ValueError(f"Missing required columns: {missing_required}")

    # Fill in missing optional columns with blank/defaults
    for key, col in OPTIONAL_COLUMNS.items():
        if col not in df.columns:
            df[col] = ""  # or pd.NA, or np.nan depending on what you want

    all_needed_cols = list((REQUIRED_COLUMNS | OPTIONAL_COLUMNS).values())
    return df[all_needed_cols]


def format_for_calendar(df):
    c = {**REQUIRED_COLUMNS, **OPTIONAL_COLUMNS}
    events = []

    for _, row in df.iterrows():
        building = str(row[c["building"]]).strip()
        description = str(row.get(c["description"], "")).strip()
        wo_num = str(row[c["work_order"]]).strip()

        if description.lower().startswith(building.lower()):
            description = description[len(building):].lstrip(" -:")

        title = f"{building} - {description}"

        events.append({
            "title": title,
            "start": row[c["start_date"]].isoformat(),
            "end": row[c["end_date"]].isoformat(),
            "allDay": True,
            "description": description,
            "status": row.get(c["status"], ""),
            "type": row.get(c["type"], ""),
            "building": building,
            "url": f"{BASE_URL}{wo_num}"
        })
    return events

