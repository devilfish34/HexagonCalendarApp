
document.addEventListener('DOMContentLoaded', async function () {
    const calendarEl = document.getElementById('calendar');
    let allEvents = [];

    async function fetchEvents() {
        const res = await fetch('/api/events');
        const events = await res.json();
        console.log("Fetched events:", events);
        alert("Fetched " + events.length + " events.");
        return events;
    }

    function getChecked(name) {
        return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(cb => cb.value);
    }

    function attachFilterListeners() {
        ['technician', 'status', 'building'].forEach(type => {
            const selectAll = document.getElementById(`select-all-${type}`);
            const deselectAll = document.getElementById(`deselect-all-${type}`);
            if (selectAll && deselectAll) {
                selectAll.addEventListener("click", () => {
                    document.querySelectorAll(`input[name="${type}"]`).forEach(cb => cb.checked = true);
                    updateCalendar();
                });
                deselectAll.addEventListener("click", () => {
                    document.querySelectorAll(`input[name="${type}"]`).forEach(cb => cb.checked = false);
                    updateCalendar();
                });
            }
        });
    }

    function applyDefaultFilters(events) {
        const getUnique = (arr) => [...new Set(arr)].filter(Boolean).sort();
        const config = [
            { name: "technician", key: "assigned_to", fallback: "" },
            { name: "status", key: "status", fallback: "" },
            { name: "building", key: "building", fallback: "Other" }
        ];

        config.forEach(({ name, key, fallback }) => {
            const container = document.getElementById(`filters-${name}`);
            if (!container) return;
            container.innerHTML = "";

            const values = getUnique(events.map(e => e[key] || fallback));
            values.forEach(val => {
                const label = document.createElement("label");
                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.name = name;
                checkbox.value = val;
                checkbox.checked = true;
                checkbox.addEventListener("change", updateCalendar);
                label.appendChild(checkbox);
                label.append(" " + val);
                container.appendChild(label);
                container.appendChild(document.createElement("br"));
            });
        });

        attachFilterListeners();
    }

    function renderSummary(events) {
        const summary = {
            "Planning": 0,
            "Approved": 0,
            "Ready": 0,
            "In Process": 0
        };

        events.forEach(e => {
            const status = (e.status || "").trim();
            if (summary.hasOwnProperty(status)) {
                summary[status]++;
            }
        });

        document.getElementById("summary-planning").textContent = summary["Planning"];
        document.getElementById("summary-approved").textContent = summary["Approved"];
        document.getElementById("summary-ready").textContent = summary["Ready"];
        document.getElementById("summary-inprocess").textContent = summary["In Process"];
        document.getElementById("summary-total").textContent =
            summary["Planning"] + summary["Approved"] + summary["Ready"] + summary["In Process"];
    }

    function updateCalendar() {
        const searchText = (document.getElementById('search-input')?.value || "").toLowerCase();
        const techs = getChecked('technician');
        const statuses = getChecked('status');
        const buildings = getChecked('building');

        const filtered = allEvents.filter(e => {
            const tech = e.assigned_to || "";
            const status = e.status || "";
            const building = e.building || "Other";
            const matchesSearch =
                (e.title || "").toLowerCase().includes(searchText) ||
                (e.description || "").toLowerCase().includes(searchText) ||
                tech.toLowerCase().includes(searchText);

            return (
                techs.includes(tech) &&
                statuses.includes(status) &&
                buildings.includes(building) &&
                matchesSearch
            );
        });

        calendar.removeAllEvents();
        calendar.addEventSource(filtered);
        renderSummary(filtered);
    }

    const events = await fetchEvents();
    allEvents = events;
    applyDefaultFilters(events);

    document.getElementById("search-input")?.addEventListener("input", updateCalendar);

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        height: 'auto',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        displayEventTime: false,
        events: events,

        eventDidMount: function(info) {
            const props = info.event.extendedProps;
            const view = info.view.type;

            if (view === 'dayGridMonth' && props.is_activity) {
                info.el.style.display = 'none';
                return;
            }

            const status = (props.status || "").toLowerCase();
            const bg = (
                status.includes("ready") ? "#28a745" :
                status.includes("planning") ? "#ffc107" :
                status.includes("approved") ? "#007bff" :
                status.includes("in process") ? "#e67ab1" :
                "#e0e0e0"
            );

            info.el.style.backgroundColor = bg;
            info.el.style.color = "black";

            const dot = info.el.querySelector(".fc-event-dot");
            if (dot) dot.style.display = "none";

            const title = info.event.title || "(No Title)";
            const tooltip = props.is_activity
                ? `<strong>${title}</strong><br><em>Status:</em> ${props.status}`
                : `<strong>${title}</strong><br><em>Assigned:</em> ${props.assigned_to}<br><em>Building:</em> ${props.building}<br><em>Description:</em> ${props.description}<br><em>Status:</em> ${props.status}<br><em>WO:</em> ${props.work_order}`;

            tippy(info.el, {
                content: tooltip,
                allowHTML: true,
                theme: 'light'
            });

            if (info.event.url) {
                info.el.style.cursor = "pointer";
            }
        },

        eventClick: function(info) {
            if (info.event.url) {
                window.open(info.event.url, '_blank');
                info.jsEvent.preventDefault();
            }
        }
    });

    calendar.render();
    updateCalendar();
});
