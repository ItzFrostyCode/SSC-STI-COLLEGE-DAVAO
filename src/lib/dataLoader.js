

const inMemoryCache = new Map();


export async function fetchJSON(url, { cache = true, ttl = 3600, adapter = null } = {}) {
    const key = `data_cache_${url}`;
    const now = Date.now();

    
    if (cache && inMemoryCache.has(key)) {
        const { ts, data } = inMemoryCache.get(key);
        if ((now - ts) / 1000 < ttl) {
            return adapter ? adapter(data) : data;
        }
    }

    
    if (cache) {
        try {
            const stored = localStorage.getItem(key);
            if (stored) {
                const { ts, data } = JSON.parse(stored);
                if ((now - ts) / 1000 < ttl) {
                    
                    inMemoryCache.set(key, { ts, data });
                    return adapter ? adapter(data) : data;
                }
            }
        } catch (e) {
            console.warn('LocalStorage access failed', e);
        }
    }

    
    try {
        
        const cacheBuster = `?v=${Date.now()}`;
        const fetchUrl = url.includes('?') ? `${url}&v=${Date.now()}` : `${url}${cacheBuster}`;
        const response = await fetch(fetchUrl);
        if (!response.ok) throw new Error(`Failed to load ${url}: ${response.status}`);
        const rawData = await response.json();

        
        if (cache) {
            const cacheEntry = { ts: now, data: rawData };
            inMemoryCache.set(key, cacheEntry);
            try {
                localStorage.setItem(key, JSON.stringify(cacheEntry));
            } catch (e) {
                console.warn('LocalStorage write failed', e);
            }
        }

        return adapter ? adapter(rawData) : rawData;

    } catch (error) {
        console.error(`Error fetching ${url}:`, error);
        throw error;
    }
}
