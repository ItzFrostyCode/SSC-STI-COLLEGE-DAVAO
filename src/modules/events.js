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
    
    // Listeners for view details (now card click or button click)
    grid.querySelectorAll('.event-card').forEach(card => {
        card.addEventListener('click', (e) => {
            const title = card.querySelector('.event-title').textContent;
            const event = allEvents.find(ev => ev.title === title);
            if(event) openEventModal(event);
        });
    });
}

function getAvatarUrl(organizer) {
    const avatarMap = {
        'Cherry Jane Villasencio - PIO': 'assets/images/officers/cherry-jane-villasencio.webp',
        'Cherry Jane Villasencio': 'assets/images/officers/cherry-jane-villasencio.webp',
        'SSC Events Committee': 'assets/images/homepage/ssc-logo-removebg.webp'
    };
    return avatarMap[organizer] || 'assets/images/homepage/ssc-logo-removebg.webp';
}

function createEventCard(event) {
    const firstImage = (event.images && event.images[0]) || event.image || 'assets/images/homepage/ssc-logo.webp';
    const startDate = new Date(event.startDate);
    
    const organizer = event.organizer || event.author || 'SSC';
    const avatar = getAvatarUrl(organizer);

    return `
        <article class="event-card fade-in">
            <div class="card-image">
                <img src="${firstImage}" alt="${escapeHtml(event.title)}" loading="lazy">
                <div class="card-overlay"></div>
                
                <div class="card-date-badge">
                    <span class="day">${startDate.getDate()}</span>
                    <span class="month">${startDate.toLocaleString('en-US', { month: 'short' })}</span>
                </div>
            </div>
            
            <div class="card-content">
                <div class="event-category-pill">${escapeHtml(event.category)}</div>
                <h2 class="event-title">${escapeHtml(event.title)}</h2>
                <p class="event-desc-short">
                    ${escapeHtml(event.summary || event.description || '')}
                </p>
                
                <div class="event-meta">
                     <div class="meta-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                        <span>${escapeHtml(event.location || 'STI College Davao')}</span>
                     </div>
                </div>
            </div>

            <div class="card-footer">
                <div class="organizer-info">
                    <img src="${avatar}" class="organizer-avatar">
                    <span class="organizer-name">${escapeHtml(organizer)}</span>
                </div>
                <button class="card-action-btn" aria-label="View Details">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>
                </button>
            </div>
        </article>
    `;
}

// Initialized per modal open
let currentModalImages = [];
let currentModalImageIndex = 0;

