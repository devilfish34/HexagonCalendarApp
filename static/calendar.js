document.addEventListener('DOMContentLoaded', async function () {
    const calendarEl = document.getElementById('calendar');
    let allEvents = [];

    async function fetchEvents() {
        try {
            const res = await fetch('/api/events');
            const data = await res.json();
            if (data.error) {
                alert("Error loading calendar: " + data.error);
                return [];
            }
            allEvents = data;
            return allEvents;
        } catch (err) {
            alert("Could not load calendar events. Try re-uploading the file.");
            return [];
        }
    }


    function renderFilters(events) {
        // Clear all filter areas
        document.getElementById('filters-technician').innerHTML = '';
        document.getElementById('filters-status').innerHTML = '';
        document.getElementById('filters-building').innerHTML = '';

        // Extract unique values
        const getUniqueSorted = (arr) => [...new Set(arr)].sort();

        const technicians = getUniqueSorted(events.map(e => e.title.split(' - ')[0]));
        const statuses = getUniqueSorted(events.map(e => e.status));
        const buildings = getUniqueSorted(events.map(e => e.building || "Other"));

        // No premature closing here — function continues below

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
            // Check if we should update the toggle button label
            const toggleButton = document.querySelector(`.select-toggle[data-target="${name}"]`);
            if (toggleButton) {
                const allChecked = values.length > 0;
                toggleButton.textContent = allChecked ? "Select None" : "Select All";
            };

        };

        renderCheckboxGroup('filters-technician', technicians, 'technician');
        renderCheckboxGroup('filters-status', statuses, 'status');
        renderCheckboxGroup('filters-building', buildings, 'building');
    };

    document.querySelectorAll('.select-toggle').forEach(button => {
        button.addEventListener('click', () => {
            const name = button.dataset.target;
            const checkboxes = document.querySelectorAll(`input[name="${name}"]`);
            const allChecked = Array.from(checkboxes).every(cb => cb.checked);

            checkboxes.forEach(cb => cb.checked = !allChecked);
            updateCalendar();

            // Update button label
            button.textContent = allChecked ? "Select All" : "Select None";
        });
    });

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

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        height: 'auto',
        events: events,
        eventClick: function (info) {
            alert(`Description: ${info.event.extendedProps.description}\nStatus: ${info.event.extendedProps.status}`);
        },
        eventDidMount: function(info) {
            const status = info.event.extendedProps.status.toLowerCase();
            if (status.includes('ready')) {
                info.el.style.backgroundColor = '#28a745';
            } else if (status.includes('planning')) {
                info.el.style.backgroundColor = '#ffc107';
            } else if (status.includes('approved')) {
                info.el.style.backgroundColor = '#007bff';
            } else if (status.includes('in process')) {
                info.el.style.backgroundColor = '#fd7e14';
            } else {
                info.el.style.backgroundColor = '#6c757d';
            }
        }
    });

    calendar.render();
});
