
import { fetchJSON } from '../lib/dataLoader.js';
import { normalizeAnnouncements } from '../lib/normalize.js';
import { escapeHtml } from '../lib/utils.js';

let allAnnouncements = [];
let currentFilters = { 
    category: 'all', 
    dateFilter: { year: '', month: '', day: '' }
};
let sortOrder = 'desc';

// Lazy loading state
let postsPerLoad = 3;
let currentlyDisplayed = 0;
let filteredAnnouncements = [];
let isLoading = false;

// Search state
let searchQuery = '';
let fuseInstance = null;

// Pull to refresh state (mobile)
let pullStartY = 0;
let pullMoveY = 0;
let isPulling = false;
let pullThreshold = 80;


const PINNED_ANNOUNCEMENT_ID = "ANN-2026-002";

export async function init() {
    console.log('Initializing Announcements Dashboard');
    try {
        // Use timestamp to prevent caching and always get fresh data
        const timestamp = new Date().getTime();
        const data = await fetchJSON(`data/announcements.json?t=${timestamp}`, {
            cache: false,  // Disable caching
            adapter: normalizeAnnouncements
        });
        
        if (data) {
            allAnnouncements = data;
            
            // Initialize Fuse.js for search
            fuseInstance = new Fuse(allAnnouncements, {
                keys: ['title', 'content', 'category', 'author'],
                threshold: 0.3,  // 0 = exact match, 1 = very fuzzy
                includeScore: true,
                minMatchCharLength: 2
            });
            
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
    showSkeletonLoaders(); // Show loaders initially
    renderFeed();
    setupListeners();
    setupPullToRefresh(); // Mobile pull-to-refresh
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

    // Start with all announcements or search results
    let filtered;
    if (searchQuery && fuseInstance) {
        // Use Fuse.js search
        const searchResults = fuseInstance.search(searchQuery);
        filtered = searchResults.map(result => result.item);
    } else {
        filtered = allAnnouncements;
    }
    
    // Apply category filter
    filtered = filtered.filter(item => {
        if (currentFilters.category !== 'all' && item.category !== currentFilters.category) return false;
        return true;
    });

    // Apply date filter
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

    // Sort
    filtered.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.date);
        const dateB = new Date(b.createdAt || b.date);
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    if (paginationContainer) paginationContainer.innerHTML = '';

    if (filtered.length === 0) {
        feed.innerHTML = '';
        const emptyType = searchQuery || currentFilters.category !== 'all' || year || month || day ? 'no-results' : 'no-announcements';
        feed.appendChild(createEmptyState(emptyType));
        // Show footer when no results
        toggleFooter(true);
        updateActiveFilterIndicators();
        return;
    }

    // Store filtered announcements and reset display counter
    filteredAnnouncements = filtered;
    currentlyDisplayed = 0;
    
    // Hide footer initially if there are posts to load
    toggleFooter(false);
    
    // Update active filter indicators
    updateActiveFilterIndicators();
    
    // Clear feed and load initial posts
    feed.innerHTML = '';
    loadMorePosts();
}


function loadMorePosts() {
    if (isLoading) return;
    
    const feed = document.getElementById('announcements-feed');
    if (!feed) return;
    
    // Check if there are more posts to load
    if (currentlyDisplayed >= filteredAnnouncements.length) {
        // All posts loaded, show footer
        toggleFooter(true);
        return;
    }
    
    isLoading = true;
    
    // Calculate which posts to load
    const endIndex = Math.min(currentlyDisplayed + postsPerLoad, filteredAnnouncements.length);
    const postsToLoad = filteredAnnouncements.slice(currentlyDisplayed, endIndex);
    
    // Preload all media for posts before displaying them
    const preloadPromises = postsToLoad.map(post => preloadPostMedia(post));
    
    Promise.all(preloadPromises).then(() => {
        // All media loaded, now render the posts
        postsToLoad.forEach((item, batchIndex) => {
            const overallIndex = currentlyDisplayed + batchIndex;
            const card = createFacebookCard(item, overallIndex);
            feed.appendChild(card);
        });
        
        currentlyDisplayed = endIndex;
        isLoading = false;
        
        // Check if all posts are now loaded
        if (currentlyDisplayed >= filteredAnnouncements.length) {
            toggleFooter(true);
        }
        
        // Setup interactions for newly added posts
        setupToggleButtons();
        setupLightbox();
    }).catch(() => {
        // Even if some media fails to load, still show the posts
        postsToLoad.forEach((item, batchIndex) => {
            const overallIndex = currentlyDisplayed + batchIndex;
            const card = createFacebookCard(item, overallIndex);
            feed.appendChild(card);
        });
        
        currentlyDisplayed = endIndex;
        isLoading = false;
        
        // Check if all posts are now loaded
        if (currentlyDisplayed >= filteredAnnouncements.length) {
            toggleFooter(true);
        }
        
        setupToggleButtons();
        setupLightbox();
    });
}

// Toggle footer visibility
function toggleFooter(show) {
    const footer = document.getElementById('footer');
    if (footer) {
        footer.style.display = show ? 'block' : 'none';
    }
}

function preloadPostMedia(post) {
    return new Promise((resolve) => {
        const mediaItems = getMediaForPost(post);
        
        if (mediaItems.length === 0) {
            resolve();
            return;
        }
        
        const loadPromises = mediaItems.map(media => {
            return new Promise((mediaResolve) => {
                if (media.type === 'video') {
                    // For videos, just resolve immediately (they'll load when played)
                    mediaResolve();
                } else {
                    // For images, preload them
                    const img = new Image();
                    img.onload = () => mediaResolve();
                    img.onerror = () => mediaResolve(); // Resolve even on error
                    img.src = media.url;
                }
            });
        });
        
        // Wait for all media in this post to load
        Promise.all(loadPromises).then(resolve);
    });
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
        mediaItems = [{ type: detectMediaType(post.image), url: post.image }];
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
    
    // Search input listener with debounce
    const searchInput = document.getElementById('announcement-search-input');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    
    if (searchInput) {
        let searchTimeout;
        
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            
            // Show/hide clear button
            if (clearSearchBtn) {
                clearSearchBtn.style.display = query ? 'block' : 'none';
            }
            
            // Debounce search (wait 300ms after user stops typing)
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                searchQuery = query;
                renderFeed();
            }, 300);
        });
    }
    
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            if (searchInput) {
                searchInput.value = '';
                searchQuery = '';
                clearSearchBtn.style.display = 'none';
                renderFeed();
            }
        });
    }
    
    // Infinite scroll listener
    window.addEventListener('scroll', () => {
        // Check if we're near the bottom of the page (within 300px)
        const scrollPosition = window.innerHeight + window.scrollY;
        const pageHeight = document.documentElement.scrollHeight;
        
        if (scrollPosition >= pageHeight - 300 && !isLoading) {
            loadMorePosts();
        }
    });
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
    // Use the same filtered list that's displayed on the page
    const post = filteredAnnouncements[postIndex];
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
                <video id="lightbox-video" controls class="lightbox-media">
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

