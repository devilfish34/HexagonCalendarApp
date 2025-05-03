import pandas as pd

# Central column definitions
REQUIRED_COLUMNS = {
    "work_order": "Work Order",
    "description": "Description",
    "assigned_to": "Assigned To Name",
    "start_date": "Sched. Start Date",
    "end_date": "Sched. End Date",
    "status": "Status",
    "type": "Type",
    "building": "Data Center"
}


def extract_work_orders(file_path):
    print(f"🔍 Reading Excel from: {file_path}")

    df = pd.read_excel(file_path, sheet_name="Sheet1")
    print("📄 Excel Headers:", df.columns.tolist())

    df = df.dropna(subset=["Sched. Start Date"])
    print(f"📆 Rows after dropping missing start dates: {len(df)}")

    # Ensure dates are parsed
    df["Sched. Start Date"] = pd.to_datetime(df["Sched. Start Date"])
    df["Sched. End Date"] = pd.to_datetime(df["Sched. End Date"])

    # Required columns
    required_cols = list(REQUIRED_COLUMNS.values())

    # Check for missing columns
    missing = [col for col in required_cols if col not in df.columns]
    if missing:
        print(f"❌ Missing required columns: {missing}")
        raise ValueError(f"Missing required columns: {missing}")

    print("✅ All required columns present.")
    return df[required_cols]

def format_for_calendar(df):
    c = REQUIRED_COLUMNS  # shorthand

    events = []
    for _, row in df.iterrows():
        events.append({
            "title": f"{row[c['assigned_to']]} - {row[c['work_order']]}",
            "start": row[c["start_date"]].isoformat(),
            "end": row[c["end_date"]].isoformat(),
            "description": row[c["description"]],
            "status": row[c["status"]],
            "type": row[c["type"]],
            "building": row[c["building"]]
        })
    return events
