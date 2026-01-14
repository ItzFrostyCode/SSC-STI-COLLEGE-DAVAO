document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. Mobile Navigation Logic ---
    const hamburger = document.querySelector('.hamburger');
    const nav = document.querySelector('.main-nav');
    const overlay = document.querySelector('.nav-overlay');

    if (hamburger && nav) {
        hamburger.addEventListener('click', (e) => {
            e.stopPropagation();
            nav.classList.toggle('active');
            if (overlay) overlay.classList.toggle('active');
        });

        const closeMenu = () => {
            nav.classList.remove('active');
            if (overlay) overlay.classList.remove('active');
        };

        // Close when clicking overlay
        if (overlay) {
            overlay.addEventListener('click', closeMenu);
        }

        // Close when clicking a link
        nav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', closeMenu);
        });

        // Close when clicking outside (fallback)
        document.addEventListener('click', (e) => {
            if (nav.classList.contains('active') && !nav.contains(e.target) && !hamburger.contains(e.target)) {
                closeMenu();
            }
        });
    }

    // --- 2. Search Bar Logic (Expand/Collapse) ---
    const searchBar = document.querySelector('.search-bar');
    const searchBtn = document.querySelector('.search-toggle-btn');
    const searchInput = searchBar ? searchBar.querySelector('input') : null;

    if (searchBar && searchBtn && searchInput) {
        searchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Toggle expansion
            const isExpanded = searchBar.classList.contains('expanded');
            
            if (isExpanded) {
                 // If already expanded, check if we should submit or close
                 if (searchInput.value.trim() !== '') {
                     console.log("Searching for:", searchInput.value);
                     // In real app, submit form here
                 } else {
                     // Empty input -> Close
                     searchBar.classList.remove('expanded');
                     searchInput.blur();
                 }
            } else {
                // Expand
                searchBar.classList.add('expanded');
                searchInput.focus();
            }
        });

        // Close search when clicking outside
        document.addEventListener('click', (e) => {
            if (searchBar.classList.contains('expanded') && !searchBar.contains(e.target)) {
                searchBar.classList.remove('expanded');
            }
        });
    }

    // --- 3. Theme Toggle Logic ---
    const themeToggle = document.querySelector('.theme-toggle');
    const htmlElement = document.documentElement;

    const setTheme = (theme) => {
        if (theme === 'dark') {
            htmlElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            htmlElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    };

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        setTheme(savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setTheme('dark');
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            if (htmlElement.classList.contains('dark')) {
                setTheme('light');
            } else {
                setTheme('dark');
            }
        });
    }
});