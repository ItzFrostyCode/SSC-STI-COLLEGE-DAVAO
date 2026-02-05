
import { fetchJSON } from '../lib/dataLoader.js';
import { normalizeAnnouncements } from '../lib/normalize.js';
import { escapeHtml } from '../lib/utils.js';

let allAnnouncements = [];
let currentFilters = { 
    category: 'all', 
    dateFilter: { year: '', month: '', day: '' }
};
let sortOrder = 'desc';


const PINNED_ANNOUNCEMENT_ID = "ANN-2026-002";

export async function init() {
    console.log('Initializing Announcements Dashboard');
    try {
        const data = await fetchJSON('data/announcements.json?v=force_update_2', {
            cache: true,
            ttl: 300, 
            adapter: normalizeAnnouncements
        });
        
        if (data) {
            allAnnouncements = data;
            setupUI();
        }
    } catch (e) {
        console.error('Announcements load failed', e);
    }
}

function setupUI() {
    initializeDatePicker();
    renderCategories();
    renderPinned();
    renderFeed();
    setupListeners();
}


function initializeDatePicker() {
    
    const yearSelect = document.getElementById('year-select');
    if (yearSelect) {
        const years = [2026, 2025];
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        });
    }
    
    
    const daySelect = document.getElementById('day-select');
    if (daySelect) {
        for (let day = 1; day <= 31; day++) {
            const option = document.createElement('option');
            option.value = day;
            option.textContent = day;
            daySelect.appendChild(option);
        }
    }
}


function renderCategories() {
    const categoryList = document.getElementById('category-list');
    if (!categoryList) return;

    const categories = new Set(['All Updates']);
    allAnnouncements.forEach(item => {
        if (item.category) categories.add(item.category);
    });

    categoryList.innerHTML = '';

    categories.forEach(cat => {
        const li = document.createElement('li');
        const isAll = cat === 'All Updates';
        const value = isAll ? 'all' : cat;
        
        li.innerHTML = `
            <button class="category-btn ${currentFilters.category === value ? 'active' : ''}" 
                    data-category="${escapeHtml(value)}">
                ${escapeHtml(cat)}
                ${!isAll ? `<span class="count">${countByCategory(value)}</span>` : ''}
            </button>
        `;
        categoryList.appendChild(li);
    });
}

function countByCategory(category) {
    if (category === 'all') return allAnnouncements.length;
    return allAnnouncements.filter(item => item.category === category).length;
}


function renderPinned() {
    const container = document.getElementById('pinned-container');
    if (!container) return;

    let pinnedItem = allAnnouncements.find(item => item.id === PINNED_ANNOUNCEMENT_ID);
    
    if (!pinnedItem && allAnnouncements.length > 0) {
        pinnedItem = allAnnouncements[0];
    }

    if (!pinnedItem) {
        container.innerHTML = '<p class="text-muted">No pinned announcements.</p>';
        return;
    }

    container.innerHTML = `
        <article class="pinned-card">
            <h3 class="pinned-title">${escapeHtml(pinnedItem.title)}</h3>
            <p class="pinned-date">${pinnedItem.displayDate || formatDate(pinnedItem.date)}</p>
            <p class="pinned-excerpt" style="font-size: 0.9rem; color: var(--text-muted); margin-top: 0.5rem;">
                ${escapeHtml(pinnedItem.content.substring(0, 80))}...
            </p>
            <a href="#" class="btn-text view-post-btn" data-post-id="${pinnedItem.id}" style="font-size: 0.85rem; margin-top: 0.5rem; display: inline-block;">View Post &rarr;</a>
        </article>
    `;
    
    
    const viewPostBtn = container.querySelector('.view-post-btn');
    if (viewPostBtn) {
        viewPostBtn.addEventListener('click', (e) => {
            e.preventDefault();
            scrollToPost(pinnedItem.id);
        });
    }
}


