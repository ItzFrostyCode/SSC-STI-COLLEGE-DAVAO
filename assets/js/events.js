

let allEvents = [];
let currentFilter = 'all';
let currentSort = 'newest';
let lightboxImages = [];
let currentLightboxIndex = 0;


document.addEventListener('DOMContentLoaded', async () => {
    await loadEvents();
    setupEventListeners();
});


async function loadEvents() {
    try {
        const response = await fetch('data/events.json');
        allEvents = await response.json();
        renderEvents();
        updateCounts();
        hideLoading();
    } catch (error) {
        console.error('Error loading events:', error);
        showError();
    }
}

function setupEventListeners() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderEvents();
        });
    });
    
    const sortBtn = document.getElementById('btn-sort-trigger');
    const sortLabel = document.getElementById('sort-label');
    
    if (sortBtn && sortLabel) {
        sortBtn.addEventListener('click', () => {
            currentSort = currentSort === 'newest' ? 'oldest' : 'newest';
            sortLabel.textContent = currentSort === 'newest' ? 'Newest' : 'Oldest';
            const svg = sortBtn.querySelector('svg');
            svg.style.transform = currentSort === 'newest' ? 'scaleY(1)' : 'scaleY(-1)';
            svg.style.transition = 'transform 0.2s';
            
            renderEvents();
        });
    }
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeEventModal();
            closeLightbox();
        }
    });
}


function filterEvents() {
    if (currentFilter === 'all') {
        return allEvents;
    }
    
    return allEvents.filter(event => {
        return event.semester === currentFilter;
    });
}


function sortEvents(events) {
    return [...events].sort((a, b) => {
        const dateA = new Date(a.startDate);
        const dateB = new Date(b.startDate);
        
        return currentSort === 'newest' ? dateB - dateA : dateA - dateB;
    });
}


function updateCounts() {
    const counts = {
        all: allEvents.length,
        '1st': 0,
        '2nd': 0
    };
    
    allEvents.forEach(event => {
        if (event.semester === '1st') {
            counts['1st']++;
        } else if (event.semester === '2nd') {
            counts['2nd']++;
        }
    });
    
    document.getElementById('count-all').textContent = counts.all;
    document.getElementById('count-1st').textContent = counts['1st'];
    document.getElementById('count-2nd').textContent = counts['2nd'];
}


function renderEvents() {
    const grid = document.getElementById('events-grid');
    const emptyState = document.getElementById('empty-state');
    
    let events = filterEvents();
    events = sortEvents(events);
    
    if (events.length === 0) {
        grid.innerHTML = '';
        emptyState.style.display = 'block';
        const filterText = currentFilter === 'all' ? 'matching your criteria' : currentFilter === '1st' ? 'in 1st semester' : 'in 2nd semester';
        emptyState.innerHTML = `
            <div class="empty-icon">📅</div>
            <h3>No Events Found</h3>
            <p>There are no events ${filterText}.</p>
        `;
        return;
    }   
    
    emptyState.style.display = 'none';
    grid.innerHTML = events.map(event => createEventCard(event)).join('');
    
    document.querySelectorAll('.view-details-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const eventId = btn.closest('.event-card').dataset.eventId;
            const event = allEvents.find(e => e.id === eventId);
            openEventModal(event);
        });
    });
    
    document.querySelectorAll('.card-image img').forEach(img => {
        img.addEventListener('click', (e) => {
            e.stopPropagation();
            const card = img.closest('.event-card');
            const eventId = card.dataset.eventId;
            const event = allEvents.find(e => e.id === eventId);
            const images = event.images || (event.image ? [event.image] : []);
            if (images.length > 0) {
                openLightbox(0, images);
            }
        });
    });
}

function createEventCard(event) {
    const firstImage = event.images && event.images.length > 0 ? event.images[0] : (event.image || 'assets/images/ssc-logo-opt.jpg');
    const imageCount = event.images ? event.images.length : (event.image ? 1 : 0);
    const startDate = new Date(event.startDate);
    const day = startDate.getDate();
    const month = startDate.toLocaleString('en-US', { month: 'short' });
    const avatar = getAvatarUrl(event.organizer || event.author);
    
    return `
        <article class="event-card fade-in" data-event-id="${event.id}">
            <div class="card-image">
                <img src="${firstImage}" alt="${event.title}" loading="lazy" style="cursor: pointer;">
                <div class="image-overlay">
                    <div class="event-date">
                        <span class="day">${day}</span>
                        <span class="month">${month}</span>
                    </div>
                </div>
                ${imageCount > 1 ? `
                    <div class="image-count-badge">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                            <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                        ${imageCount} photos
                    </div>
                ` : ''}
            </div>
            
            <div class="card-content">
                <div class="event-category">${event.category || 'Event'}</div>
                <h2 class="event-title">${event.title}</h2>
                ${event.location ? `
                    <div class="event-location">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                        ${event.location}
                    </div>
                ` : ''}
            </div>
            
            <div class="card-footer">
                <div class="event-organizer">
                    <img src="${avatar}" alt="${event.organizer || event.author}" class="organizer-avatar">
                    <span class="organizer-name">${(event.organizer || event.author || 'SSC').split(' - ')[0]}</span>
                </div>
                <button class="view-details-btn">
                    View Details
                </button>
            </div>
        </article>
    `;
}


