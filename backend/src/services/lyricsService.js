
import { config } from '../config/env.js';

/**
 * Fetch synced lyrics from LRCLIB
 * @param {string} title 
 * @param {string} artist 
 * @param {string} album 
 * @param {number} durationSeconds 
 * @returns {Promise<string|null>} Returns raw LRC string or null
 */
export async function fetchSyncedLyrics(title, artist, album, durationSeconds) {
    try {
        const params = new URLSearchParams({
            track_name: title,
            artist_name: artist,
            duration: durationSeconds
        });

        if (album && album !== 'Unknown Album') {
            params.append('album_name', album);
        }

        // LRCLIB API: https://lrclib.net/docs
        const response = await fetch(`https://lrclib.net/api/get?${params.toString()}`);

        if (!response.ok) {
            if (response.status === 404) return null; // Not found
            throw new Error(`LRCLIB API Error: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Return synced lyrics if available, otherwise plain lyrics, otherwise null
        return data.syncedLyrics || data.plainLyrics || null;
    } catch (error) {
        console.error('Lyrics fetch failed:', error.message);
        return null;
    }
}
