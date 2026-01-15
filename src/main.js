


const path = window.location.pathname;

// Global error handler for images to replace inline onerror
document.addEventListener('error', function(e) {
    if (e.target.tagName.toLowerCase() === 'img') {
        e.target.style.display = 'none';
    }
}, true); // useCapture to catch error events which don't bubble

async function boot() {
    console.log('App Booting...', path);



    if (path.endsWith('index.html') || path === '/' || path.endsWith('/')) {
        const mod = await import('./modules/home.js');
        mod.init();
    } 
    else if (path.includes('intramural.html')) {
        const mod = await import('./modules/intramurals.js');
        mod.init();
    }
    else if (path.includes('officers.html')) {
        const mod = await import('./modules/officers.js');
        mod.init();
    }
    else if (path.includes('announcements.html')) {
        const mod = await import('./modules/announcements.js');
        mod.init();
    }
    else if (path.includes('events.html')) {
        const mod = await import('./modules/events.js');
        mod.init();
    }

}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
} else {
    boot();
}