function scrollToPost(postId) {
    const postCard = document.querySelector(`[data-announcement-id="${postId}"]`);
    if (postCard) {
        postCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        
        postCard.style.transition = 'all 0.3s ease';
        postCard.style.boxShadow = '0 0 0 3px var(--accent-blue)';
        setTimeout(() => {
            postCard.style.boxShadow = '';
        }, 2000);
    }
}


function renderFeed() {
    const feed = document.getElementById('announcements-feed');
    const paginationContainer = document.getElementById('pagination-controls');
    if (!feed) return;

    
    let filtered = allAnnouncements.filter(item => {
        if (currentFilters.category !== 'all' && item.category !== currentFilters.category) return false;
        return true;
    });

    
    const { year, month, day } = currentFilters.dateFilter;
    if (year || month || day) {
        filtered = filtered.filter(item => {
            const itemDate = new Date(item.createdAt || item.date);
            
            if (year && itemDate.getFullYear() !== parseInt(year)) return false;
            if (month && itemDate.getMonth() + 1 !== parseInt(month)) return false;
            if (day && itemDate.getDate() !== parseInt(day)) return false;
            
            return true;
        });
    }

    
    filtered.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.date);
        const dateB = new Date(b.createdAt || b.date);
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    if (paginationContainer) paginationContainer.innerHTML = '';

    if (filtered.length === 0) {
        feed.innerHTML = '<div class="empty-state"><h3>No announcements found</h3><p>Try changing your filters.</p></div>';
        return;
    }

    
    feed.innerHTML = '';
    filtered.forEach((item, index) => {
        const card = createFacebookCard(item, index);
        feed.appendChild(card);
    });
    
    
    setupToggleButtons();
    setupLightbox();
}


function createFacebookCard(post, postIndex) {
    const card = document.createElement('article');
    card.className = 'announcement-card';
    card.dataset.announcementId = post.id;
    
    
    const media = getMediaForPost(post);
    const mediaCount = media.length;
    const content = post.content || '';
    const title = post.title || '';
    
    
    const charLimit = 250;
    
    
    let descriptionHtml = '';
    
    
    if (title) {
        descriptionHtml += `<h3 class="card-title">${escapeHtml(title)}</h3>`;
    }
    
    
    const shouldUseLargeText = mediaCount === 0 && content.length < 80;
    
    if (shouldUseLargeText) {
        descriptionHtml += `<p class="card-excerpt large-text">${formatContent(content)}</p>`;
    } else if (content.length > charLimit) {
        
        const toggleId = `toggle-${post.id}`;
        const visibleText = content.substring(0, charLimit);
        const hiddenText = content.substring(charLimit);
        
        descriptionHtml += `
            <p class="card-excerpt">
                <span>${formatContent(visibleText)}</span><span class="dots-${toggleId}">...</span><span class="more-${toggleId}" style="display:none;">${formatContent(hiddenText)}</span>
                <span class="see-more-btn" data-toggle-id="${toggleId}">See more</span>
            </p>
        `;
    } else if (content) {
        descriptionHtml += `<p class="card-excerpt">${formatContent(content)}</p>`;
    }
    
    
    let gridHtml = '';
    if (mediaCount > 0) {
        gridHtml = createMediaGrid(media, postIndex);
    }
    
    
    let hashtagsHtml = '';
    if (post.hashtags && post.hashtags.length > 0) {
        hashtagsHtml = `
            <div class="card-tags">
                ${post.hashtags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
            </div>
        `;
    }
    
    
    card.innerHTML = `
        <div class="card-header">
            <img src="${post.authorAvatar || 'assets/images/homepage/ssc-logo-opt.webp'}" alt="${escapeHtml(post.author || 'SSC Admin')}" class="card-author-avatar">
            <div class="card-meta">
                <span class="card-author">${escapeHtml(post.author || 'SSC Admin')}</span>
                <span class="card-time">${post.displayDate || formatDate(post.date)}</span>
            </div>
        </div>
        <div class="card-body">
            ${descriptionHtml}
            ${hashtagsHtml}
        </div>
        ${gridHtml}
    `;
    
    return card;
}