// ========================================
// SKELETON LOADERS
// ========================================

function showSkeletonLoaders(count = 3) {
    const feed = document.getElementById('announcements-feed');
    if (!feed) return;
    
    feed.innerHTML = '';
    for (let i = 0; i < count; i++) {
        feed.appendChild(createSkeletonCard());
    }
}

function createSkeletonCard() {
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton-card';
    skeleton.innerHTML = `
        <div class="skeleton-header">
            <div class="skeleton-avatar"></div>
            <div class="skeleton-text">
                <div class="skeleton-line title"></div>
                <div class="skeleton-line subtitle"></div>
            </div>
        </div>
        <div class="skeleton-line content"></div>
        <div class="skeleton-line content"></div>
        <div class="skeleton-line content"></div>
        <div class="skeleton-image"></div>
    `;
    return skeleton;
}




// ========================================
// PULL TO REFRESH (Mobile)
// ========================================

function setupPullToRefresh() {
    if (!isMobileDevice()) return;
    
    const announcementsContainer = document.querySelector('.announcements-container');
    if (!announcementsContainer) return;
    
    // Create indicator
    const indicator = document.createElement('div');
    indicator.className = 'pull-to-refresh-indicator';
    indicator.innerHTML = `
        <svg class="pull-to-refresh-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
        </svg>
    `;
    document.body.appendChild(indicator);
    
    announcementsContainer.addEventListener('touchstart', (e) => {
        if (window.scrollY === 0) {
            pullStartY = e.touches[0].clientY;
            isPulling = true;
        }
    });
    
    announcementsContainer.addEventListener('touchmove', (e) => {
        if (!isPulling || window.scrollY > 0) return;
        
        pullMoveY = e.touches[0].clientY - pullStartY;
        
        if (pullMoveY > 0 && pullMoveY < pullThreshold * 1.5) {
            indicator.style.transform = `translateX(-50%) scale(${pullMoveY / pullThreshold})`;
            const rotation = (pullMoveY / pullThreshold) * 360;
            indicator.querySelector('.pull-to-refresh-icon').style.transform = `rotate(${rotation}deg)`;
        }
    });
    
    announcementsContainer.addEventListener('touchend', async () => {
        if (!isPulling) return;
        
        if (pullMoveY > pullThreshold) {
            indicator.classList.add('visible', 'loading');
            
            // Refresh data
            await init();
            
            setTimeout(() => {
                indicator.classList.remove('visible', 'loading');
                indicator.style.transform = 'translateX(-50%) scale(0)';
            }, 500);
        } else {
            indicator.style.transform = 'translateX(-50%) scale(0)';
        }
        
        isPulling = false;
        pullStartY = 0;
        pullMoveY = 0;
    });
}

function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
        || window.innerWidth <= 768;
}


// ========================================
// ACTIVE FILTER INDICATORS
// ========================================

