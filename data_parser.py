import pandas as pd

def detect_file_type(df: pd.DataFrame) -> str:
    if "Act Note" in df.columns and "Sched. Employee" in df.columns:
        return "activity"
    elif "Sched. Start Date" in df.columns and "Work Order" in df.columns:
        return "workorder"
    else:
        raise ValueError("Unrecognized file format. Please upload a valid Work Order or Activity-level Excel file.")

def parse_workorder_file(df: pd.DataFrame) -> list:
    required = {
        "work_order": "Work Order",
        "start_date": "Sched. Start Date",
        "end_date": "Sched. End Date",
        "building": "Data Center"
    }

    optional = {
        "description": "Description",
        "status": "Status",
        "type": "Type",
        "assigned_to": "Assigned To Name"
    }

    events = []
    for _, row in df.iterrows():
        event = {
            "title": str(row.get(required["work_order"])),
            "start": row.get(required["start_date"]),
            "end": row.get(required["end_date"]),
            "work_order": str(row.get(required["work_order"])),
            "building": row.get(required["building"]),
            "is_activity": False
        }
        for key, col in optional.items():
            event[key] = row.get(col, "")
        events.append(event)
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

        activity_summary = []
        for _, row in group.iterrows():
            emp = row["Sched. Employee"]
            note = row["Act Note"]
            emp_display = "⚠️ Unassigned" if pd.isna(emp) else emp
            activity_summary.append(f"{emp_display} – {note}")

        wo_event = {
            "title": str(wo_number),
            "start": start,
            "end": end,
            "description": wo_desc,
            "status": wo_status,
            "assigned_to": assigned,
            "building": building,
            "activities": activity_summary,
            "work_order": str(wo_number),
            "is_activity": False
        }
        events.append(wo_event)

        for _, row in group.iterrows():
            emp = row["Sched. Employee"]
            note = row["Act Note"]
            date = row["Activity Start"]
            status = "Unassigned" if pd.isna(emp) else row["WO Status"]

            events.append({
                "title": f"{wo_number} – {'⚠️ Unassigned' if pd.isna(emp) else emp} – {note}",
                "start": date,
                "end": date,
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
        # validate required columns only for this type
        required_cols = ["Work Order", "Sched. Start Date", "Sched. End Date"]
        missing = [col for col in required_cols if col not in df.columns]
        if missing:
            raise ValueError(f"Missing required columns: {missing}")
        return parse_workorder_file(df)
    else:
        raise ValueError("Unknown file format.")
