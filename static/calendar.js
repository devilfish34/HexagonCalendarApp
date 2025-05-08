function setAllCheckboxes(groupName, check) {
    const checkboxes = document.querySelectorAll(`input[name="${groupName}"]`);
    checkboxes.forEach(cb => cb.checked = check);
    const event = new Event('change');
    checkboxes.forEach(cb => cb.dispatchEvent(event));
}

document.addEventListener('DOMContentLoaded', async function () {
    const calendarEl = document.getElementById('calendar');
    let calendar;
    let allEvents = [];

    async function fetchEvents() {
        const res = await fetch('/api/events');
        allEvents = await res.json();
        return allEvents;
    }

    function renderFilters(events) {
        document.getElementById('filters-technician').innerHTML = '';
        document.getElementById('filters-status').innerHTML = '';
        document.getElementById('filters-building').innerHTML = '';

        const getUniqueSorted = (arr) => [...new Set(arr)].sort();

        const technicians = getUniqueSorted(events.map(e => e.title.split(' - ')[0]));
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

    function updateCalendar() {
        const getCheckedValues = (name) => Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(cb => cb.value);

        const selectedTechs = getCheckedValues('technician');
        const selectedStatuses = getCheckedValues('status');
        const selectedBuildings = getCheckedValues('building');

        const filteredEvents = allEvents.filter(event => {
            const tech = event.title.split(' - ')[0];
            const status = event.status;
            const buildingValue = event.building || "Other";

            return selectedTechs.includes(tech) &&
                   selectedStatuses.includes(status) &&
                   selectedBuildings.includes(buildingValue);
        });

        calendar.removeAllEvents();
        calendar.addEventSource(filteredEvents);
    }

    const events = await fetchEvents();
    renderFilters(events);

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
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
            // Status-based color
            const status = (info.event.extendedProps.status || '').toLowerCase();

            const textElement = info.el.querySelector('.fc-event-title');
            if (textElement) {
                textElement.style.color = 'black';
                textElement.style.fontWeight = 'bold';
            }

            if (status.includes('ready')) {
                info.el.style.backgroundColor = '#218739';
            } else if (status.includes('planning')) {
                info.el.style.backgroundColor = '#f59e0b';
            } else if (status.includes('approved')) {
                info.el.style.backgroundColor = '#0d6efd';
            } else if (status.includes('in process')) {
                info.el.style.backgroundColor = '#f4a261';
            } else {
                info.el.style.backgroundColor = '#e0e0e0';
            }

            // Hover tooltip using tippy.js
            tippy(info.el, {
                content: `
                    <strong>${info.event.title}</strong><br>
                    ${info.event.extendedProps.description || ''}<br>
                    <em>${info.event.extendedProps.status || ''}</em>
                `,
                allowHTML: true,
                theme: 'light',
                placement: 'top',
                trigger: 'mouseenter focus',
                interactive: false,
                hideOnClick: false,
                delay: [0, 100],
            });
        }
    });

    calendar.render();
});