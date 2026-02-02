

class GlobalSearch {
    constructor() {
        this.searchInput = document.querySelector('.search-bar input');
        this.searchBar = document.querySelector('.search-bar');
        this.searchToggleBtn = document.querySelector('.search-toggle-btn');
        
        this.createDropdown();
        this.allData = {
            announcements: [],
            events: [],
            officers: [],
            intramurals: {
                teams: [],
                events: []
            }
        };
        this.debounceTimer = null;
        this.init();
    }
    
    createDropdown() {
        this.dropdown = document.createElement('div');
        this.dropdown.className = 'search-dropdown';
        this.dropdown.style.display = 'none';
        this.searchBar.parentElement.appendChild(this.dropdown);
    }
    
    async init() {
        await this.loadAllData();
        this.searchInput.addEventListener('input', (e) => this.handleSearch(e));
        this.searchInput.addEventListener('focus', () => this.handleFocus());
        document.addEventListener('click', (e) => {
            if (!this.searchBar.parentElement.contains(e.target)) {
                this.hideDropdown();
            }
        });
        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideDropdown();
                this.searchInput.blur();
            }
        });
    }
    
    async loadAllData() {
        try {
            
            
            const basePath = 'data/';
            
            const announcementsRes = await fetch(basePath + 'announcements.json');
            this.allData.announcements = await announcementsRes.json();
            const eventsRes = await fetch(basePath + 'events.json');
            this.allData.events = await eventsRes.json();
            const officersRes = await fetch(basePath + 'officers.json');
            this.allData.officers = await officersRes.json();
            const intramuralsRes = await fetch(basePath + 'intramurals.json');
            const intramuralsData = await intramuralsRes.json();
            this.allData.intramurals.teams = intramuralsData.teams || [];
            this.allData.intramurals.events = intramuralsData.categories || [];
            
        } catch (error) {
            console.error('Error loading search data:', error);
        }
    }
    
    handleSearch(e) {
        const query = e.target.value.trim();
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            if (query.length === 0) {
                this.hideDropdown();
                return;
            }
            
            if (query.length < 2) {
                this.showDropdown([{
                    type: 'hint',
                    content: 'Type at least 2 characters to search...'
                }]);
                return;
            }
            const results = this.search(query);
            this.displayResults(results, query);
        }, 300);
    }
    
    handleFocus() {
        const query = this.searchInput.value.trim();
        if (query.length >= 2) {
            const results = this.search(query);
            this.displayResults(results, query);
        }
    }
    
    search(query) {
        const lowerQuery = query.toLowerCase();
        const results = [];
        
        
        const urlPrefix = ''; 

        this.allData.announcements.forEach(item => {
            if (item.title?.toLowerCase().includes(lowerQuery) || 
                item.content?.toLowerCase().includes(lowerQuery)) {
                results.push({
                    type: 'announcement',
                    title: item.title,
                    subtitle: this.truncate(item.content, 60),
                    url: `${urlPrefix}announcements.html`,
                    icon: '📢',
                    data: item
                });
            }
        });
        this.allData.events.forEach(item => {
            if (item.title?.toLowerCase().includes(lowerQuery) || 
                item.category?.toLowerCase().includes(lowerQuery) ||
                item.location?.toLowerCase().includes(lowerQuery)) {
                results.push({
                    type: 'event',
                    title: item.title,
                    subtitle: `${item.category} • ${item.location}`,
                    url: `${urlPrefix}events.html`,
                    icon: '📅',
                    data: item
                });
            }
        });
        this.allData.officers.forEach(item => {
            if (item.name?.toLowerCase().includes(lowerQuery) || 
                item.role?.toLowerCase().includes(lowerQuery) ||
                item.department?.toLowerCase().includes(lowerQuery)) {
                results.push({
                    type: 'officer',
                    title: item.name,
                    subtitle: item.role,
                    url: `${urlPrefix}officers.html`,
                    icon: '👤',
                    data: item
                });
            }
        });
        this.allData.intramurals.teams.forEach(item => {
            if (item.name?.toLowerCase().includes(lowerQuery) || 
                item.department?.toLowerCase().includes(lowerQuery)) {
                results.push({
                    type: 'team',
                    title: item.name,
                    subtitle: `${item.department} • ${item.points} points`,
                    url: `${urlPrefix}intramural.html#teams-grid`,
                    icon: '🏆',
                    data: item
                });
            }
        });
        this.allData.intramurals.events.forEach(category => {
            category.events?.forEach(event => {
                if (event.name?.toLowerCase().includes(lowerQuery) ||
                    category.category?.toLowerCase().includes(lowerQuery)) {
                    results.push({
                        type: 'intramural-event',
                        title: event.name,
                        subtitle: `${category.category} • Intramurals`,
                        url: `${urlPrefix}intramural.html#results-section`,
                        icon: '🎯',
                        data: event
                    });
                }
            });
        });
        return results.slice(0, 8);
    }
    
    displayResults(results, query) {
        if (results.length === 0) {
            this.showDropdown([{
                type: 'no-results',
                content: `No results found for "${query}"`
            }]);
            return;
        }
        
        this.showDropdown(results);
    }
    
    showDropdown(items) {
        this.dropdown.innerHTML = '';
        
        if (items[0]?.type === 'hint' || items[0]?.type === 'no-results') {
            const hintDiv = document.createElement('div');
            hintDiv.className = 'search-hint';
            hintDiv.textContent = items[0].content;
            this.dropdown.appendChild(hintDiv);
        } else {
            items.forEach(item => {
                const resultItem = this.createResultItem(item);
                this.dropdown.appendChild(resultItem);
            });
        }
        
        this.dropdown.style.display = 'block';
    }
    
    hideDropdown() {
        this.dropdown.style.display = 'none';
    }
    
    createResultItem(item) {
        const div = document.createElement('div');
        div.className = 'search-result-item';
        div.setAttribute('data-type', item.type);
        
        div.innerHTML = `
            <span class="result-icon">${item.icon}</span>
            <div class="result-content">
                <div class="result-title">${this.highlightQuery(item.title)}</div>
                <div class="result-subtitle">${item.subtitle}</div>
            </div>
            <svg class="result-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
        `;
        
        div.addEventListener('click', () => {
            this.navigateTo(item.url);
        });
        
        return div;
    }
    
    highlightQuery(text) {
        const query = this.searchInput.value.trim();
        if (!query) return text;
        
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }
    
    navigateTo(url) {
        window.location.href = url;
    }
    
    truncate(text, length) {
        if (!text) return '';
        if (text.length <= length) return text;
        return text.substring(0, length) + '...';
    }
}
document.addEventListener('DOMContentLoaded', () => {
    new GlobalSearch();
});
