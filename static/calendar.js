function setAllCheckboxes(groupName, check) {
    const checkboxes = document.querySelectorAll(`input[name="${groupName}"]`);
    checkboxes.forEach(cb => cb.checked = check);
    const event = new Event('change');
    checkboxes.forEach(cb => cb.dispatchEvent(event));
}

document.addEventListener('DOMContentLoaded', async function () {
    document.getElementById('search-input').addEventListener('input', updateCalendar);
    const container = document.getElementById('main-container');
    const btn = document.getElementById('toggle-sidebar');
    btn.addEventListener('click', () => {
        container.classList.toggle('collapsed');
        btn.textContent = container.classList.contains('collapsed') ? 'Show Filters' : 'Hide Filters';
        setTimeout(() => {
            calendar.updateSize();
        }, 300);
    });


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
                checkbox.addEventListener('change', () => {
                    updateCalendar();

                    if (window.innerWidth <= 768) {
                        container.classList.add('collapsed');
                        btn.textContent = 'Show Filters';
                        setTimeout(() => {
                            calendar.updateSize();
                        }, 300),
                    }
                });
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
      const summaryContainer = document.getElementById('summary-container');
      summaryContainer.innerHTML = ''; // Clear previous summary

      const statusCounts = {};
      const technicianCounts = {};
      const buildingCounts = {};

      events.forEach(event => {
        // Count by status
        const status = event.status || 'Unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;

        // Count by technician
        const technician = event.assigned_to || 'Unassigned';
        technicianCounts[technician] = (technicianCounts[technician] || 0) + 1;

        // Count by building
        const building = event.building || 'Unknown';
        buildingCounts[building] = (buildingCounts[building] || 0) + 1;
      });

      // Helper function to create summary sections
      function createSummarySection(title, counts) {
        const section = document.createElement('div');
        section.classList.add('summary-section');
        const heading = document.createElement('h4');
        heading.textContent = title;
        section.appendChild(heading);

        const list = document.createElement('ul');
        for (const [key, count] of Object.entries(counts)) {
          const listItem = document.createElement('li');
          listItem.textContent = `${key}: ${count}`;
          list.appendChild(listItem);
        }
        section.appendChild(list);
        return section;
      }

      summaryContainer.appendChild(createSummarySection('Status Summary', statusCounts));
      summaryContainer.appendChild(createSummarySection('Technician Summary', technicianCounts));
      summaryContainer.appendChild(createSummarySection('Building Summary', buildingCounts));
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
        setTimeout(() => {
            calendar.updateSize();
        }, 50);
        renderSummary(filteredEvents);
    }

    const events = await fetchEvents();
    renderFilters(events);

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth, timeGridDay, timeGridWeek, customTwoWeek'
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
                    <strong>${info.event.extendedProps.assigned_to || ''} - ${info.event.extendedProps.building || ''} ${info.event.extendedProps.description || ''}</strong><br>
                    <em>Status:</em> ${info.event.extendedProps.status || ''}
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