function setAllCheckboxes(groupName, check) {
    const checkboxes = document.querySelectorAll(`input[name="${groupName}"]`);
    checkboxes.forEach(cb => cb.checked = check);
    const event = new Event('change');
    checkboxes.forEach(cb => cb.dispatchEvent(event));
}

function exportToPDF() {
    html2pdf().from(document.getElementById('calendar')).save('calendar.pdf');
}

function exportToExcel() {
    const events = calendar.getEvents();
    const headers = ['Title', 'Start', 'End', 'Status', 'Assigned To', 'Building'];
    const rows = events.map(ev => [
        ev.title,
        ev.start?.toISOString(),
        ev.end?.toISOString() || '',
        ev.extendedProps.status || '',
        ev.extendedProps.assigned_to || '',
        ev.extendedProps.building || ''
    ]);

    let csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "calendar_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function exportToHTML() {
    const calendarHTML = document.getElementById('calendar').outerHTML;
    const blob = new Blob([calendarHTML], { type: "text/html" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "calendar.html";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

document.addEventListener('DOMContentLoaded', async function () {
    document.getElementById('search-input').addEventListener('input', updateCalendar);
    const container = document.getElementById('main-container');
    //
    // REMOVING SHOW/HIDE FILTERS BUTTON FOR NOW
    // const btn = document.getElementById('toggle-sidebar');
    // btn.addEventListener('click', () => {
    //    container.classList.toggle('collapsed');
    //    btn.textContent = container.classList.contains('collapsed') ? 'Show Filters' : 'Hide Filters';
    //    setTimeout(() => {
    //        calendar.updateSize();
    //    }, 300);
    // });
    //

    const calendarEl = document.getElementById('calendar');
    let calendar;
    let allEvents = [];

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

                    // REMOVING SHOW/HIDE FILTERS BUTTON FOR NOW
                    // if (window.innerWidth <= 768) {
                    //    container.classList.add('collapsed');
                    //    btn.textContent = 'Show Filters';
                    //    setTimeout(() => {
                    //        calendar.updateSize();
                    //    }, 300);
                    // }
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
        setTimeout(() => {
            calendar.updateSize();
        }, 50);
        renderSummary(filteredEvents);
    }

    const events = await fetchEvents();
    renderFilters(events);
    applyQueryFilters();

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
                info.el.style.backgroundColor = '#ffb612';
            } else if (status.includes('approved')) {
                info.el.style.backgroundColor = '#0d6efd';
            } else if (status.includes('in process')) {
                info.el.style.backgroundColor = '#e895d2';
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
    updateCalendar();
});