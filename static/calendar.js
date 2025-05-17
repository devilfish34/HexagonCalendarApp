
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

    function updateCalendar() {
        const searchText = document.getElementById('search-input')?.value?.toLowerCase() || "";
        const techs = getChecked('technician');
        const statuses = getChecked('status');
        const buildings = getChecked('building');

        const filtered = allEvents.filter(e => {
            return (
                techs.includes(e.assigned_to || "") &&
                statuses.includes(e.status || "") &&
                buildings.includes(e.building || "Other") &&
                (
                    (e.title || "").toLowerCase().includes(searchText) ||
                    (e.description || "").toLowerCase().includes(searchText) ||
                    (e.assigned_to || "").toLowerCase().includes(searchText)
                )
            );
        });

        calendar.removeAllEvents();
        calendar.addEventSource(filtered);
    }

    function getChecked(name) {
        return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(cb => cb.value);
    }

    const events = await fetchEvents();
    allEvents = events;

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        height: 'auto',
        displayEventTime: false,
        events: events,

        eventDidMount: function(info) {
            const view = calendar.view.type;
            const props = info.event.extendedProps;

            // Hide activities in month view
            if (view === 'dayGridMonth' && props.is_activity) {
                info.el.style.display = 'none';
                return;
            }

            const tooltip = props.is_activity
                ? `<strong>${info.event.title}</strong><br><em>Status:</em> ${props.status}`
                : `<strong>${info.event.title}</strong><br><em>Assigned:</em> ${props.assigned_to}<br><em>Building:</em> ${props.building}<br><em>Description:</em> ${props.description}<br><em>Status:</em> ${props.status}<br><em>WO:</em> ${props.work_order}`;

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
