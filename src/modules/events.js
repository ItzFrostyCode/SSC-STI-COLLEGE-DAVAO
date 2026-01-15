// src/modules/events.js
import { fetchJSON } from '../lib/dataLoader.js';
import { normalizeEvents } from '../lib/normalize.js';
import { escapeHtml } from '../lib/utils.js';

let allEvents = [];
let currentFilter = 'all';
let currentSort = 'newest';
let lightboxImages = [];
let currentLightboxIndex = 0;

export async function init() {
    console.log('Initializing Events Module');
    try {
        // DISABLE CACHE to force fresh load
        const data = await fetchJSON('data/events.json', {
            cache: false,
            ttl: 0,
            adapter: normalizeEvents
        });

        if (data) {
            allEvents = data; 
            console.log('Loaded events:', allEvents.length); // Debug log
            renderEvents();
            updateCounts();
            hideLoading();
            setupListeners();
        }
    } catch (e) {
        console.error('Events load failed', e);
        showError();
    }
}

function updateCounts() {
    const counts = {
        all: allEvents.length,
        '1st': 0,
        '2nd': 0
    };
    
    allEvents.forEach(event => {
        if (event.semester === '1st') counts['1st']++;
        else if (event.semester === '2nd') counts['2nd']++;
    });
    
    const allEl = document.getElementById('count-all');
    if(allEl) allEl.textContent = counts.all;
    if(document.getElementById('count-1st')) document.getElementById('count-1st').textContent = counts['1st'];
    if(document.getElementById('count-2nd')) document.getElementById('count-2nd').textContent = counts['2nd'];

    // Mobile Counts
    if(document.getElementById('count-all-mobile')) document.getElementById('count-all-mobile').textContent = counts.all;
    if(document.getElementById('count-1st-mobile')) document.getElementById('count-1st-mobile').textContent = counts['1st'];
    if(document.getElementById('count-2nd-mobile')) document.getElementById('count-2nd-mobile').textContent = counts['2nd'];
}

function renderEvents() {
    const grid = document.getElementById('events-grid');
    const emptyState = document.getElementById('empty-state');
    if(!grid) return;
    
    let filtered = allEvents.filter(event => {
        return currentFilter === 'all' || event.semester === currentFilter;
    });

    filtered.sort((a, b) => {
        const dateA = new Date(a.startDate);
        const dateB = new Date(b.startDate);
        return currentSort === 'newest' ? dateB - dateA : dateA - dateB;
    });

    if (filtered.length === 0) {
        grid.innerHTML = '';
        if(emptyState) {
            emptyState.style.display = 'block';
            const filterText = currentFilter === 'all' ? 'matching your criteria' : 
                              currentFilter === '1st' ? 'in 1st semester' : 'in 2nd semester';
            emptyState.querySelector('p').textContent = `There are no events ${filterText}.`;
        }
        return;
    }
    
    if(emptyState) emptyState.style.display = 'none';

    grid.innerHTML = filtered.map(event => createEventCard(event)).join('');
    
    // Listeners definition
    grid.querySelectorAll('.view-details-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const card = btn.closest('.event-card');
            const title = card.querySelector('.event-title').textContent;
            const event = allEvents.find(ev => ev.title === title);
            if(event) openEventModal(event);
        });
    });
    
    grid.querySelectorAll('.card-image img').forEach(img => {
        img.addEventListener('click', (e) => {
            e.stopPropagation();
            const card = img.closest('.event-card');
            const title = card.querySelector('.event-title').textContent;
            const event = allEvents.find(ev => ev.title === title);
            const images = event.images || (event.image ? [event.image] : []);
            if (images.length > 0) openLightbox(0, images);
        });
    });
}

function getAvatarUrl(organizer) {
    const avatarMap = {
        'Cherry Jane Villasencio - PIO': 'assets/images/officers/cherry-jane-villasencio.png',
        'Cherry Jane Villasencio': 'assets/images/officers/cherry-jane-villasencio.png',
        'SSC Events Committee': 'assets/images/ssc-logo-removebg.png'
    };
    return avatarMap[organizer] || 'assets/images/ssc-logo-removebg.png';
}

