// src/lib/dataLoader.js

const inMemoryCache = new Map();

/**
 * Fetch JSON with Caching and TTL
 * @param {string} url - The URL to fetch
 * @param {Object} options - { cache: boolean, ttl: number (seconds), adapter: function }
 * @returns {Promise<any>}
 */
export async function fetchJSON(url, { cache = true, ttl = 3600, adapter = null } = {}) {
    const key = `data_cache_${url}`;
    const now = Date.now();

    // 1. Check In-Memory Cache
    if (cache && inMemoryCache.has(key)) {
        const { ts, data } = inMemoryCache.get(key);
        if ((now - ts) / 1000 < ttl) {
            return adapter ? adapter(data) : data;
        }
    }

    // 2. Check LocalStorage (Persistent Cache)
    if (cache) {
        try {
            const stored = localStorage.getItem(key);
            if (stored) {
                const { ts, data } = JSON.parse(stored);
                if ((now - ts) / 1000 < ttl) {
                    // Refresh in-memory from local
                    inMemoryCache.set(key, { ts, data });
                    return adapter ? adapter(data) : data;
                }
            }
        } catch (e) {
            console.warn('LocalStorage access failed', e);
        }
    }

    // 3. Network Fetch
    try {
        // Add cache-busting timestamp to force fresh data
        const cacheBuster = `?v=${Date.now()}`;
        const fetchUrl = url.includes('?') ? `${url}&v=${Date.now()}` : `${url}${cacheBuster}`;
        const response = await fetch(fetchUrl);
        if (!response.ok) throw new Error(`Failed to load ${url}: ${response.status}`);
        const rawData = await response.json();

        // 4. Cache Update
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
