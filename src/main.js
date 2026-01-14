


const path = window.location.pathname;

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
