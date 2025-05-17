
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
        const checkboxes = document.querySelectorAll(`input[name="${name}"]:checked`);
        return Array.from(checkboxes).map(cb => cb.value);
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
        const searchText = document.getElementById('search-input')?.value?.toLowerCase() || "";
        const techs = getChecked('technician');
        const statuses = getChecked('status');
        const buildings = getChecked('building');

        const filtered = allEvents.filter(e => {
            const tech = e.assigned_to || "";
            const status = e.status || "";
            const building = e.building || "Other";

            return (
                techs.includes(tech) &&
                statuses.includes(status) &&
                buildings.includes(building) &&
                (
                    (e.title || "").toLowerCase().includes(searchText) ||
                    (e.description || "").toLowerCase().includes(searchText) ||
                    tech.toLowerCase().includes(searchText)
                )
            );
        });

        calendar.removeAllEvents();
        calendar.addEventSource(filtered);
        renderSummary(filtered);
    }

    const events = await fetchEvents();
    allEvents = events;
    applyDefaultFilters(events);

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

            const title = info.event.title || "(No Title)";
            const status = (props.status || "").toLowerCase();
            const assignee = props.assigned_to || "";
            const building = props.building || "";
            const desc = props.description || "";
            const wo = props.work_order || "";

            const tooltip = props.is_activity
                ? `<strong>${title}</strong><br><em>Status:</em> ${props.status}`
                : `<strong>${title}</strong><br><em>Assigned:</em> ${assignee}<br><em>Building:</em> ${building}<br><em>Description:</em> ${desc}<br><em>Status:</em> ${props.status}<br><em>WO:</em> ${wo}`;

            tippy(info.el, {
                content: tooltip,
                allowHTML: true,
                theme: 'light'
            });

            if (props.is_activity) {
                info.el.style.backgroundColor = '#9999ff';
            } else if (status.includes("ready")) {
                info.el.style.backgroundColor = '#28a745';
            } else if (status.includes("planning")) {
                info.el.style.backgroundColor = '#ffc107';
            } else if (status.includes("approved")) {
                info.el.style.backgroundColor = '#007bff';
            } else if (status.includes("in process")) {
                info.el.style.backgroundColor = '#e67ab1';
            } else {
                info.el.style.backgroundColor = '#e0e0e0';
            }

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
