// src/modules/announcements.js
import { fetchJSON } from '../lib/dataLoader.js';
import { normalizeAnnouncements } from '../lib/normalize.js';
import { escapeHtml } from '../lib/utils.js';

let allAnnouncements = [];
let currentFilters = { semester: '' };
let sortOrder = 'desc';
let currentPage = 1;
const itemsPerPage = 4;

export async function init() {
    console.log('Initializing Announcements Module');
    try {
        const data = await fetchJSON('data/announcements.json', {
            cache: true,
            ttl: 300,
            adapter: normalizeAnnouncements
        });
        
        if (data) {
            allAnnouncements = data;
            const sortLabel = document.getElementById('sort-label');
            if (sortLabel) sortLabel.textContent = 'Newest';
            updateFilterCounts();
            render();
            setupListeners();
        }
    } catch (e) {
        console.error('Announcements load failed', e);
    }
}

function updateFilterCounts() {
    const baseFiltered = allAnnouncements;
    const countAll = baseFiltered.length;
    const count1st = baseFiltered.filter(item => item.semester === '1st').length;
    const count2nd = baseFiltered.filter(item => item.semester === '2nd').length;

    const allBadge = document.getElementById('count-all');
    const firstBadge = document.getElementById('count-1st');
    const secondBadge = document.getElementById('count-2nd');

    if (allBadge) allBadge.textContent = countAll;
    if (firstBadge) firstBadge.textContent = count1st;
    if (secondBadge) secondBadge.textContent = count2nd;

    // Mobile Counts
    const mAll = document.getElementById('count-all-mobile');
    const m1st = document.getElementById('count-1st-mobile');
    const m2nd = document.getElementById('count-2nd-mobile');
    
    if (mAll) mAll.textContent = countAll;
    if (m1st) m1st.textContent = count1st;
    if (m2nd) m2nd.textContent = count2nd;
}

function render() {
    const grid = document.getElementById('announcements-grid');
    const paginationContainer = document.getElementById('pagination-controls');
    if (!grid) return;

    // 1. Filter
    // 1. Filter
    if(currentFilters.semester) {
        // Normalize now handles semester correctly
    }
    
    let filtered = allAnnouncements.filter(item => {
        if (currentFilters.semester && item.semester !== currentFilters.semester) return false;
        return true;
    });

    // 2. Sort
    filtered.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.date);
        const dateB = new Date(b.createdAt || b.date);
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    // 3. Pagination
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    if (currentPage > totalPages) currentPage = totalPages || 1;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = filtered.slice(startIndex, endIndex);

    // 4. Render
    if (totalItems === 0) {
        grid.innerHTML = '<div class="empty-state"><h3>No announcements found</h3><p>Try changing your filters.</p></div>';
        if(paginationContainer) paginationContainer.innerHTML = '';
        return;
    }

    grid.innerHTML = paginatedItems.map(item => `
        <article class="card announcement-card">
            ${item.image ? `
            <div class="card-image">
                <img src="${item.image}" alt="${escapeHtml(item.title)}" loading="lazy" onerror="this.parentElement.style.display='none'">
            </div>
            ` : ''}
            <div class="card-content">
                <div class="card-meta">
                    <span class="card-category">${escapeHtml(item.category || 'General')}</span>
                    <span class="card-dot">•</span>
                    <span class="card-date">${item.displayDate || formatDate(item.createdAt || item.date)}</span>
                </div>
                <h3 class="card-title">${escapeHtml(item.title)}</h3>
                <p class="card-excerpt">${escapeHtml(item.content.substring(0, 150))}...</p>
                ${item.gallery && item.gallery.length > 1 ? `<div class="card-gallery-indicator"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg> ${item.gallery.length} photos</div>` : ''}
                
                <div class="card-details">
                    <div class="detail-item">
                        <span class="detail-label">Semester</span>
                        <span class="detail-value">${escapeHtml(item.semester || 'N/A')} Semester</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Posted By</span>
                        <span class="detail-value">${escapeHtml(item.author || 'SSC')}</span>
                    </div>
                </div>
            </div>
        </article>
    `).join('');

    renderPagination(totalPages, paginationContainer);

    // End Message
    const existingEndMessage = document.querySelector('.end-message');
    if (existingEndMessage) existingEndMessage.remove();

    if (currentPage === totalPages && totalItems > 0) {
        const msg = document.createElement('div');
        msg.className = 'end-message';
        msg.textContent = 'End of the announcements';
        if(paginationContainer) paginationContainer.after(msg);
    }
}

