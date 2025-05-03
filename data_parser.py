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

def extract_work_orders(file_path):
    print(f"🔍 Reading Excel from: {file_path}")
    df = pd.read_excel(file_path, sheet_name="Sheet1")
    print("📄 Excel Headers:", df.columns.tolist())

    df = df.dropna(subset=[REQUIRED_COLUMNS["start_date"]])
    print(f"📆 Rows after dropping missing start dates: {len(df)}")

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
    print("✅ Returning cleaned DataFrame")
    return df[all_needed_cols]


def format_for_calendar(df):
    c = REQUIRED_COLUMNS  # shorthand

    events = []
    for _, row in df.iterrows():
        events.append({
            "title": f"{row.get([c['assigned_to']], '')} - {row[c['work_order']]}",
            "start": row[c["start_date"]].isoformat(),
            "end": row[c["end_date"]].isoformat(),
            "description": row.get(c["description"], ""),
            "status": row.get(c["status"], ""),
            "type": row.get(c["type"], ""),
            "building": row[c["building"]]
        })
    return events