function updateActiveFilterIndicators() {
    const dateFilterTrigger = document.getElementById('date-filter-trigger');
    if (!dateFilterTrigger) return;
    
    // Remove existing badge
    const existingBadge = dateFilterTrigger.querySelector('.filter-badge');
    if (existingBadge) existingBadge.remove();
    
    // Count active filters
    let activeCount = 0;
    const { year, month, day } = currentFilters.dateFilter;
    if (year) activeCount++;
    if (month) activeCount++;
    if (day) activeCount++;
    if (currentFilters.category !== 'all') activeCount++;
    if (searchQuery) activeCount++;
    
    // Add badge if there are active filters
    if (activeCount > 0) {
        const badge = document.createElement('span');
        badge.className = 'filter-badge';
        badge.textContent = activeCount;
        dateFilterTrigger.appendChild(badge);
    }
    
    // Show active filters summary
    showActiveFiltersSummary();
}

function showActiveFiltersSummary() {
    const searchWrapper = document.querySelector('.announcement-search-wrapper');
    if (!searchWrapper) return;
    
    // Remove existing summary
    const existingSummary = document.querySelector('.active-filters-summary');
    if (existingSummary) existingSummary.remove();
    
    const filters = [];
    
    if (currentFilters.category !== 'all') {
        filters.push({ type: 'category', label: currentFilters.category });
    }
    
    const { year, month, day } = currentFilters.dateFilter;
    if (year || month || day) {
        const dateParts = [];
        if (day) dateParts.push(day);
        if (month) {
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            dateParts.push(monthNames[parseInt(month) - 1]);
        }
        if (year) dateParts.push(year);
        filters.push({ type: 'date', label: dateParts.join(' ') });
    }
    
    if (searchQuery) {
        filters.push({ type: 'search', label: `"${searchQuery}"` });
    }
    
    if (filters.length === 0) return;
    
    const summary = document.createElement('div');
    summary.className = 'active-filters-summary';
    
    filters.forEach(filter => {
        const chip = document.createElement('div');
        chip.className = 'filter-chip';
        chip.innerHTML = `
            <span>${escapeHtml(filter.label)}</span>
            <span class="filter-chip-remove" data-filter-type="${filter.type}">✕</span>
        `;
        summary.appendChild(chip);
    });
    
    searchWrapper.parentElement.insertBefore(summary, searchWrapper.nextSibling);
    
    // Add click handlers for removal
    summary.querySelectorAll('.filter-chip-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const filterType = e.target.dataset.filterType;
            removeFilter(filterType);
        });
    });
}

function removeFilter(filterType) {
    if (filterType === 'category') {
        currentFilters.category = 'all';
        renderCategories();
    } else if (filterType === 'date') {
        currentFilters.dateFilter = { year: '', month: '', day: '' };
        document.getElementById('year-select').value = '';
        document.getElementById('month-select').value = '';
        document.getElementById('day-select').value = '';
        document.getElementById('date-filter-label').textContent = 'Select Date';
    } else if (filterType === 'search') {
        searchQuery = '';
        const searchInput = document.getElementById('announcement-search-input');
        if (searchInput) searchInput.value = '';
        const clearBtn = document.getElementById('clear-search-btn');
        if (clearBtn) clearBtn.style.display = 'none';
    }
    
    renderFeed();
    updateActiveFilterIndicators();
}


// ========================================
// IMPROVED EMPTY STATES
// ========================================

function createEmptyState(type = 'no-results') {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    
    const emptyStateConfigs = {
        'no-results': {
            icon: `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                    <path d="m11 8-2 2 2 2"></path>
                </svg>
            `,
            title: 'No Results Found',
            message: 'We couldn\'t find any announcements matching your search. Try adjusting your filters or search terms.',
            actions: [
                { label: 'Clear Filters', action: 'clearFilters', primary: true },
                { label: 'View All', action: 'viewAll', primary: false }
            ]
        },
        'no-announcements': {
            icon: `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
            `,
            title: 'No Announcements Yet',
            message: 'There are currently no announcements available. Check back soon for updates!',
            actions: []
        }
    };
    
    const config = emptyStateConfigs[type] || emptyStateConfigs['no-results'];
    
    let actionsHtml = '';
    if (config.actions.length > 0) {
        actionsHtml = '<div class="empty-state-actions">';
        config.actions.forEach(action => {
            const btnClass = action.primary ? 'primary' : 'secondary';
            actionsHtml += `<button class="empty-state-btn ${btnClass}" data-action="${action.action}">${escapeHtml(action.label)}</button>`;
        });
        actionsHtml += '</div>';
    }
    
    emptyState.innerHTML = `
        <div class="empty-state-icon">${config.icon}</div>
        <h3>${escapeHtml(config.title)}</h3>
        <p>${escapeHtml(config.message)}</p>
        ${actionsHtml}
    `;
    
    // Add event listeners for action buttons
    emptyState.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (action === 'clearFilters') {
                currentFilters = { category: 'all', dateFilter: { year: '', month: '', day: '' } };
                searchQuery = '';
                const searchInput = document.getElementById('announcement-search-input');
                if (searchInput) searchInput.value = '';
                renderCategories();
                renderFeed();
            } else if (action === 'viewAll') {
                currentFilters = { category: 'all', dateFilter: { year: '', month: '', day: '' } };
                searchQuery = '';
                renderCategories();
                renderFeed();
            }
        });
    });
    
    return emptyState;
}

