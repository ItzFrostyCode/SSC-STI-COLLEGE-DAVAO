// src/lib/normalize.js

/**
 * Normalize Announcements Data
 * Ensures consistent shape: { title, content, date, category }
 */
export function normalizeAnnouncements(raw) {
    if (!Array.isArray(raw)) return [];
    
    // Sort by date desc
    return raw.sort((a, b) => new Date(b.date) - new Date(a.date)).map(item => ({
        title: item.title || 'Untitled',
        content: item.content || '',
        date: item.date || new Date().toISOString(),
        category: item.category || 'General',
        semester: item.semester || '',
        author: item.author || 'SSC',
        displayDate: item.displayDate || null,
        createdAt: item.createdAt || null,
        showOnIndex: item.showOnIndex !== false // Default true unless false
    }));
}

/**
 * Normalize Events Data
 * Ensures consistent shape: { title, summary, startDate, location, category }
 */
export function normalizeEvents(raw) {
    if (!Array.isArray(raw)) return [];
    
    return raw.map(item => ({
        title: item.title || 'Untitled Event',
        summary: item.summary || item.content?.substring(0, 100) || '',
        startDate: item.startDate || item.date || new Date().toISOString(),
        endDate: item.endDate || null,
        location: item.location || 'TBA',
        category: item.category || 'Event',
        image: item.image || null,
        images: item.images || [],
        organizer: item.organizer || item.author || 'SSC',
        semester: item.semester || '',
        links: item.links || {},
        id: item.id || btoa(item.title + item.startDate).slice(0, 8)
    }));
}

/**
 * Normalize Intramurals Data
 * Ensures consistent shape for logic: { teams: [], schedule: [], final_tally: {}, categories: [] }
 */
export function normalizeIntramurals(raw) {
    if (!raw) return { teams: [], schedule: [], final_tally: {}, categories: [] };

    // Ensure teams exists
    const teams = Array.isArray(raw.teams) ? raw.teams : [];
    
    // Ensure schedule exists
    const schedule = Array.isArray(raw.schedule) ? raw.schedule : [];

    // Ensure final_tally exists
    const final_tally = raw.final_tally || {};

    // Ensure categories exists (for scoreboard)
    const categories = Array.isArray(raw.categories) ? raw.categories : [];

    return {
        ...raw, // Keep other props
        teams,
        schedule,
        final_tally,
        categories
    };
}

/**
 * Normalize Officers Data
 */
export function normalizeOfficers(raw) {
    if (!Array.isArray(raw)) return [];
    
    return raw.map(item => ({
        name: item.name || 'Unknown',
        position: item.position || '',
        department: item.department || '',
        image: item.image || '',
        order: item.order || 99
    }));
}
