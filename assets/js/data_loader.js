
document.addEventListener('DOMContentLoaded', async () => {

async function fetchData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error(`Error loading ${url}:`, error);
        return null;
    }
}


async function loadHero() {
    const container = document.querySelector('#hero-container');
    if (!container) return;



    const bg = container.querySelector('.hero-bg');
    if (bg) {
        bg.src = 'assets/images/hero-banner-notext-opt.jpg';
        bg.onerror = () => { bg.style.backgroundColor = 'var(--primary)'; bg.style.display = 'none'; };
    }
}


async function loadStats() {
    const container = document.querySelector('#stats-container');
    if (!container) return;


    const officers = await fetchData('data/officers.json');
    const events = await fetchData('data/events.json');


    const studentOfficers = officers ? officers.filter(officer => 
        officer.position !== 'Adviser' && officer.position !== 'OSA Representative'
    ) : [];
    const officerCount = studentOfficers.length || 20;
    const eventCount = events ? events.length : 3;

    const stats = [
        { label: 'Active Students', value: '800+' },
        { label: 'SSC Officers', value: officerCount },
        { label: 'Events This Year', value: eventCount },
        { label: 'Departments', value: '3' }
    ];

    container.innerHTML = stats.map(stat => `
        <div class="stat-card">
            <h3>${stat.value}</h3>
            <p>${stat.label}</p>
        </div>
    `).join('');
}


async function loadAnnouncements() {
    const grid = document.querySelector('#announcements-grid');
    if (!grid) return;

    const data = await fetchData('data/announcements.json');
    if (!data) return;


    const latest = data.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3);

    grid.innerHTML = latest.map(item => `
        <article class="card announcement-card">
                
            <div class="card-content">
                <div class="card-meta">
                    <span class="card-category text-accent-yellow">${item.category || 'General'}</span>
                    <span class="card-dot">•</span>
                    <span class="card-date">${new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                <h3 class="card-title">${item.title}</h3>
                <p class="card-excerpt">${item.content.substring(0, 100)}...</p>
                <div class="card-footer">
                    <a href="#" class="btn-read-more">
                        Read More 
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                            <polyline points="12 5 19 12 12 19"></polyline>
                        </svg>
                    </a>
                </div>
            </div>
        </article>
    `).join('');
}


async function loadEvents() {
    const grid = document.querySelector('#events-grid');
    if (!grid) return;

    const data = await fetchData('data/events.json');
    if (!data) return;


    const latest = data.slice(0, 3);

    grid.innerHTML = latest.map(item => {
        const dateObj = new Date(item.startDate);
        const month = dateObj.toLocaleDateString(undefined, { month: 'short' });
        const day = dateObj.toLocaleDateString(undefined, { day: 'numeric' });
        
        return `
        <article class="card event-card">
            <div class="event-date-badge">
                <span class="event-month">${month}</span>
                <span class="event-day">${day}</span>
            </div>
            <div class="card-content">
                <span class="card-category text-accent-yellow">${item.category || 'Event'}</span>
                <h3 class="card-title">${item.title}</h3>
                <p class="card-excerpt">${item.summary || item.content.substring(0, 80)}...</p>
                
                <div class="card-footer event-footer">
                    <div class="event-location">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                        <span>${item.location || 'Campus'}</span>
                    </div>
                </div>
            </div>
        </article>
    `}).join('');
}


async function loadOfficers() {
    const grid = document.querySelector('#officers-grid');
    if (!grid) return;

    const data = await fetchData('data/officers.json');
    if (!data) return;

    if (!data) return;
    const studentOfficers = data
        .filter(officer => officer.position !== 'Adviser' && officer.position !== 'OSA Representative')
        .sort((a, b) => a.order - b.order);

    grid.innerHTML = studentOfficers.map(item => `
        <div class="officer-card">
            <div class="officer-image-container">
                <img src="${item.image ? 'assets/images/officers/' + item.image : 'assets/images/default-avatar.png'}" 
                     alt="${item.name}" 
                     class="officer-image"
                     onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=random&size=128'">
                <div class="officer-socials">
                    <a href="#" aria-label="Facebook"><svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg></a>
                    <a href="#" aria-label="Email"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg></a>
                </div>
            </div>
            <div class="officer-info">
                <h3>${item.name}</h3>
                <p class="officer-role text-accent-yellow">${item.position}</p>
                <p class="officer-dept">${item.department}</p>
            </div>
        </div>
    `).join('');
}


async function loadTigiAyHighlight() {
    const container = document.querySelector('#tigi-ay-container');
    if (!container) return;

    const data = await fetchData('data/tigi-ay-2025.json');
    if (!data) return;

    container.innerHTML = `
        <div class="tigi-ay-banner">
            <div class="tigi-ay-content">
                <span class="highlight-badge">Intramurals 2025</span>
                <h2 class="hero-title-council" style="font-family: var(--font-heading) !important;">${data.event_name}</h2>
                <p class="section-desc">Experience the thrill of competition. Join us as <strong>${data.teams ? data.teams.length : 3} majestic teams</strong> battle for supremacy.</p>
                
                <div class="tigi-ay-actions">
                    <a href="intramural.html" class="btn-primary">View Schedule</a>
                    <a href="intramural.html#teams-grid" class="btn-outline">Meet the Teams</a>
                </div>
            </div>
            <div class="tigi-ay-visual">
                   <div class="logo-container">
                       <img src="assets/images/tigi-ay-logo-opt.jpg" alt="Tigi-Ay Logo" class="tigi-ay-logo">
                   </div>

                   <div class="glow-circle"></div>
            </div>
        </div>
    `;
}

    // Initialize all data loaders
    await Promise.all([
        loadHero(),
        loadStats(),
        loadAnnouncements(),
        loadEvents(),
        loadOfficers(),
        loadTigiAyHighlight()
    ]);

});