document.addEventListener('DOMContentLoaded', () => {

    const DATA_URL = 'data/announcements.json';
    

    let allAnnouncements = [];
    let currentFilters = {
        semester: ''
    };
    let sortOrder = 'desc'; 
    let currentPage = 1;
    const itemsPerPage = 4;
    const grid = document.getElementById('announcements-grid');
    const paginationContainer = document.getElementById('pagination-controls');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const sortBtn = document.getElementById('btn-sort-trigger');
    const sortLabel = document.getElementById('sort-label');
    

    init();

    async function init() {
        allAnnouncements = await fetchData(DATA_URL);
        if (allAnnouncements) {
             if (sortLabel) sortLabel.textContent = 'Newest';
             updateFilterCounts();
             render();
        }
    }

    async function fetchData(url) {
        try {
            const response = await fetch(url);
            return await response.json();
        } catch (error) {
            console.error('Error loading data:', error);
            return [];
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
    }


    function render() {
        if (!grid) return;
        

        let filtered = allAnnouncements.filter(item => {
            if (currentFilters.semester && item.semester !== currentFilters.semester) return false;
            return true;
        });


        filtered.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });


        const totalItems = filtered.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        
        if (currentPage > totalPages) currentPage = totalPages || 1;
        if (currentPage < 1) currentPage = 1;

        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedItems = filtered.slice(startIndex, endIndex);


        if (totalItems === 0) {
            grid.innerHTML = '<div class="empty-state"><h3>No announcements found</h3><p>Try changing your filters.</p></div>';
            paginationContainer.innerHTML = '';
            return;
        }

        grid.innerHTML = paginatedItems.map(item => `
            <article class="card announcement-card">
                <div class="card-content">
                    <div class="card-meta">
                        <span class="card-category">${item.category || 'General'}</span>
                        <span class="card-dot">•</span>
                        <span class="card-date">${formatDate(item.date)}</span>
                    </div>
                    <h3 class="card-title">${item.title}</h3>
                    <p class="card-excerpt">${item.content}</p>
                    
                    <div class="card-details">
                        <div class="detail-item">
                            <span class="detail-label">Semester</span>
                            <span class="detail-value">${item.semester || 'N/A'} Semester</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Posted By</span>
                            <span class="detail-value">${item.author || 'SSC'}</span>
                        </div>
                    </div>
                </div>
            </article>
        `).join('');
        
        renderPagination(totalPages);


        const existingEndMessage = document.querySelector('.end-message');
        if (existingEndMessage) existingEndMessage.remove();

        if (currentPage === totalPages && totalItems > 0) {
            const msg = document.createElement('div');
            msg.className = 'end-message';
            msg.textContent = 'End of the announcements';
            paginationContainer.after(msg);
        }
    }

    function renderPagination(totalPages) {
        if (!paginationContainer) return;
        paginationContainer.innerHTML = '';
        

        const prevBtn = document.createElement('button');
        prevBtn.className = 'pagination-btn';
        prevBtn.innerHTML = '<<';
        prevBtn.disabled = currentPage === 1;
        prevBtn.onclick = () => { if(currentPage > 1) { currentPage--; render(); window.scrollTo({top: 0, behavior: 'smooth'}); }};
        paginationContainer.appendChild(prevBtn);


        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement('button');
            btn.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
            btn.textContent = i;
            btn.onclick = () => { currentPage = i; render(); window.scrollTo({top: 0, behavior: 'smooth'}); };
            paginationContainer.appendChild(btn);
        }


        const nextBtn = document.createElement('button');
        nextBtn.className = 'pagination-btn';
        nextBtn.innerHTML = '>>';
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.onclick = () => { if(currentPage < totalPages) { currentPage++; render(); window.scrollTo({top: 0, behavior: 'smooth'}); }};
        paginationContainer.appendChild(nextBtn);
    }

    function formatDate(dateString) {
        return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    }


    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilters.semester = btn.dataset.semester;
            currentPage = 1;
            render();
        });
    });

    sortBtn.addEventListener('click', () => {
        sortOrder = sortOrder === 'desc' ? 'asc' : 'desc';
        if (sortLabel) sortLabel.textContent = sortOrder === 'desc' ? 'Newest' : 'Oldest';
        const svg = sortBtn.querySelector('svg');
        if (svg) svg.style.transform = sortOrder === 'desc' ? 'rotate(0)' : 'rotate(180deg)';
        currentPage = 1;
        render();
    });
});