function getMediaForPost(post) {
    let mediaItems = [];
    
    
    if (post.media && Array.isArray(post.media)) {
        mediaItems = post.media;
    }
    
    else if (post.gallery && Array.isArray(post.gallery)) {
        mediaItems = post.gallery.map(item => {
            if (typeof item === 'string') {
                return { type: detectMediaType(item), url: item };
            }
            return item;
        });
    }
    
    else if (post.images && Array.isArray(post.images)) {
        mediaItems = post.images.map(url => ({ type: 'image', url }));
    }
    
    else if (post.videos && Array.isArray(post.videos)) {
        mediaItems = post.videos.map(url => ({ type: 'video', url }));
    }
    
    else if (post.image && post.image !== "#") {
        mediaItems = [{ type: 'image', url: post.image }];
    }
    
    else if (post.video && post.video !== "#") {
        mediaItems = [{ type: 'video', url: post.video }];
    }
    
    
    return mediaItems.filter(item => {
        const url = typeof item === 'string' ? item : item.url;
        return url && url.length > 2 && url !== "#";
    }).map(item => {
        
        if (typeof item === 'string') {
            return { type: detectMediaType(item), url: item };
        }
        return item;
    });
}


function detectMediaType(url) {
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'];
    const urlLower = url.toLowerCase();
    
    for (const ext of videoExtensions) {
        if (urlLower.endsWith(ext)) {
            return 'video';
        }
    }
    
    return 'image';
}


function isVideo(mediaItem) {
    return mediaItem.type === 'video';
}


function createMediaGrid(mediaItems, postIndex) {
    const count = mediaItems.length;
    let gridClass = '';
    let visible = (count >= 5) ? 5 : count;
    
    
    if (count === 1) gridClass = 'grid-1';
    else if (count === 2) gridClass = 'grid-2';
    else if (count === 3) gridClass = 'grid-3';
    else if (count === 4) gridClass = 'grid-4';
    else if (count >= 5) gridClass = 'grid-5-plus';
    
    
    const items = mediaItems.slice(0, visible).map((mediaItem, idx) => {
        const moreOverlay = (count > 5 && idx === 4) 
            ? `<div class="more-overlay">+${count - 5}</div>` 
            : '';
        
        const mediaUrl = mediaItem.url;
        const isVideoItem = isVideo(mediaItem);
        
        let mediaElement;
        if (isVideoItem) {
            
            mediaElement = `
                <video preload="metadata" playsinline class="media-video">
                    <source src="${mediaUrl}" type="video/${getVideoType(mediaUrl)}">
                    Your browser does not support the video tag.
                </video>
                <div class="video-play-overlay">
                    <svg width="60" height="60" viewBox="0 0 60 60" fill="white">
                        <circle cx="30" cy="30" r="30" fill="rgba(0,0,0,0.6)"/>
                        <polygon points="23,15 23,45 45,30" fill="white"/>
                    </svg>
                </div>
            `;
        } else {
            
            mediaElement = `<img src="${mediaUrl}" alt="Announcement media ${idx + 1}" loading="lazy">`;
        }
        
        return `
            <div class="img-item ${isVideoItem ? 'video-item' : ''}" data-post-index="${postIndex}" data-media-index="${idx}">
                ${moreOverlay}
                ${mediaElement}
            </div>
        `;
    }).join('');
    
    return `<div class="image-grid ${gridClass}">${items}</div>`;
}


function getVideoType(url) {
    if (url.endsWith('.mp4')) return 'mp4';
    if (url.endsWith('.webm')) return 'webm';
    if (url.endsWith('.ogg')) return 'ogg';
    return 'mp4'; 
}


