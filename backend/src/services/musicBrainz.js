
import { config } from '../config/env.js';

const RATE_LIMIT_DELAY = 1100; // 1.1 seconds to be safe
let lastRequestTime = 0;

// MusicBrainz requires a meaningful User-Agent
const USER_AGENT = 'MyousicPlayer/1.0.0 ( myousic_local_app@example.com )';

/**
 * Throttle requests to respect rate limits
 */
async function throttle() {
    const now = Date.now();
    const timeSinceLast = now - lastRequestTime;
    if (timeSinceLast < RATE_LIMIT_DELAY) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY - timeSinceLast));
    }
    lastRequestTime = Date.now();
}

/**
 * Fetch data from MusicBrainz API
 * @param {string} endpoint 
 * @param {object} params 
 */
export async function fetchMusicBrainz(endpoint, params = {}) {
    await throttle();
    
    const url = new URL(`https://musicbrainz.org/ws/2/${endpoint}`);
    params.fmt = 'json';
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': 'application/json'
            }
        });

        if (response.status === 503) {
            // Service Unavailable (Rate limit likely), wait and retry once
            console.warn('MusicBrainz 503, retrying...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            return fetchMusicBrainz(endpoint, params);
        }

        if (!response.ok) {
            console.warn(`MusicBrainz API Error (${response.status}): ${response.statusText}`);
            return null; // Return null on error to allow partial data
        }

        return response.json();
    } catch (error) {
        console.error('MusicBrainz Request Failed:', error);
        return null;
    }
}

/**
 * Get artist details including genres (tags)
 * @param {string} mbid 
 */
export async function getArtistDetails(mbid) {
    if (!mbid) return null;
    const data = await fetchMusicBrainz(`artist/${mbid}`, { inc: 'tags genres' });
    if (!data) return null;

    const genres = [
        ...(data.genres || []).map(g => g.name),
        ...(data.tags || []).map(t => t.name)
    ];

    return {
        id: data.id,
        name: data.name,
        country: data.country,
        genres: [...new Set(genres)] // Unique
    };
}

/**
 * Get release group details (Album) including genres and date
 * @param {string} mbid 
 */
export async function getReleaseGroupDetails(mbid) {
    if (!mbid) return null;
    const data = await fetchMusicBrainz(`release-group/${mbid}`, { inc: 'genres tags ratings' });
    if (!data) return null;

    const genres = [
        ...(data.genres || []).map(g => g.name),
        ...(data.tags || []).map(t => t.name)
    ];

    return {
        id: data.id,
        title: data.title,
        date: data['first-release-date'],
        genres: [...new Set(genres)]
    };
}
