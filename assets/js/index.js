document.addEventListener('DOMContentLoaded', async () => {
    const teamsContainer = document.getElementById('teams-container');

    async function loadAnnouncements() {
        if (!announcementsContainer) return;
        try {
            let announcements = [];
            try {
                const response = await fetch('data/announcements.json');
                if (response.ok) {
                    announcements = await response.json();
                } else {
                    throw new Error('Local fetch failed');
                }
            } catch (e) {
                announcements = [];
            }
            const latestAnnouncements = announcements
                .filter(a => a.showOnIndexOnly !== true)
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 3);
            if (latestAnnouncements.length > 0) {
                announcementsContainer.innerHTML = latestAnnouncements.map(announcement => `
                    <div class="announcement-card">
                        ${announcement.image ? `<img src="${announcement.image}" alt="${announcement.title}" class="announcement-img">` : ''}
                        <h3>${announcement.title}</h3>
                        <p class="announcement-date">${new Date(announcement.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        <p>${announcement.content ? announcement.content.substring(0, 120) : ''}${announcement.content && announcement.content.length > 120 ? '...' : ''}</p>
                        <a href="announcements.html" class="read-more-link">Read More</a>
                    </div>
                `).join('');
            } else {
                announcementsContainer.innerHTML = '<p>No announcements to display at this time.</p>';
            }
        } catch (error) {
            announcementsContainer.innerHTML = '<p>Failed to load announcements.</p>';
        }
    }

    async function loadEvents() {
        if (!eventsContainer) return;
        try {
            let events = [];
            try {
                const response = await fetch('data/events.json');
                if (response.ok) {
                    events = await response.json();
                } else {
                    throw new Error('Local fetch failed');
                }
            } catch (e) {
                events = [];
            }
            const upcomingEvents = events
                .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
                .slice(0, 3);
            if (upcomingEvents.length > 0) {
                eventsContainer.innerHTML = upcomingEvents.map(event => `
                    <div class="event-card">
                        ${event.image ? `<img src="${event.image}" alt="${event.title}" class="event-img">` : ''}
                        <h3>${event.title}</h3>
                        <p class="event-date">${new Date(event.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        <p>${event.summary ? event.summary.substring(0, 120) : ''}${event.summary && event.summary.length > 120 ? '...' : ''}</p>
                        <a href="events.html" class="read-more-link">View Event</a>
                    </div>
                `).join('');
            } else {
                eventsContainer.innerHTML = '<p>No upcoming events to display at this time.</p>';
            }
        } catch (error) {
            eventsContainer.innerHTML = '<p>Failed to load events.</p>';
        }
    }

    async function loadOfficers() {
        if (!officersContainer) return;
        try {
            let officers = [];
            try {
                const response = await fetch('data/officers.json');
                if (response.ok) {
                    officers = await response.json();
                } else {
                    throw new Error('Local fetch failed');
                }
            } catch (e) {
                officers = [];
            }
            const mainOfficers = officers.filter(o => ["Adviser", "President", "Vice President (Internal)", "Vice President (External)"].includes(o.position)).slice(0, 3);
            if (mainOfficers.length > 0) {
                officersContainer.innerHTML = mainOfficers.map(officer => `
                    <div class="officer-card">
                        <img src="assets/images/officers/${officer.image}" alt="${officer.name}" class="officer-img">
                        <h4>${officer.name}</h4>
                        <p class="officer-position">${officer.position}</p>
                        <p class="officer-email">${officer.email}</p>
                    </div>
                `).join('');
            } else {
                officersContainer.innerHTML = '<p>No officers to display at this time.</p>';
            }
        } catch (error) {
            officersContainer.innerHTML = '<p>Failed to load officers.</p>';
        }
    }

    async function loadTeams() {
        if (!teamsContainer) return;
        try {
            let teams = [];
            try {
                const response = await fetch('data/tigi-ay-2025.json');
                if (response.ok) {
                    const tigiAy = await response.json();
                    teams = tigiAy.teams || [];
                } else {
                    throw new Error('Local fetch failed');
                }
            } catch (e) {
                teams = [];
            }
            if (teams.length > 0) {
                teamsContainer.innerHTML = teams.map(team => `
                    <div class="team-card" style="border-left: 6px solid ${team.theme_color || '#015FDB'}">
                        <h4>${team.name}</h4>
                        <p class="team-dept">${team.department}</p>
                    </div>
                `).join('');
            } else {
                teamsContainer.innerHTML = '<p>No teams to display at this time.</p>';
            }
        } catch (error) {
            teamsContainer.innerHTML = '<p>Failed to load teams.</p>';
        }
    }

    loadAnnouncements();
    loadEvents();
    loadOfficers();
    loadTeams();
});