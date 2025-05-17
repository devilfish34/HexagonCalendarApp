
// Full version of calendar.js with activity/WO support and filtering logic preserved

let calendar;

document.addEventListener('DOMContentLoaded', async function () {
    document.getElementById('search-input').addEventListener('input', updateCalendar);
    const calendarEl = document.getElementById('calendar');
    let allEvents = [];

    async function fetchEvents() {
        const res = await fetch('/api/events');
        allEvents = await res.json();
        return allEvents;
    }

    function applyQueryFilters() {
        const params = new URLSearchParams(window.location.search);
        ['technician', 'status', 'building'].forEach(name => {
            const values = params.getAll(name);
            if (values.length > 0) {
                document.querySelectorAll(`input[name="${name}"]`).forEach(cb => {
                    cb.checked = values.includes(cb.value);
                });
            }
        });
    }

    function renderFilters(events) {
        document.getElementById('filters-technician').innerHTML = '';
        document.getElementById('filters-status').innerHTML = '';
        document.getElementById('filters-building').innerHTML = '';

        const getUniqueSorted = (arr) => [...new Set(arr)].sort();

        const technicians = getUniqueSorted(events.map(e => e.assigned_to || ""));
        const statuses = getUniqueSorted(events.map(e => e.status));
        const buildings = getUniqueSorted(events.map(e => e.building || "Other"));

        const renderCheckboxGroup = (containerId, values, name) => {
            const container = document.getElementById(containerId);
            values.forEach(value => {
                const label = document.createElement('label');
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.value = value;
                checkbox.name = name;
                checkbox.checked = true;
                checkbox.addEventListener('change', updateCalendar);
                label.appendChild(checkbox);
                label.append(` ${value}`);
                container.appendChild(label);
                container.appendChild(document.createElement('br'));
            });
        };

        renderCheckboxGroup('filters-technician', technicians, 'technician');
        renderCheckboxGroup('filters-status', statuses, 'status');
        renderCheckboxGroup('filters-building', buildings, 'building');
    }

    function renderSummary(events) {
        const counts = {
            "Planning": 0,
            "Approved": 0,
            "Ready": 0,
            "In Process": 0
        };

        events.forEach(event => {
            const status = (event.status || '').trim();
            if (counts.hasOwnProperty(status)) {
                counts[status]++;
            }
        });

        document.getElementById("summary-planning").textContent = counts["Planning"];
        document.getElementById("summary-approved").textContent = counts["Approved"];
        document.getElementById("summary-ready").textContent = counts["Ready"];
        document.getElementById("summary-inprocess").textContent = counts["In Process"];
        document.getElementById("summary-total").textContent =
            counts["Planning"] + counts["Ready"] + counts["Approved"] + counts["In Process"];
    }

    function updateCalendar() {
        const getCheckedValues = (name) => Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(cb => cb.value);
        const searchText = document.getElementById('search-input').value.toLowerCase();
        const selectedTechs = getCheckedValues('technician');
        const selectedStatuses = getCheckedValues('status');
        const selectedBuildings = getCheckedValues('building');

        const filteredEvents = allEvents.filter(event => {
            const tech = event.assigned_to || "";
            const status = event.status;
            const buildingValue = event.building || "Other";

            return (
                selectedTechs.includes(tech) &&
                selectedStatuses.includes(status) &&
                selectedBuildings.includes(buildingValue) &&
                (
                    tech.toLowerCase().includes(searchText) ||
                    event.title.toLowerCase().includes(searchText) ||
                    event.description.toLowerCase().includes(searchText)
                )
            );
        });

        calendar.removeAllEvents();
        calendar.addEventSource(filteredEvents);
        calendarEl.classList.add('filter-pulse');
        setTimeout(() => calendarEl.classList.remove('filter-pulse'), 300);
        setTimeout(() => calendar.updateSize(), 50);
        renderSummary(filteredEvents);
    }

    const events = await fetchEvents();
    console.log("Fetched events:", events);
    alert("Fetched " + events.length + " events.");
    renderFilters(events);
    applyQueryFilters();

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridDay,timeGridWeek,customTwoWeek'
        },
        views: {
            customTwoWeek: {
                type: 'dayGrid',
                duration: { weeks: 2 },
                buttonText: '2 Week'
            }
        },
        height: 'auto',
        displayEventTime: false,
        events: events,

        eventClick: function(info) {
            if (info.event.url) {
                window.open(info.event.url, '_blank');
                info.jsEvent.preventDefault();
            }
        },

        eventDidMount: function(info) {
            const event = info.event;
            const props = event.extendedProps;
            const view = calendar.view.type;

            // Hide activity events on month view only
            if (view === 'dayGridMonth' && props.is_activity) {
                info.el.style.display = 'none';
                return;
            }

            const status = (props.status || '').toLowerCase();
            if (status.includes('ready')) info.el.style.backgroundColor = '#218739';
            else if (status.includes('planning')) info.el.style.backgroundColor = '#ffb612';
            else if (status.includes('approved')) info.el.style.backgroundColor = '#0d6efd';
            else if (status.includes('in process')) info.el.style.backgroundColor = '#e895d2';
            else if (status.includes('unassigned')) info.el.style.backgroundColor = '#ff4d4d';
            else info.el.style.backgroundColor = '#e0e0e0';

            const tooltipContent = props.is_activity
                ? `<strong>${event.title}</strong><br><em>Status:</em> ${props.status}`
                : `<strong>${event.title}</strong><br><em>Status:</em> ${props.status}<br>${(props.activities || []).join('<br>')}`;

            tippy(info.el, {
                content: tooltipContent,
                allowHTML: true,
                theme: 'light',
                placement: 'top',
                trigger: 'mouseenter focus',
                interactive: false,
                hideOnClick: false,
                delay: [0, 100]
            });
        }
    });

    calendar.render();
    updateCalendar();
});
