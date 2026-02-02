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

    // Initialize Welcome Modal
    initWelcomeModal();
}

async function loadStats() {
    const container = document.querySelector('.homepage-stats-grid');
    if (!container) return;

    try {
        const [officers, events] = await Promise.all([
            fetchJSON('data/officers.json', { cache: true, ttl: 3600 }),
            fetchJSON('data/events.json', { cache: true, ttl: 3600 })
        ]);

        const studentOfficers = officers ? officers.filter(o => o.position !== 'Adviser') : [];
        const officerCount = studentOfficers.length || 20;
        const eventCount = events ? events.length : 3;

        const stats = [
            { label: 'Total Students', value: '800+' },
            { label: 'SSC Officers', value: officerCount },
            { label: 'Events This Year', value: eventCount },
            { label: 'Departments', value: '3' }
        ];

        // Clear skeletons and replace with real data
        container.innerHTML = stats.map(stat => `
            <div class="stat-card fade-in">
                <h3>${stat.value}</h3>
                <p>${stat.label}</p>
            </div>
        `).join('');
    } catch (e) {
        console.error('Stats load failed', e);
        // Keep skeletons on error
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
        
        // Replace skeletons with real content
        grid.innerHTML = latest.map(item => `
            <article class="card announcement-card fade-in">
                <div class="card-content">
                    <div class="card-meta">
                        <span class="card-category text-accent-yellow">${escapeHtml(item.category)}</span>
                        <span class="card-dot">•</span>
                        <span class="card-date">${new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <h3 class="card-title">${escapeHtml(item.title)}</h3>
                    <p class="card-excerpt">${escapeHtml(item.content.substring(0, 120))}...</p>

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
    } catch(e) { 
        console.error('Announcements load failed', e);
        // Clear skeletons even on error
        grid.innerHTML = '<p>Failed to load announcements. Please refresh the page.</p>';
    }
}

async function loadEvents() {
    const grid = document.querySelector('#events-grid');
    if (!grid) return;

    // Show Skeletons immediately
    grid.innerHTML = Array(3).fill(0).map(() => `
        <div class="event-poster-card skeleton-card">
            <div class="skeleton-image"></div>
        </div>
    `).join('');

    try {
        const data = await fetchJSON('data/events.json', {
            cache: true,
            ttl: 3600,
            adapter: normalizeEvents
        });

        const latest = data.slice(0, 3);

        // Preload images before rendering
        const promises = latest.map(async (item) => {
            const dateObj = new Date(item.startDate);
            const month = dateObj.toLocaleDateString(undefined, { month: 'short' });
            const day = dateObj.toLocaleDateString(undefined, { day: 'numeric' });
            
            // Image Fallback Logic
            let imageSrc = (item.images && item.images.length > 0) ? item.images[0] : (item.image || 'assets/images/homepage/ssc-logo.webp');
            
            // Check if image loads, if not use fallback
            try {
                await new Promise((resolve, reject) => {
                    const img = new Image();
                    img.src = imageSrc;
                    img.onload = resolve;
                    img.onerror = reject;
                });
            } catch (err) {
                imageSrc = 'assets/images/homepage/ssc-logo.webp'; // Fallback
            }

            return `
            <a href="events.html" class="event-poster-card fade-in" title="${escapeHtml(item.title)} - Click to view details">
                <img src="${imageSrc}" alt="${escapeHtml(item.title)}" class="poster-image">
                
                <div class="poster-date-badge">
                    <span class="poster-date-month">${month}</span>
                    <span class="poster-date-day">${day}</span>
                </div>
            </a>
            `;
        });

        const renderedItems = await Promise.all(promises);
        grid.innerHTML = renderedItems.join('');

    } catch(e) { 
        console.error('Events load failed', e);
        grid.innerHTML = '<p class="error-msg">Failed to load events.</p>';
    }
}

async function loadOfficers() {
    const grid = document.querySelector('#officers-grid');
    if (!grid) return;

    // Show Skeletons
    grid.innerHTML = Array(4).fill(0).map(() => `
        <div class="officer-card skeleton-card">
            <div class="skeleton-image" style="height: 280px;"></div>
            <div class="officer-info">
                <div class="skeleton-text" style="width: 70%;"></div>
                <div class="skeleton-text" style="width: 50%;"></div>
            </div>
        </div>
    `).join('');

    try {
        const data = await fetchJSON('data/officers.json', {
            cache: true,
            ttl: 86400,
            adapter: normalizeOfficers
        });

        const studentOfficers = data
            .filter(o => o.position !== 'Adviser')
            .sort((a, b) => a.order - b.order);

        // Render immediately but use lazy loading for images via browser attribute
        // The skeleton effect implies waiting for data fetch. 
        // For images themselves, we can use a small script to remove a 'loading' class or just let them load.
        // Given the user wants "skeleton for all that has images", we should technically wait for image load or show a placeholder.
        // But for many officers, parallel waiting might slow down the UI. 
        // Best approach: Render content, but put a skeleton BEHIND the image or as a placeholder that hides when image loads.

        // Render logic with robust image loading
        // We render the skeleton structure, then update the image once loaded
        grid.innerHTML = studentOfficers.map(item => `
            <div class="officer-card fade-in">
                <div class="officer-image-container skeleton">
                    <img src="${item.image ? 'assets/images/officers/' + item.image : 'assets/images/default-avatar.svg'}" 
                         alt="${item.name}" 
                         class="officer-image"
                         loading="lazy">
                </div>
                <div class="officer-info">
                    <h3>${escapeHtml(item.name)}</h3>
                    <p class="officer-role text-accent-yellow">${escapeHtml(item.position)}</p>
                    <p class="officer-dept">${escapeHtml(item.department)}</p>
                </div>
            </div>
        `).join('');

        // Attach listeners after render to ensure we catch cached images
        const images = grid.querySelectorAll('.officer-image');
        images.forEach(img => {
            const handleLoad = () => {
                img.parentElement.classList.remove('skeleton');
            };
            const handleError = () => {
                img.src = 'assets/images/default-avatar.svg';
                img.parentElement.classList.remove('skeleton');
            };

            if (img.complete) {
                if (img.naturalWidth > 0) {
                    handleLoad();
                } else {
                    // Check if it failed (naturalWidth 0 means broken or not loaded)
                    // But for cached broken images, it might be 0.
                    // Safer to stick with onload/onerror but check complete first.
                    handleLoad(); 
                }
            } else {
                img.onload = handleLoad;
                img.onerror = handleError;
            }
        });
        
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
                                   <img src="assets/images/homepage/tigi-ay-logo-opt.webp" alt="Tigi-Ay Logo" class="tigi-ay-logo" loading="lazy">
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

// Welcome Modal Functions
function initWelcomeModal() {
    const modal = document.getElementById('welcome-modal');
    const openBtn = document.getElementById('get-started-btn');
    const closeBtn = document.getElementById('welcome-modal-close');
    const continueBtn = document.getElementById('welcome-continue');
    const overlay = modal?.querySelector('.modal-overlay');

    if (!modal || !openBtn) return;

    // Load latest announcement for preview
    loadWelcomeAnnouncement();

    // Open modal
    openBtn.addEventListener('click', () => {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    // Close modal function
    const closeModal = () => {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        
        // Smooth scroll to announcements section after modal closes
        setTimeout(() => {
            const announcementsSection = document.getElementById('announcements-container');
            if (announcementsSection) {
                announcementsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 300);
    };

    // Close button
    closeBtn?.addEventListener('click', closeModal);

    // Continue button
    continueBtn?.addEventListener('click', closeModal);

    // Overlay click
    overlay?.addEventListener('click', closeModal);

    // ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });
}

async function loadWelcomeAnnouncement() {
    const container = document.getElementById('welcome-latest-announcement');
    if (!container) return;

    container.classList.add('loading');

    try {
        const data = await fetchJSON('data/announcements.json', { 
            cache: true, 
            ttl: 300, 
            adapter: normalizeAnnouncements 
        });

        if (data && data.length > 0) {
            const latest = data[0];
            container.classList.remove('loading');
            
            // Show more content - up to 400 characters or full content if shorter
            const contentPreview = latest.content.length > 400 
                ? `${escapeHtml(latest.content.substring(0, 400))}...` 
                : escapeHtml(latest.content);
            
            container.innerHTML = `
                <h4>${escapeHtml(latest.title)}</h4>
                <p>${contentPreview}</p>
                <div class="welcome-preview-meta">
                    <span class="welcome-preview-category">${escapeHtml(latest.category || 'General')}</span>
                    <span>•</span>
                    <span>${new Date(latest.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
            `;

            // Update events count if available
            const eventsData = await fetchJSON('data/events.json', { cache: true, ttl: 3600 });
            const eventsCountEl = document.getElementById('welcome-events-count');
            if (eventsData && eventsCountEl) {
                eventsCountEl.textContent = eventsData.length;
            }
        }
    } catch (e) {
        console.error('Failed to load welcome announcement', e);
        container.classList.remove('loading');
        container.innerHTML = '<p>Stay tuned for the latest updates!</p>';
    }
}
