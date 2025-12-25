
import Fuse from 'fuse.js';
import db from '../config/database.js';

let songIndex = null;
let albumIndex = null;
let artistIndex = null;
let lastBuildTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Configuration for Fuzzy Search
const songOptions = {
    keys: ['title', 'artist', 'album'],
    threshold: 0.3, // 0.0 = exact match, 1.0 = match anything. 0.3 is good for typos.
    ignoreLocation: true, // Search anywhere in the string
    minMatchCharLength: 2
};

const albumOptions = {
    keys: ['title', 'artist'],
    threshold: 0.3,
    ignoreLocation: true
};

const artistOptions = {
    keys: ['name'],
    threshold: 0.3,
    ignoreLocation: true
};

/**
 * Builds the in-memory search index from the database
 */
async function buildIndex() {
    console.log('[Search] Building search index...');
    
    // 1. Fetch Songs (lightweight)
    const songs = await db('songs')
        .leftJoin('albums', 'songs.album_id', 'albums.id')
        .leftJoin('song_artists', 'songs.id', 'song_artists.song_id')
        .leftJoin('artists', 'song_artists.artist_id', 'artists.id')
        .select(
            'songs.id', 
            'songs.title', 
            'albums.title as album',
            'artists.name as artist'
        )
        .groupBy('songs.id'); // Group to avoid duplicates from joins if not aggregated

    // 2. Fetch Albums
    const albums = await db('albums')
        .select(
            'albums.id',
            'albums.title',
            db.raw(`(
                SELECT GROUP_CONCAT(DISTINCT artists.name) 
                FROM songs 
                JOIN song_artists ON songs.id = song_artists.song_id 
                JOIN artists ON song_artists.artist_id = artists.id 
                WHERE songs.album_id = albums.id
            ) as artist`)
        )
        .where('track_count', '>', 0);

    // 3. Fetch Artists (Only those with songs)
    const artists = await db('artists')
        .whereExists(function() {
            this.select('*').from('song_artists').whereRaw('song_artists.artist_id = artists.id');
        })
        .select('id', 'name');

    // Create Fuse instances
    songIndex = new Fuse(songs, songOptions);
    albumIndex = new Fuse(albums, albumOptions);
    artistIndex = new Fuse(artists, artistOptions);

    lastBuildTime = Date.now();
    console.log('[Search] Index built successfully.');
}

/**
 * Ensures the index is built and fresh
 */
async function ensureIndex() {
    if (!songIndex || (Date.now() - lastBuildTime > CACHE_TTL)) {
        await buildIndex();
    }
}

/**
 * Perform a fuzzy search
 * @param {string} query 
 * @param {'song'|'album'|'artist'|null} type 
 * @param {number|null} limit - Max results. 0 for generous limit (1000), null for defaults (20/10).
 */
export async function fuzzySearch(query, type = null, limit = null) {
    await ensureIndex();

    const results = {
        songIds: [],
        albumIds: [],
        artistIds: []
    };

    // Determine limits
    const getLimit = (defaultLimit) => (limit === null ? defaultLimit : (limit === 0 ? 1000 : limit));

    if (!type || type === 'song') {
        const res = songIndex.search(query);
        const l = getLimit(20);
        results.songIds = res.slice(0, l).map(r => r.item.id);
    }

    if (!type || type === 'album') {
        const res = albumIndex.search(query);
        const l = getLimit(10);
        results.albumIds = res.slice(0, l).map(r => r.item.id);
    }

    if (!type || type === 'artist') {
        const res = artistIndex.search(query);
        const l = getLimit(10);
        results.artistIds = res.slice(0, l).map(r => r.item.id);
    }

    return results;
}

/**
 * Manually invalidate cache (can be called after uploads)
 */
export function invalidateSearchIndex() {
    lastBuildTime = 0;
}