function setupToggleButtons() {
    
    const feed = document.getElementById('announcements-feed');
    if (!feed) return;
    
    
    const newFeed = feed.cloneNode(true);
    feed.parentNode.replaceChild(newFeed, feed);
    
    
    newFeed.addEventListener('click', (e) => {
        if (e.target.classList.contains('see-more-btn')) {
            const toggleId = e.target.dataset.toggleId;
            if (!toggleId) return;
            
            const dots = newFeed.querySelector(`.dots-${toggleId}`);
            const more = newFeed.querySelector(`.more-${toggleId}`);
            const btn = e.target;
            
            if (!dots || !more) return;
            
            if (dots.style.display === 'none') {
                dots.style.display = 'inline';
                more.style.display = 'none';
                btn.textContent = 'See more';
            } else {
                dots.style.display = 'none';
                more.style.display = 'inline';
                btn.textContent = 'See less';
            }
        }
    });
}


function formatContent(text) {
    if (!text) return '';
    
    const escaped = escapeHtml(text);
    
    return escaped.replace(/\n/g, '<br>');
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}


function setupListeners() {
    
    document.getElementById('category-list')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.category-btn');
        if (btn) {
            currentFilters.category = btn.dataset.category;
            renderCategories();
            renderFeed();
            window.scrollTo({top: 0, behavior: 'smooth'});
        }
    });

    
    const pinnedToggleBtn = document.getElementById('pinned-toggle-btn');
    const pinnedSection = document.querySelector('.announcement-pinned');

    if (pinnedToggleBtn && pinnedSection) {
        pinnedToggleBtn.addEventListener('click', () => {
            pinnedToggleBtn.classList.toggle('active');
            pinnedSection.classList.toggle('show');
        });
    }

    
    const dateFilterTrigger = document.getElementById('date-filter-trigger');
    const dateFilterMenu = document.getElementById('date-filter-menu');
    const dateFilterLabel = document.getElementById('date-filter-label');
    const yearSelect = document.getElementById('year-select');
    const monthSelect = document.getElementById('month-select');
    const daySelect = document.getElementById('day-select');
    const clearBtn = document.getElementById('clear-date-btn');
    const applyBtn = document.getElementById('apply-date-btn');
    
    if (dateFilterTrigger && dateFilterMenu) {
        
        dateFilterTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            dateFilterTrigger.classList.toggle('active');
            dateFilterMenu.classList.toggle('show');
        });
        
        
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                yearSelect.value = '';
                monthSelect.value = '';
                daySelect.value = '';
            });
        }
        
        
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                currentFilters.dateFilter = {
                    year: yearSelect.value,
                    month: monthSelect.value,
                    day: daySelect.value
                };
                
                
                const parts = [];
                if (daySelect.value) parts.push(daySelect.value);
                if (monthSelect.value) {
                    const monthName = monthSelect.options[monthSelect.selectedIndex].text;
                    parts.push(monthName);
                }
                if (yearSelect.value) parts.push(yearSelect.value);
                
                dateFilterLabel.textContent = parts.length > 0 ? parts.join(' ') : 'Select Date';
                
                
                dateFilterTrigger.classList.remove('active');
                dateFilterMenu.classList.remove('show');
                
                
                renderFeed();
                window.scrollTo({top: 0, behavior: 'smooth'});
            });
        }
        
        
        document.addEventListener('click', (e) => {
            if (!dateFilterTrigger.contains(e.target) && !dateFilterMenu.contains(e.target)) {
                dateFilterTrigger.classList.remove('active');
                dateFilterMenu.classList.remove('show');
            }
        });
    }

    
    const sortBtn = document.getElementById('sort-select-btn');
    const sortLabel = document.getElementById('sort-label');
    
    if (sortBtn && sortLabel) {
        
        const newSort = sortBtn.cloneNode(true);
        sortBtn.parentNode.replaceChild(newSort, sortBtn);
        
        newSort.addEventListener('click', () => {
            sortOrder = sortOrder === 'desc' ? 'asc' : 'desc';
            sortLabel.textContent = sortOrder === 'desc' ? 'Newest' : 'Oldest';
            renderFeed();
        });
    }
}


let currentLightboxImages = [];
let currentLightboxIndex = 0;