function createEventCard(event) {
    const firstImage = (event.images && event.images[0]) || event.image || 'assets/images/ssc-logo.jpg';
    const imageCount = event.images ? event.images.length : (event.image ? 1 : 0);
    const startDate = new Date(event.startDate);
    
    const organizer = event.organizer || event.author || 'SSC';
    const avatar = getAvatarUrl(organizer);

    return `
        <article class="event-card fade-in">
            <div class="card-image">
                <img src="${firstImage}" alt="${escapeHtml(event.title)}" loading="lazy" style="cursor: pointer;">
                <div class="image-overlay">
                    <div class="event-date">
                        <span class="day">${startDate.getDate()}</span>
                        <span class="month">${startDate.toLocaleString('en-US', { month: 'short' })}</span>
                    </div>
                </div>
                ${imageCount > 1 ? `<div class="image-count-badge">${imageCount} photos</div>` : ''}
            </div>
            <div class="card-content">
                <div class="event-category">${escapeHtml(event.category)}</div>
                <h2 class="event-title">${escapeHtml(event.title)}</h2>
                ${event.location ? `<div class="event-location">${escapeHtml(event.location)}</div>` : ''}
            </div>
            <div class="card-footer">
                <div class="event-organizer">
                    <img src="${avatar}" class="organizer-avatar">
                    <span class="organizer-name">${escapeHtml(organizer)}</span>
                </div>
                <button class="view-details-btn">View Details</button>
            </div>
        </article>
    `;
}

