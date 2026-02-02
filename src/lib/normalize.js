


export function normalizeAnnouncements(raw) {
    if (!Array.isArray(raw)) return [];
    
    
    return raw.sort((a, b) => new Date(b.date) - new Date(a.date)).map(item => ({
        ...item, 
        title: item.title || 'Untitled',
        content: item.content || '',
        date: item.date || new Date().toISOString(),
        category: item.category || 'General',
        author: item.author || 'SSC',
        showOnIndex: item.showOnIndex !== false 
    }));
}


export function normalizeEvents(raw) {
    if (!Array.isArray(raw)) return [];
    
    return raw.map(item => ({
        title: item.title || 'Untitled Event',
        summary: item.summary || item.description || item.content || '',
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


export function normalizeIntramurals(raw) {
    if (!raw) return { teams: [], schedule: [], final_tally: {}, categories: [] };

    
    const teams = Array.isArray(raw.teams) ? raw.teams : [];
    
    
    const schedule = Array.isArray(raw.schedule) ? raw.schedule : [];

    
    const final_tally = raw.final_tally || {};

    
    const categories = Array.isArray(raw.categories) ? raw.categories : [];

    return {
        ...raw, 
        teams,
        schedule,
        final_tally,
        categories
    };
}


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
