// src/modules/home.js
import { fetchJSON } from '../lib/dataLoader.js';
import { normalizeAnnouncements, normalizeEvents, normalizeOfficers } from '../lib/normalize.js';
import { escapeHtml } from '../lib/utils.js';

export async function init() {
    console.log('Initializing Home Module');
    
    // Parallel Fetching for Homepage Data
    await Promise.all([
        loadStats(),
        loadAnnouncements(),
        loadEvents(),
        loadOfficers(),
        loadTigiAySection()
    ]);
}

async function loadStats() {
    const container = document.querySelector('#stats-container');
    if (!container) return;

    try {
        const [officers, events] = await Promise.all([
            fetchJSON('data/officers.json', { cache: true, ttl: 3600 }),
            fetchJSON('data/events.json', { cache: true, ttl: 3600 })
        ]);

        const studentOfficers = officers ? officers.filter(o => o.position !== 'Adviser' && o.position !== 'OSA Representative') : [];
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
    } catch (e) {
        console.error('Stats load failed', e);
    }
}

async function loadAnnouncements() {
    const grid = document.querySelector('#announcements-grid');
    if (!grid) return;

    try {
        const data = await fetchJSON('data/announcements.json', { 
            cache: true, 
            ttl: 300, 
            adapter: normalizeAnnouncements 
        });

        // Take top 3
        const latest = data.slice(0, 3);
        
        grid.innerHTML = latest.map(item => `
            <article class="card announcement-card">
                <div class="card-content">
                    <div class="card-meta">
                        <span class="card-category text-accent-yellow">${escapeHtml(item.category)}</span>
                        <span class="card-dot">•</span>
                        <span class="card-date">${new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <h3 class="card-title">${escapeHtml(item.title)}</h3>
                    <p class="card-excerpt">${escapeHtml(item.content.substring(0, 100))}...</p>
                    <div class="card-footer">
                        <a href="announcements.html" class="btn-read-more">
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
    } catch(e) { console.error('Announcements load failed', e); }
}

async function loadEvents() {
    const grid = document.querySelector('#events-grid');
    if (!grid) return;

    try {
        const data = await fetchJSON('data/events.json', {
            cache: true,
            ttl: 3600,
            adapter: normalizeEvents
        });

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
                    <span class="card-category text-accent-yellow">${escapeHtml(item.category)}</span>
                    <h3 class="card-title">${escapeHtml(item.title)}</h3>
                    <p class="card-excerpt">${escapeHtml(item.summary)}...</p>
                    
                    <div class="card-footer event-footer">
                        <div class="event-location">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                <circle cx="12" cy="10" r="3"></circle>
                            </svg>
                            <span>${escapeHtml(item.location)}</span>
                        </div>
                    </div>
                </div>
            </article>
            `;
        }).join('');
    } catch(e) { console.error('Events load failed', e); }
}

async function loadOfficers() {
    const grid = document.querySelector('#officers-grid');
    if (!grid) return;

    try {
        const data = await fetchJSON('data/officers.json', {
            cache: true,
            ttl: 86400,
            adapter: normalizeOfficers
        });

        const studentOfficers = data
            .filter(o => o.position !== 'Adviser' && o.position !== 'OSA Representative')
            .sort((a, b) => a.order - b.order);

        grid.innerHTML = studentOfficers.map(item => `
            <div class="officer-card">
                <div class="officer-image-container">
                    <img src="${item.image ? 'assets/images/officers/' + item.image : 'assets/images/default-avatar.png'}" 
                         alt="${item.name}" 
                         class="officer-image"
                         loading="lazy"
                         onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=random&size=128'">
                </div>
                <div class="officer-info">
                    <h3>${escapeHtml(item.name)}</h3>
                    <p class="officer-role text-accent-yellow">${escapeHtml(item.position)}</p>
                    <p class="officer-dept">${escapeHtml(item.department)}</p>
                </div>
            </div>
        `).join('');
        
        // Setup Carousel scripts if needed (assuming carousel.js is still used or we port logic)
        // For now, if carousel.js is globally loaded, it might attach itself. 
        // Ideally we should import carousel logic here too.
        
    } catch(e) { console.error('Officers load failed', e); }
}

async function loadTigiAySection() {
    const container = document.querySelector('#tigi-ay-container');
    if (!container) return;
    
    // IntersectionObserver to lazy load the heavy Intramurals logic
    const observer = new IntersectionObserver(async (entries) => {
        if (entries[0].isIntersecting) {
            observer.disconnect();
            console.log('Intramurals section visible - Lazy loading logic...');
            try {
                // Dynamically import the intramurals module specific for the home section preview
                // Or just render the static HTML parts if they aren't already there?
                // The HTML is largely static in index.html, but if we need dynamic data:
                
                // Currently data_loader.js creates innerHTML for this section.
                // We should reconstruct that here.
                
                // Note: The original data_loader.js fetched 'data/tigi-ay-2025.json' for this.
                const data = await fetchJSON('data/tigi-ay-2025.json', { cache: true, ttl: 3600 });
                if(!data) return;

                // Render content
                // Note: We are replacing the content of #tigi-ay-container
                
                // For Optimized rendering, check if already rendered? 
                // content is overwritten, so let's render.
                
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
                                   <img src="assets/images/tigi-ay-logo-opt.jpg" alt="Tigi-Ay Logo" class="tigi-ay-logo" loading="lazy">
                               </div>
                               <div class="glow-circle"></div>
                        </div>
                    </div>
                `;
            } catch (e) { console.error('Tigi-Ay load failed', e); }
        }
    }, { rootMargin: '200px' });
    
    observer.observe(container);
}
