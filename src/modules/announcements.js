// src/modules/announcements.js
import { fetchJSON } from '../lib/dataLoader.js';
import { normalizeAnnouncements } from '../lib/normalize.js';
import { escapeHtml } from '../lib/utils.js';

let allAnnouncements = [];
let currentFilters = { 
    category: 'all', 
    dateFilter: { year: '', month: '', day: '' }
};
let sortOrder = 'desc';

// Config: ID of the announcement to pin. If null/empty, defaults to latest.
const PINNED_ANNOUNCEMENT_ID = "ANN-2026-002";

export async function init() {
    console.log('Initializing Announcements Dashboard');
    try {
        const data = await fetchJSON('data/announcements.json', {
            cache: true,
            ttl: 300, // Cache for 5 minutes to prevent lag on reload
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

/* ================================= 
   Date Picker Initialization
   ================================= */
function initializeDatePicker() {
    // Populate years (only 2025-2026 academic year)
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
    
    // Populate days (1-31)
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

/* ================================= 
   1. Categories Sidebar logic
   ================================= */
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

/* ================================= 
   2. Pinned Post Logic
   ================================= */
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
    
    // Add View Post functionality
    const viewPostBtn = container.querySelector('.view-post-btn');
    if (viewPostBtn) {
        viewPostBtn.addEventListener('click', (e) => {
            e.preventDefault();
            scrollToPost(pinnedItem.id);
        });
    }
}

/* ================================= 
   Scroll to Post Helper
   ================================= */
function scrollToPost(postId) {
    const postCard = document.querySelector(`[data-announcement-id="${postId}"]`);
    if (postCard) {
        postCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Add highlight effect
        postCard.style.transition = 'all 0.3s ease';
        postCard.style.boxShadow = '0 0 0 3px var(--accent-blue)';
        setTimeout(() => {
            postCard.style.boxShadow = '';
        }, 2000);
    }
}

/* ================================= 
   3. Main Feed Logic
   ================================= */
function renderFeed() {
    const feed = document.getElementById('announcements-feed');
    const paginationContainer = document.getElementById('pagination-controls');
    if (!feed) return;

    // Filter by category
    let filtered = allAnnouncements.filter(item => {
        if (currentFilters.category !== 'all' && item.category !== currentFilters.category) return false;
        return true;
    });

    // Filter by date (year, month, day)
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
        feed.innerHTML = '<div class="empty-state"><h3>No announcements found</h3><p>Try changing your filters.</p></div>';
        return;
    }

    feed.innerHTML = filtered.map(item => `
        <article class="announcement-card" data-announcement-id="${item.id}">
            <div class="card-header">
                <img src="${item.authorAvatar || 'assets/images/webp/ssc-logo.webp'}" alt="Author" class="card-author-avatar">
                <div class="card-meta">
                    <span class="card-author">${escapeHtml(item.author || 'SSC Admin')}</span>
                    <span class="card-time">${item.displayDate || formatDate(item.date)}</span>
                </div>
            </div>
            
            <div class="card-body">
                <h3 class="card-title">${escapeHtml(item.title)}</h3>
                <p class="card-excerpt">${escapeHtml(item.content)}</p>
                
                ${item.image ? `
                <div class="card-image">
                    <img src="${item.image}" alt="${escapeHtml(item.title)}" loading="lazy">
                </div>
                ` : ''}

                ${item.hashtags ? `
                <div class="card-tags">
                    ${item.hashtags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
                </div>
                ` : ''}
            </div>
        </article>
    `).join('');
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
    // Category Buttons
    document.getElementById('category-list')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.category-btn');
        if (btn) {
            currentFilters.category = btn.dataset.category;
            renderCategories();
            renderFeed();
            window.scrollTo({top: 0, behavior: 'smooth'});
        }
    });

    // Pinned Section Toggle (Mobile)
    const pinnedToggleBtn = document.getElementById('pinned-toggle-btn');
    const pinnedSection = document.querySelector('.announcement-pinned');

    if (pinnedToggleBtn && pinnedSection) {
        pinnedToggleBtn.addEventListener('click', () => {
            pinnedToggleBtn.classList.toggle('active');
            pinnedSection.classList.toggle('show');
        });
    }

    // Date Filter Dropdown
    const dateFilterTrigger = document.getElementById('date-filter-trigger');
    const dateFilterMenu = document.getElementById('date-filter-menu');
    const dateFilterLabel = document.getElementById('date-filter-label');
    const yearSelect = document.getElementById('year-select');
    const monthSelect = document.getElementById('month-select');
    const daySelect = document.getElementById('day-select');
    const clearBtn = document.getElementById('clear-date-btn');
    const applyBtn = document.getElementById('apply-date-btn');
    
    if (dateFilterTrigger && dateFilterMenu) {
        // Toggle dropdown
        dateFilterTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            dateFilterTrigger.classList.toggle('active');
            dateFilterMenu.classList.toggle('show');
        });
        
        // Clear button
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                yearSelect.value = '';
                monthSelect.value = '';
                daySelect.value = '';
            });
        }
        
        // Apply button
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                currentFilters.dateFilter = {
                    year: yearSelect.value,
                    month: monthSelect.value,
                    day: daySelect.value
                };
                
                // Update label
                const parts = [];
                if (daySelect.value) parts.push(daySelect.value);
                if (monthSelect.value) {
                    const monthName = monthSelect.options[monthSelect.selectedIndex].text;
                    parts.push(monthName);
                }
                if (yearSelect.value) parts.push(yearSelect.value);
                
                dateFilterLabel.textContent = parts.length > 0 ? parts.join(' ') : 'Select Date';
                
                // Close dropdown
                dateFilterTrigger.classList.remove('active');
                dateFilterMenu.classList.remove('show');
                
                // Render and scroll
                renderFeed();
                window.scrollTo({top: 0, behavior: 'smooth'});
            });
        }
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!dateFilterTrigger.contains(e.target) && !dateFilterMenu.contains(e.target)) {
                dateFilterTrigger.classList.remove('active');
                dateFilterMenu.classList.remove('show');
            }
        });
    }

    // Sort Toggle Button
    const sortBtn = document.getElementById('sort-select-btn');
    const sortLabel = document.getElementById('sort-label');
    
    if (sortBtn && sortLabel) {
        sortBtn.addEventListener('click', () => {
            sortOrder = sortOrder === 'desc' ? 'asc' : 'desc';
            sortLabel.textContent = sortOrder === 'desc' ? 'Newest' : 'Oldest';
            renderFeed();
        });
    }
}
