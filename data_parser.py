import pandas as pd


def extract_work_orders(file_path):
    df = pd.read_excel(file_path, sheet_name="Sheet1")
    df = df.dropna(subset=["Sched. Start Date"])

    # Ensure dates are parsed
    df["Sched. Start Date"] = pd.to_datetime(df["Sched. Start Date"])
    df["Sched. End Date"] = pd.to_datetime(df["Sched. End Date"])

    # Required columns
    required_cols = [
        "Work Order", "Description", "Assigned To Name",
        "Sched. Start Date", "Sched. End Date", "Status", "Type", "Data Center"
    ]

    # Check for missing columns
    missing = [col for col in required_cols if col not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    return df[required_cols]


def format_for_calendar(df):
    events = []
    for _, row in df.iterrows():
        events.append({
            "title": f"{row['Assigned To Name']} - {row['Work Order']}: {row['Description'].split()[0]}",
            "start": row["Sched. Start Date"].isoformat(),
            "end": row["Sched. End Date"].isoformat(),
            "description": row["Description"],
            "status": row["Status"],
            "type": row["Type"],
            "building": row["Data Center"]
        })
    return events
