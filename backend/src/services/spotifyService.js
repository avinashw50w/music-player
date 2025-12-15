
import { config } from '../config/env.js';
import db from '../config/database.js';

/**
 * Get a valid Spotify Access Token using Client Credentials Flow
 * Checks DB first, then fetches if expired.
 */
async function getAccessToken() {
    const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = config;

    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
        throw new Error('Spotify Client ID or Secret not configured in .env');
    }

    // 1. Check Database for valid token
    try {
        const cached = await db('system_settings').where({ key: 'spotify_token' }).first();
        
        // Return if token exists and has > 60 seconds remaining
        if (cached && cached.expires_at > Date.now() + 60000) {
            return cached.value;
        }
    } catch (e) {
        console.warn('Failed to read spotify_token from DB, will try to fetch new one.', e);
    }

    // 2. Fetch new token from Spotify
    const authString = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');

    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${authString}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
        throw new Error('Failed to authenticate with Spotify');
    }

    const data = await response.json();
    const token = data.access_token;
    const expiresAt = Date.now() + (data.expires_in * 1000);

    // 3. Save to Database
    try {
        await db('system_settings')
            .insert({
                key: 'spotify_token',
                value: token,
                expires_at: expiresAt
            })
            .onConflict('key')
            .merge();
    } catch (e) {
        console.error('Failed to save spotify_token to DB', e);
    }

    return token;
}

/**
 * Fetch Artist details to get Genres (Spotify stores genres on Artists, not Tracks)
 * @param {string} artistId 
 * @param {string} token 
 */
async function getArtistGenres(artistId, token) {
    if (!artistId) return [];
    try {
        const response = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) return [];
        const data = await response.json();
        // Capitalize genres
        return (data.genres || []).map(g => g.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
    } catch (e) {
        console.warn('Failed to fetch Spotify artist genres', e);
        return [];
    }
}

/**
 * Search Spotify for track metadata
 * @param {string} title 
 * @param {string} artist 
 */
export async function searchSpotifyMetadata(title, artist) {
    const token = await getAccessToken();
    
    // Construct query: "track:Title artist:Artist"
    // Remove "Unknown Artist" or similar generic terms to improve search
    let query = `track:${title}`;
    if (artist && artist !== 'Unknown Artist' && !artist.includes('Unknown')) {
        query += ` artist:${artist}`;
    }

    const searchParams = new URLSearchParams({
        q: query,
        type: 'track',
        limit: '1'
    });

    const response = await fetch(`https://api.spotify.com/v1/search?${searchParams.toString()}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error('Failed to search Spotify');
    }

    const data = await response.json();
    const track = data.tracks?.items?.[0];

    if (!track) {
        throw new Error('No match found on Spotify');
    }

    // Extract relevant metadata
    const album = track.album;
    
    // Find image closest to 500px (Spotify usually offers 640, 300, 64)
    let coverUrl = null;
    if (album.images && album.images.length > 0) {
        const target = 500;
        // Sort/Find the one with height closest to target
        const bestImage = album.images.reduce((prev, curr) => {
            return (Math.abs(curr.height - target) < Math.abs(prev.height - target) ? curr : prev);
        });
        coverUrl = bestImage.url;
    }
    
    // Extract year from release date (YYYY-MM-DD or YYYY)
    let year = null;
    if (album.release_date) {
        year = parseInt(album.release_date.substring(0, 4));
    }

    // Fetch Genres from the primary artist
    const primaryArtistId = track.artists?.[0]?.id;
    const genres = await getArtistGenres(primaryArtistId, token);

    return {
        title: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        artists: track.artists.map(a => a.name),
        album: album.name,
        coverUrl: coverUrl,
        year: year,
        genre: genres 
    };
}