function getAvatarUrl(organizer) {
    const avatarMap = {
        'Cherry Jane Villasencio - PIO': 'assets/images/officers/cherry-jane-villasencio.png',
        'Cherry Jane Villasencio': 'assets/images/officers/cherry-jane-villasencio.png',
        'SSC Events Committee': 'assets/images/ssc-logo-removebg.png'
    };
    
    return avatarMap[organizer] || 'assets/images/ssc-logo-removebg.png';
}

function openEventModal(event) {
    const modal = document.getElementById('event-modal');
    const modalBody = document.getElementById('modal-body');
    const startDate = new Date(event.startDate);
    const endDate = event.endDate ? new Date(event.endDate) : null;
    const dateRange = endDate && endDate.getTime() !== startDate.getTime()
        ? `${formatDate(startDate)} - ${formatDate(endDate)}`
        : formatDate(startDate);
    const images = event.images || (event.image ? [event.image] : []);
    const heroImage = images[0] || 'assets/images/ssc-logo.jpg';
    
    modalBody.innerHTML = `
        <img src="${heroImage}" alt="${event.title}" class="modal-hero-image">
        
        <div class="modal-header-content">
            <h1 class="modal-title">${event.title}</h1>
            
            <div class="modal-meta">
                <div class="meta-item">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <span>${dateRange}</span>
                </div>
                
                ${event.location ? `
                    <div class="meta-item">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                        <span>${event.location}</span>
                    </div>
                ` : ''}
                
                <div class="meta-item">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    <span>${event.organizer || event.author || 'SSC'}</span>
                </div>
            </div>
        </div>
        
        ${event.links && Object.keys(event.links).length > 0 ? `
            <div class="modal-links">
                <h3>Related Links</h3>
                <div class="links-grid">
                    ${Object.entries(event.links).map(([label, url]) => `
                        <a href="${url}" target="_blank" rel="noopener noreferrer" class="link-btn">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                <polyline points="15 3 21 3 21 9"></polyline>
                                <line x1="10" y1="14" x2="21" y2="3"></line>
                            </svg>
                            ${label}
                        </a>
                    `).join('')}
                </div>
            </div>
        ` : ''}
        
        ${images.length > 1 ? `
            <div class="modal-gallery">
                <h3>Gallery (${images.length} photos)</h3>
                <div class="gallery-grid">
                    ${images.map((img, index) => `
                        <div class="gallery-item" onclick="openLightbox(${index}, ${JSON.stringify(images).replace(/"/g, '&quot;')})">
                            <img src="${img}" alt="Event image ${index + 1}">
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}
    `;
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}


function closeEventModal() {
    const modal = document.getElementById('event-modal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}


function openLightbox(index, images) {
    if (typeof images === 'string') {
        images = JSON.parse(images.replace(/&quot;/g, '"'));
    }
    
    lightboxImages = images;
    currentLightboxIndex = index;
    updateLightbox();
    
    const lightbox = document.getElementById('lightbox');
    lightbox.classList.add('active');
}


function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    lightbox.classList.remove('active');
}


function navigateLightbox(direction) {
    currentLightboxIndex += direction;
    
    if (currentLightboxIndex < 0) {
        currentLightboxIndex = lightboxImages.length - 1;
    } else if (currentLightboxIndex >= lightboxImages.length) {
        currentLightboxIndex = 0;
    }
    
    updateLightbox();
}


function updateLightbox() {
    const img = document.getElementById('lightbox-image');
    const caption = document.getElementById('lightbox-caption');
    
    img.src = lightboxImages[currentLightboxIndex];
    caption.textContent = `${currentLightboxIndex + 1} / ${lightboxImages.length}`;
}


function formatDate(date) {
    return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });
}


function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = 'none';
    }
}


function showError() {
    const grid = document.getElementById('events-grid');
    grid.innerHTML = `
        <div class="empty-state" style="display: block;">
            <div class="empty-icon">⚠️</div>
            <h3>Failed to Load Events</h3>
            <p>There was an error loading the events. Please try again later.</p>
        </div>
    `;
}
