document.addEventListener('DOMContentLoaded', () => {
    
    const hamburger = document.querySelector('.hamburger');
    const nav = document.querySelector('.main-nav');
    const overlay = document.querySelector('.nav-overlay');

    if (hamburger && nav) {
        hamburger.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.sfx) window.sfx.playSound('click');
            nav.classList.toggle('active');
            if (overlay) overlay.classList.toggle('active');
        });

        const closeMenu = () => {
            nav.classList.remove('active');
            if (overlay) overlay.classList.remove('active');
        };

        if (overlay) {
            overlay.addEventListener('click', closeMenu);
        }

        nav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', closeMenu);
        });

        document.addEventListener('click', (e) => {
            if (nav.classList.contains('active') && !nav.contains(e.target) && !hamburger.contains(e.target)) {
                closeMenu();
            }
        });
    }

    const searchBar = document.querySelector('.search-bar');
    const searchBtn = document.querySelector('.search-toggle-btn');
    const searchInput = searchBar ? searchBar.querySelector('input') : null;

    if (searchBar && searchBtn && searchInput) {
        searchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (window.sfx) window.sfx.playSound('click');
            
            const isExpanded = searchBar.classList.contains('expanded');
            
            if (isExpanded) {
                if (searchInput.value.trim() !== '') {
                    console.log("Searching for:", searchInput.value);
                    // Implement actual search logic here or redirect
                } else {
                    searchInput.blur();
                    searchBar.classList.remove('expanded');
                }
            } else {
                searchBar.classList.add('expanded');
                searchInput.focus();
            }
        });

        document.addEventListener('click', (e) => {
            if (searchBar.classList.contains('expanded') && !searchBar.contains(e.target)) {
                searchBar.classList.remove('expanded');
            }
        });
    }

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
    }
    // Default to light mode if no saved preference

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            if (htmlElement.classList.contains('dark')) {
                setTheme('light');
            } else {
                setTheme('dark');
            }
        });
    }

    const dText = document.querySelector('.d-text');
    const mText = document.querySelector('.m-text');
    const subtitle = document.querySelector('.header-subtitle');

    function updateHeaderText() {
        if (!dText || !mText) return;
        
        if (window.innerWidth <= 480) {
            dText.style.setProperty('display', 'none', 'important');
            mText.style.setProperty('display', 'block', 'important');
            if (subtitle) subtitle.style.setProperty('display', 'none', 'important');
        } else {
            dText.style.setProperty('display', 'inline', 'important');
            mText.style.setProperty('display', 'none', 'important');
            if (subtitle) subtitle.style.setProperty('display', 'block', '');
        }
    }

    updateHeaderText();
    window.addEventListener('resize', updateHeaderText);
});