function openEventModal(event) {
    const modal = document.getElementById('event-modal');
    // We recreate modal content structure because we changed from plain body to specific structure
    // Ideally, we should just inject into the right places, but for this redesign, we are replacing the innerHTML of .modal-content
    
    // Note: The HTML structure in events.html has a .modal-content with a .modal-close and .modal-body.
    // For this redesign, we will replace the ENTIRE content of .modal-content to match the split view.
    const modalContent = modal.querySelector('.modal-content');
    if(!modalContent) return;

    currentModalImages = event.images && event.images.length ? event.images : (event.image ? [event.image] : ['assets/images/homepage/ssc-logo.webp']);
    currentModalImageIndex = 0;
    
    const startDate = new Date(event.startDate);
    const endDate = event.endDate ? new Date(event.endDate) : null;
    const dateRange = endDate && endDate.getTime() !== startDate.getTime()
        ? `${startDate.toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'})} - ${endDate.toLocaleDateString(undefined, {month:'short', day:'numeric'})}`
        : startDate.toLocaleDateString(undefined, {weekday:'long', year:'numeric', month:'long', day:'numeric'});

    // Generate Thumbnails
    const thumbsHtml = currentModalImages.length > 1 ? `
        <div class="modal-thumbs">
            ${currentModalImages.map((img, idx) => `
                <div class="modal-thumb ${idx === 0 ? 'active' : ''}" data-index="${idx}">
                    <img src="${img}" alt="Thumbnail ${idx+1}">
                </div>
            `).join('')}
        </div>
    ` : '';

    // Generate Split Layout HTML
    modalContent.innerHTML = `
        <button class="modal-close-new" aria-label="Close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>

        <div class="modal-visuals">
            <img src="${currentModalImages[0]}" class="modal-main-image" id="modal-main-img">
            ${currentModalImages.length > 1 ? `
                <button class="modal-nav-btn modal-prev">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </button>
                <button class="modal-nav-btn modal-next">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </button>
            ` : ''}
        </div>
        
        <div class="modal-info">
            
            <div class="modal-category">${escapeHtml(event.category)}</div>
            <h1 class="modal-headline">${escapeHtml(event.title)}</h1>
            
            <div class="modal-meta-grid">
                <div class="meta-row">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    <span>${dateRange}</span>
                </div>
                <div class="meta-row">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                    <span>${escapeHtml(event.location || 'STI College Davao')}</span>
                </div>
                <div class="meta-row">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    <span>${escapeHtml(event.organizer || 'SSC')}</span>
                </div>
            </div>
            
            <div class="modal-desc-text">${escapeHtml(event.summary)}</div>
            
            ${event.links && Object.keys(event.links).length > 0 ? `
                <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid var(--border-light);">
                    <h3 style="font-size:1rem; font-weight:700; margin-bottom:1rem;">Related Links</h3>
                     <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
                        ${Object.entries(event.links).map(([label, url]) => `
                             <a href="${url}" target="_blank" class="btn-control" style="background:var(--accent-blue); color:white; border:none; padding: 0.5rem 1rem;">
                                ${escapeHtml(label)}
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                            </a>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            ${thumbsHtml}
        </div>
    `;

    // Attach Listeners
    modalContent.querySelector('.modal-close-new').addEventListener('click', closeEventModal);

    if(currentModalImages.length > 1) {
        // Nav Buttons
        modalContent.querySelector('.modal-prev').addEventListener('click', () => changeModalSlide(-1));
        modalContent.querySelector('.modal-next').addEventListener('click', () => changeModalSlide(1));

        // Thumbnail Clicks
        modalContent.querySelectorAll('.modal-thumb').forEach(thumb => {
            thumb.addEventListener('click', () => {
                const idx = parseInt(thumb.dataset.index);
                setModalSlide(idx);
            });
        });
        
        // Fullscreen the main image on click (Lightbox)
        modalContent.querySelector('#modal-main-img').style.cursor = 'zoom-in';
        modalContent.querySelector('#modal-main-img').addEventListener('click', () => {
             openLightbox(currentModalImageIndex, currentModalImages);
        });
    } else {
        // Single image lightbox also supported
        modalContent.querySelector('#modal-main-img').style.cursor = 'zoom-in';
        modalContent.querySelector('#modal-main-img').addEventListener('click', () => {
             openLightbox(0, currentModalImages);
        });
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function changeModalSlide(n) {
    let newIndex = currentModalImageIndex + n;
    if(newIndex >= currentModalImages.length) newIndex = 0;
    if(newIndex < 0) newIndex = currentModalImages.length - 1;
    setModalSlide(newIndex);
}

function setModalSlide(index) {
    currentModalImageIndex = index;
    const imgElement = document.getElementById('modal-main-img');
    if(imgElement) {
        // Fade effect
        imgElement.style.opacity = 0;
        setTimeout(() => {
            imgElement.src = currentModalImages[index];
            imgElement.style.opacity = 1;
        }, 150);
    }
    
    // Update active thumb
    document.querySelectorAll('.modal-thumb').forEach(thumb => {
        if(parseInt(thumb.dataset.index) === index) thumb.classList.add('active');
        else thumb.classList.remove('active');
        

        // Scroll thumb into view (Horizontal only to prevent page jump)
        if(thumb.classList.contains('active')) {
            const container = thumb.parentNode;
            const scrollLeft = thumb.offsetLeft - (container.clientWidth / 2) + (thumb.clientWidth / 2);
            container.scrollTo({
                left: scrollLeft,
                behavior: 'smooth'
            });
        }
    });
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
        // Reuse existing CSS for lightbox (global styles)
        lightbox.innerHTML = `
            <span class="lightbox-close">&times;</span>
            <div class="lightbox-content-wrapper" style="position:relative; width:100%; height:100%; display:flex; justify-content:center; align-items:center;">
                <img class="lightbox-content" id="lightbox-img" style="max-height:90vh; max-width:90vw; object-fit:contain;">
                <div class="lightbox-caption" style="position:absolute; bottom:20px; color:white; background:rgba(0,0,0,0.5); padding:5px 10px; border-radius:4px;"></div>
            </div>
            <a class="lightbox-prev" style="position:absolute; top:50%; left:20px; color:white; font-size:40px; cursor:pointer; user-select:none;">&#10094;</a>
            <a class="lightbox-next" style="position:absolute; top:50%; right:20px; color:white; font-size:40px; cursor:pointer; user-select:none;">&#10095;</a>
        `;
        document.body.appendChild(lightbox);
        lightbox.querySelector('.lightbox-close').onclick = closeLightbox;
        lightbox.querySelector('.lightbox-prev').onclick = () => changeSlide(-1);
        lightbox.querySelector('.lightbox-next').onclick = () => changeSlide(1);
        lightbox.onclick = (e) => { if(e.target === lightbox || e.target.classList.contains('lightbox-content-wrapper')) closeLightbox(); }
    }
    
    updateLightboxImage();
    lightbox.style.display = 'block';
    
    // Ensure z-index is higher than modal
    lightbox.style.zIndex = '10000';
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox-modal');
    if (lightbox) lightbox.style.display = 'none';
    // If event modal is NOT active, restore overflow. If it IS active, leave overflow hidden.
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

    // Modal Overlay Close Listener
    const modalOverlay = document.querySelector('.modal-overlay');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', closeEventModal);
    }

    // Global Keyboard Navigation (Arrows & Escape)
    document.addEventListener('keydown', (e) => {
        const lightbox = document.getElementById('lightbox-modal');
        const eventModal = document.getElementById('event-modal');

        // Lightbox takes precedence
        if (lightbox && lightbox.style.display === 'block') {
            if (e.key === 'ArrowLeft') changeSlide(-1);
            if (e.key === 'ArrowRight') changeSlide(1);
            if (e.key === 'Escape') closeLightbox();
            return;
        }

        // Event Modal
        if (eventModal && eventModal.classList.contains('active')) {
            // Only navigate if we have multiple images
            if (currentModalImages.length > 1) {
                if (e.key === 'ArrowLeft') changeModalSlide(-1);
                if (e.key === 'ArrowRight') changeModalSlide(1);
            }
            if (e.key === 'Escape') closeEventModal();
        }
    });
}
