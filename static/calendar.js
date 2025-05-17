
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
        if (checkboxes.length === 0) return []; // default to empty set
        return Array.from(checkboxes).map(cb => cb.value);
    }

    function applyDefaultFilterValues(events) {
        const getUnique = (arr) => [...new Set(arr)].filter(Boolean).sort();
        const types = ["technician", "status", "building"];

        types.forEach(type => {
            const values = getUnique(events.map(e => {
                if (type === "technician") return e.assigned_to || "";
                if (type === "status") return e.status || "";
                if (type === "building") return e.building || "Other";
                return "";
            }));

            const container = document.getElementById(`filters-${type}`);
            if (!container) return;

            container.innerHTML = "";
            values.forEach(val => {
                const label = document.createElement("label");
                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.name = type;
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
                (techs.length === 0 || techs.includes(tech)) &&
                (statuses.length === 0 || statuses.includes(status)) &&
                (buildings.length === 0 || buildings.includes(building)) &&
                (
                    (e.title || "").toLowerCase().includes(searchText) ||
                    (e.description || "").toLowerCase().includes(searchText) ||
                    (e.assigned_to || "").toLowerCase().includes(searchText)
                )
            );
        });

        console.log("Rendering", filtered.length, "events...");
        calendar.removeAllEvents();
        calendar.addEventSource(filtered);
    }

    const events = await fetchEvents();
    allEvents = events;
    applyDefaultFilterValues(events);

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
            const status = props.status || "";
            const assignee = props.assigned_to || "";
            const building = props.building || "";
            const desc = props.description || "";
            const wo = props.work_order || "";

            const tooltip = props.is_activity
                ? `<strong>${title}</strong><br><em>Status:</em> ${status}`
                : `<strong>${title}</strong><br><em>Assigned:</em> ${assignee}<br><em>Building:</em> ${building}<br><em>Description:</em> ${desc}<br><em>Status:</em> ${status}<br><em>WO:</em> ${wo}`;

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