function openEventModal(event) {
    const modal = document.getElementById('event-modal');
    const body = document.getElementById('modal-body');
    if(!modal || !body) return;
    
    const images = event.images && event.images.length ? event.images : (event.image ? [event.image] : ['assets/images/ssc-logo.jpg']);
    const heroImage = images[0];
    
    const startDate = new Date(event.startDate);
    const endDate = event.endDate ? new Date(event.endDate) : null;
    const dateRange = endDate && endDate.getTime() !== startDate.getTime()
        ? `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
        : startDate.toLocaleDateString();

    const linksHtml = event.links && Object.keys(event.links).length > 0 ? `
        <div class="modal-links">
            <h3>Related Links</h3>
            <div class="links-grid">
                ${Object.entries(event.links).map(([label, url]) => `
                    <a href="${url}" target="_blank" rel="noopener noreferrer" class="link-btn">
                         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                        ${escapeHtml(label)}
                    </a>
                `).join('')}
            </div>
        </div>
    ` : '';
    
    const galleryHtml = images.length > 1 ? `
        <div class="modal-gallery">
            <h3>Gallery (${images.length} photos)</h3>
            <div class="gallery-grid">
                ${images.map((img, idx) => `
                    <div class="gallery-item" onclick="document.dispatchEvent(new CustomEvent('openLightbox', {detail: {index: ${idx}, images: ${JSON.stringify(images).replace(/"/g, '&quot;')}}}));">
                        <img src="${img}" alt="Gallery ${idx+1}">
                    </div>
                `).join('')}
            </div>
        </div>
    ` : '';

    body.innerHTML = `
        <img src="${heroImage}" class="modal-hero-image">
        <h1 class="modal-title">${escapeHtml(event.title)}</h1>
        <div class="modal-meta-row">
            <span>📅 ${dateRange}</span>
            <span>📍 ${escapeHtml(event.location)}</span>
            <span>👤 ${escapeHtml(event.organizer || 'SSC')}</span>
        </div>
        <div class="modal-summary">${escapeHtml(event.summary)}</div>
        ${linksHtml}
        ${galleryHtml}
    `;
    
    // Attach gallery listeners properly
    if(images.length > 1) {
        body.querySelectorAll('.gallery-item').forEach((item, idx) => {
            item.onclick = () => openLightbox(idx, images);
        });
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    const closeBtn = modal.querySelector('.modal-close');
    if(closeBtn) {
        const newClose = closeBtn.cloneNode(true);
        closeBtn.parentNode.replaceChild(newClose, closeBtn);
        newClose.addEventListener('click', closeEventModal);
    }
}

function closeEventModal() {
    const modal = document.getElementById('event-modal');
    if(modal) modal.classList.remove('active');
    document.body.style.overflow = '';
}

function openLightbox(index, images) {
    if (!images || images.length === 0) return;
    currentLightboxIndex = index;
    lightboxImages = images;

    let lightbox = document.getElementById('lightbox-modal');
    if (!lightbox) {
        lightbox = document.createElement('div');
        lightbox.id = 'lightbox-modal';
        lightbox.className = 'lightbox';
        lightbox.innerHTML = `
            <span class="lightbox-close">&times;</span>
            <img class="lightbox-content" id="lightbox-img">
            <div class="lightbox-caption"></div>
            <a class="lightbox-prev">&#10094;</a>
            <a class="lightbox-next">&#10095;</a>
        `;
        document.body.appendChild(lightbox);
        lightbox.querySelector('.lightbox-close').onclick = closeLightbox;
        lightbox.querySelector('.lightbox-prev').onclick = () => changeSlide(-1);
        lightbox.querySelector('.lightbox-next').onclick = () => changeSlide(1);
        lightbox.onclick = (e) => { if(e.target === lightbox) closeLightbox(); }
    }
    
    updateLightboxImage();
    lightbox.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox-modal');
    if (lightbox) lightbox.style.display = 'none';
    if (!document.getElementById('event-modal')?.classList.contains('active')) {
         document.body.style.overflow = '';
    }
}

function changeSlide(n) {
    currentLightboxIndex += n;
    if (currentLightboxIndex >= lightboxImages.length) currentLightboxIndex = 0;
    if (currentLightboxIndex < 0) currentLightboxIndex = lightboxImages.length - 1;
    updateLightboxImage();
}

function updateLightboxImage() {
    const img = document.getElementById('lightbox-img');
    const caption = document.querySelector('.lightbox-caption');
    if (img) img.src = lightboxImages[currentLightboxIndex];
    if (caption) caption.textContent = `Image ${currentLightboxIndex + 1} of ${lightboxImages.length}`;
}

function hideLoading() {
    const loading = document.getElementById('loading');
    if(loading) loading.style.display = 'none';
}

function showError() {
    const grid = document.getElementById('events-grid');
    if (grid) grid.innerHTML = '<p class="error-msg">Failed to load events. Please try again later.</p>';
}

function setupListeners() {
    // Mobile Dropdown Logic
    const mobileTrigger = document.getElementById('mobile-filter-trigger');
    const mobileMenu = document.getElementById('mobile-filter-menu');
    const mobileItems = document.querySelectorAll('.dropdown-item');

    if (mobileTrigger && mobileMenu) {
        const newTrigger = mobileTrigger.cloneNode(true);
        mobileTrigger.parentNode.replaceChild(newTrigger, mobileTrigger);
        newTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            mobileMenu.classList.toggle('show');
        });

        document.addEventListener('click', (e) => {
            if (mobileMenu && newTrigger && !mobileMenu.contains(e.target) && !newTrigger.contains(e.target)) {
                mobileMenu.classList.remove('show');
            }
        });

        mobileItems.forEach(item => {
            const newItem = item.cloneNode(true);
            item.parentNode.replaceChild(newItem, item);
            newItem.addEventListener('click', () => {
                const semester = newItem.dataset.filter;
                document.querySelectorAll('.filter-btn').forEach(b => {
                    if(b.dataset.filter === semester) b.click();
                });
                mobileMenu.classList.remove('show');
            });
        });
    }

    document.querySelectorAll('.desktop-only .filter-btn').forEach(btn => {
         const newBtn = btn.cloneNode(true);
         btn.parentNode.replaceChild(newBtn, btn);
         newBtn.addEventListener('click', () => {
             document.querySelectorAll('.desktop-only .filter-btn').forEach(b => b.classList.remove('active'));
             newBtn.classList.add('active');
             currentFilter = newBtn.dataset.filter;
             
             const mobileLabel = document.getElementById('mobile-filter-label');
             if (mobileLabel) {
                 mobileLabel.textContent = currentFilter === 'all' ? 'All Events' :
                                          currentFilter === '1st' ? '1st Semester' : 
                                          currentFilter === '2nd' ? '2nd Semester' : 'All Events';
             }
             document.querySelectorAll('.dropdown-item').forEach(item => {
                 if(item.dataset.filter === currentFilter) item.classList.add('active');
                 else item.classList.remove('active');
             });

             renderEvents();
         });
    });

    const sortBtn = document.getElementById('btn-sort-trigger');
     if(sortBtn) {
        const newSort = sortBtn.cloneNode(true);
        sortBtn.parentNode.replaceChild(newSort, sortBtn);
        newSort.addEventListener('click', () => {
             currentSort = currentSort === 'newest' ? 'oldest' : 'newest';
             const sortLabel = document.getElementById('sort-label');
             if (sortLabel) sortLabel.textContent = currentSort === 'newest' ? 'Newest' : 'Oldest';
             const svg = newSort.querySelector('svg');
             if (svg) svg.style.transform = currentSort === 'newest' ? 'rotate(0)' : 'rotate(180deg)';
             renderEvents();
        });
    }
}