function renderPagination(totalPages, container) {
    if (!container) return;
    container.innerHTML = '';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'pagination-btn';
    prevBtn.innerHTML = '<<';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => { if(currentPage > 1) { currentPage--; render(); window.scrollTo({top: 0, behavior: 'smooth'}); }};
    container.appendChild(prevBtn);

    // Determine how many page numbers to show based on screen width
    const maxButtons = window.innerWidth <= 480 ? 3 : window.innerWidth <= 768 ? 5 : 7;
    
    let startPage, endPage;
    
    if (totalPages <= maxButtons) {
        // Show all pages if total is less than max
        startPage = 1;
        endPage = totalPages;
    } else {
        // Calculate which pages to show
        const halfButtons = Math.floor(maxButtons / 2);
        
        if (currentPage <= halfButtons) {
            startPage = 1;
            endPage = maxButtons;
        } else if (currentPage + halfButtons >= totalPages) {
            startPage = totalPages - maxButtons + 1;
            endPage = totalPages;
        } else {
            startPage = currentPage - halfButtons;
            endPage = currentPage + halfButtons;
        }
    }
    
    // Add page number buttons
    for (let i = startPage; i <= endPage; i++) {
        const btn = document.createElement('button');
        btn.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
        btn.textContent = i;
        btn.onclick = () => { currentPage = i; render(); window.scrollTo({top: 0, behavior: 'smooth'}); };
        container.appendChild(btn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.className = 'pagination-btn';
    nextBtn.innerHTML = '>>';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => { if(currentPage < totalPages) { currentPage++; render(); window.scrollTo({top: 0, behavior: 'smooth'}); }};
    container.appendChild(nextBtn);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

function setupListeners() {
    // Filter buttons (Desktop)
    const filterButtons = document.querySelectorAll('.desktop-only .filter-btn');
    filterButtons.forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener('click', () => {
            handleFilterChange(newBtn.dataset.semester);
        });
    });

    // Mobile Dropdown Logic
    const mobileTrigger = document.getElementById('mobile-filter-trigger');
    const mobileMenu = document.getElementById('mobile-filter-menu');
    const mobileItems = document.querySelectorAll('.dropdown-item');

    if (mobileTrigger && mobileMenu) {
        // Toggle menu - use direct reference
        const newTrigger = mobileTrigger.cloneNode(true);
        mobileTrigger.parentNode.replaceChild(newTrigger, mobileTrigger);
        newTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            mobileMenu.classList.toggle('show');
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (mobileMenu && newTrigger && !mobileMenu.contains(e.target) && !newTrigger.contains(e.target)) {
                mobileMenu.classList.remove('show');
            }
        });

        // Mobile items selection
        mobileItems.forEach(item => {
            const newItem = item.cloneNode(true);
            item.parentNode.replaceChild(newItem, item);
            newItem.addEventListener('click', () => {
                handleFilterChange(newItem.dataset.semester);
                mobileMenu.classList.remove('show');
            });
        });
    }

    const sortBtn = document.getElementById('btn-sort-trigger');
    if(sortBtn) {
        const newSort = sortBtn.cloneNode(true);
        sortBtn.parentNode.replaceChild(newSort, sortBtn);
        
        newSort.addEventListener('click', () => {
             sortOrder = sortOrder === 'desc' ? 'asc' : 'desc';
             const sortLabel = document.getElementById('sort-label');
             if (sortLabel) sortLabel.textContent = sortOrder === 'desc' ? 'Newest' : 'Oldest';
             const svg = newSort.querySelector('svg');
             if (svg) svg.style.transform = sortOrder === 'desc' ? 'rotate(0)' : 'rotate(180deg)';
             currentPage = 1; 
             render();
        });
    }
}

function handleFilterChange(semester) {
    currentFilters.semester = semester;
    currentPage = 1;
    
    // Update Desktop UI
    document.querySelectorAll('.desktop-only .filter-btn').forEach(b => {
        if(b.dataset.semester === semester) b.classList.add('active');
        else b.classList.remove('active');
    });

    // Update Mobile UI
    document.querySelectorAll('.dropdown-item').forEach(b => {
        if(b.dataset.semester === semester) b.classList.add('active');
        else b.classList.remove('active');
    });

    const mobileLabel = document.getElementById('mobile-filter-label');
    if (mobileLabel) {
        mobileLabel.textContent = semester === '1st' ? '1st Semester' : 
                                 semester === '2nd' ? '2nd Semester' : 'All Announcements';
    }

    render();
}