function setupLightbox() {
    
    const mediaItems = document.querySelectorAll('.img-item');
    
    mediaItems.forEach(item => {
        item.addEventListener('click', function() {
            const postIndex = parseInt(this.dataset.postIndex);
            const mediaIndex = parseInt(this.dataset.mediaIndex);
            openLightbox(postIndex, mediaIndex);
        });
    });
    
    
    const lightbox = document.getElementById('announcement-lightbox');
    const closeBtn = document.querySelector('.lightbox-close-btn');
    const prevBtn = document.querySelector('.lightbox-prev');
    const nextBtn = document.querySelector('.lightbox-next');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeLightbox);
    }
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => changeImage(-1));
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => changeImage(1));
    }
    
    
    if (lightbox) {
        lightbox.addEventListener('click', (e) => {
            if (e.target.id === 'announcement-lightbox') {
                closeLightbox();
            }
        });
    }
    
    
    document.addEventListener('keydown', handleLightboxKeyboard);
}

function openLightbox(postIndex, mediaIndex) {
    
    let filtered = allAnnouncements.filter(item => {
        if (currentFilters.category !== 'all' && item.category !== currentFilters.category) return false;
        return true;
    });
    
    const { year, month, day } = currentFilters.dateFilter;
    if (year || month || day) {
        filtered = filtered.filter(item => {
            const itemDate = new Date(item.createdAt || item.date);
            if (year && itemDate.getFullYear() !== parseInt(year)) return false;
            if (month && itemDate.getMonth() + 1 !== parseInt(month)) return false;
            if (day && itemDate.getDate() !== parseInt(day)) return false;
            return true;
        });
    }
    
    filtered.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.date);
        const dateB = new Date(b.createdAt || b.date);
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
    
    
    const post = filtered[postIndex];
    if (!post) return;
    
    currentLightboxImages = getMediaForPost(post);
    currentLightboxIndex = mediaIndex;
    
    if (currentLightboxImages.length === 0) return;
    
    showLightboxMedia(currentLightboxIndex);
    
    const lightbox = document.getElementById('announcement-lightbox');
    if (lightbox) {
        lightbox.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeLightbox() {
    
    const lightboxVideo = document.getElementById('lightbox-video');
    if (lightboxVideo) {
        lightboxVideo.pause();
        lightboxVideo.currentTime = 0;
    }
    
    const lightbox = document.getElementById('announcement-lightbox');
    if (lightbox) {
        lightbox.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

function changeImage(step) {
    
    const lightboxVideo = document.getElementById('lightbox-video');
    if (lightboxVideo) {
        lightboxVideo.pause();
    }
    
    currentLightboxIndex += step;
    
    
    if (currentLightboxIndex >= currentLightboxImages.length) {
        currentLightboxIndex = 0;
    } else if (currentLightboxIndex < 0) {
        currentLightboxIndex = currentLightboxImages.length - 1;
    }
    
    showLightboxMedia(currentLightboxIndex);
}

function showLightboxMedia(index) {
    const mediaItem = currentLightboxImages[index];
    if (!mediaItem) return;
    
    const wrapper = document.querySelector('.lightbox-content-wrapper');
    if (!wrapper) return;
    
    const isVideoItem = isVideo(mediaItem);
    
    
    wrapper.style.opacity = '0.5';
    
    setTimeout(() => {
        if (isVideoItem) {
            
            wrapper.innerHTML = `
                <video id="lightbox-video" controls autoplay class="lightbox-media">
                    <source src="${mediaItem.url}" type="video/${getVideoType(mediaItem.url)}">
                    Your browser does not support the video tag.
                </video>
            `;
        } else {
            
            wrapper.innerHTML = `<img id="lightbox-img" src="${mediaItem.url}" alt="Gallery Media" class="lightbox-media">`;
        }
        
        
        wrapper.style.opacity = '1';
    }, 100);
}

function handleLightboxKeyboard(e) {
    const lightbox = document.getElementById('announcement-lightbox');
    if (!lightbox || lightbox.style.display !== 'flex') return;
    
    if (e.key === 'ArrowLeft') {
        changeImage(-1);
    } else if (e.key === 'ArrowRight') {
        changeImage(1);
    } else if (e.key === 'Escape') {
        closeLightbox();
    }
}
