
import express from 'express';
import db from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { broadcast } from '../services/sse.js';
import { identifySongMetadata, downloadCoverImage } from '../services/metadataService.js';
import { searchSpotifyMetadata } from '../services/spotifyService.js';
import { refineMetadataWithGemini } from '../services/geminiService.js';
import { fetchSyncedLyrics } from '../services/lyricsService.js'; // Import Lyrics Service
import { updateAudioTags } from '../services/audioService.js'; // Import Tag Writer
import { identificationQueue } from '../services/taskQueue.js';
import { config } from '../config/env.js';

const router = express.Router();

// Configure multer for cover uploads (now updates albums)
const storage = multer.diskStorage({
    destination: path.join(config.UPLOAD_DIR, 'covers'),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `cover-${Date.now()}${ext}`);
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, allowed.includes(ext));
    }
});

// Helper for formatting duration
const formatDuration = (seconds) => {
    if (!seconds) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

// Helper to get full song details with joins
async function fetchSongsWithDetails(baseQuery, includeLyrics = false) {
    // Select song fields + album fields
    const songs = await baseQuery
        .leftJoin('albums', 'songs.album_id', 'albums.id')
        .select(
            'songs.*',
            'albums.title as album_title',
            'albums.cover_url as album_cover_url'
        );

    if (songs.length === 0) return [];

    const songIds = songs.map(s => s.id);

    // Fetch artists for these songs
    const songArtists = await db('song_artists')
        .join('artists', 'song_artists.artist_id', 'artists.id')
        .whereIn('song_artists.song_id', songIds)
        .select('song_artists.song_id', 'song_artists.is_primary', 'artists.id', 'artists.name')
        .orderBy('song_artists.is_primary', 'desc'); // Primary first

    const artistsBySong = {};
    songArtists.forEach(sa => {
        if (!artistsBySong[sa.song_id]) artistsBySong[sa.song_id] = [];
        artistsBySong[sa.song_id].push({ id: sa.id, name: sa.name, isPrimary: Boolean(sa.is_primary) });
    });

    return songs.map(s => {
        const artists = artistsBySong[s.id] || [{ id: 'unknown', name: 'Unknown Artist', isPrimary: true }];
        const songData = {
            id: s.id,
            title: s.title,
            // Derived fields for frontend compatibility
            artist: artists.map(a => a.name).join(', '),
            artistId: artists[0].id,
            artists: artists,
            album: s.album_title || 'Unknown Album',
            albumId: s.album_id,
            duration: formatDuration(s.duration_seconds),
            durationSeconds: s.duration_seconds,
            // Cover comes from album now
            coverUrl: s.album_cover_url || `https://picsum.photos/seed/${s.id}/200/200`,
            fileUrl: s.file_path ? `/api/songs/${s.id}/stream` : null,
            genre: (() => { 
                try { return JSON.parse(s.genre); } 
                catch { return s.genre ? [s.genre] : ['Unknown']; } 
            })(),
            isFavorite: Boolean(s.is_favorite),
            bitrate: s.bitrate,
            format: s.format
        };

        if (includeLyrics) {
            songData.lyrics = s.lyrics;
        }

        return songData;
    });
}

// Helper to process multiple artists for a song
const processSongArtists = async (songId, artistsData) => {
    // 1. Clear existing links
    await db('song_artists').where({ song_id: songId }).del();

    const artistIds = [];
    
    const validArtists = (artistsData || []).filter(a => {
        const name = typeof a === 'string' ? a.trim() : a.name.trim();
        return name.length > 0;
    });

    if (validArtists.length === 0) {
        // Link to Unknown Artist
        let unknown = await db('artists').where({ name: 'Unknown Artist' }).first();
        if (!unknown) {
             const newId = '00000000-0000-0000-0000-000000000000';
             await db('artists').insert({
                id: newId,
                name: 'Unknown Artist',
                avatar_url: 'https://ui-avatars.com/api/?name=Unknown+Artist&background=random',
                followers: '0',
                is_favorite: false
            });
            unknown = { id: newId };
        }
        await db('song_artists').insert({
            song_id: songId,
            artist_id: unknown.id,
            is_primary: true
        });
        return unknown.id;
    }

    // 2. Iterate artists
    for (let i = 0; i < validArtists.length; i++) {
        const artistData = validArtists[i];
        const name = typeof artistData === 'string' ? artistData.trim() : artistData.name.trim();
        
        let artistId = null;
        const existingArtist = await db('artists').where('name', 'like', name).first();
        
        if (existingArtist) {
            artistId = existingArtist.id;
        } else {
            artistId = uuidv4();
            await db('artists').insert({
                id: artistId,
                name: name,
                avatar_url: `https://picsum.photos/seed/${encodeURIComponent(name)}/200/200`
            });
        }

        artistIds.push(artistId);

        try {
            await db('song_artists').insert({
                song_id: songId,
                artist_id: artistId,
                is_primary: i === 0 // First one is primary
            });
        } catch (e) {
            // Ignore duplicates
        }
    }

    return artistIds.length > 0 ? artistIds[0] : null;
};

// GET all songs
router.get('/', async (req, res, next) => {
    try {
        const { limit, offset, search, favorites, title, artist, album, genre } = req.query;
        let query = db('songs').orderBy('songs.created_at', 'desc');
        
        // Generalized Search
        if (search) {
            const term = `%${search}%`;
            query = query.where(function() {
                this.where('songs.title', 'like', term)
                    .orWhereIn('songs.id', function() {
                        // Subquery for artists
                        this.select('song_id').from('song_artists')
                            .join('artists', 'song_artists.artist_id', 'artists.id')
                            .where('artists.name', 'like', term);
                    })
                    .orWhereIn('songs.album_id', function() {
                        // Subquery for albums
                        this.select('id').from('albums')
                            .where('title', 'like', term);
                    });
            });
        }

        // Specific Filters
        if (title) {
            query = query.where('songs.title', 'like', `%${title}%`);
        }

        if (artist) {
            query = query.whereIn('songs.id', function() {
                this.select('song_id').from('song_artists')
                    .join('artists', 'song_artists.artist_id', 'artists.id')
                    .where('artists.name', 'like', `%${artist}%`);
            });
        }

        if (album) {
            query = query.whereIn('songs.album_id', function() {
                this.select('id').from('albums')
                    .where('title', 'like', `%${album}%`);
            });
        }

        if (genre) {
            query = query.where('songs.genre', 'like', `%${genre}%`);
        }

        if (favorites === 'true') {
            query = query.where('songs.is_favorite', true);
        }

        if (limit) {
            query = query.limit(parseInt(limit));
        }
        if (offset) {
            query = query.offset(parseInt(offset));
        }

        // Do not include lyrics in list view
        const results = await fetchSongsWithDetails(query, false);
        res.json(results);
    } catch (err) {
        next(err);
    }
});

// GET song by ID
router.get('/:id', async (req, res, next) => {
    try {
        const query = db('songs').where({ 'songs.id': req.params.id });
        // Include lyrics for single song view
        const results = await fetchSongsWithDetails(query, true);
        
        if (results.length === 0) {
            return res.status(404).json({ error: 'Song not found' });
        }

        res.json(results[0]);
    } catch (err) {
        next(err);
    }
});

// GET stream song file
router.get('/:id/stream', async (req, res, next) => {
    try {
        const song = await db('songs').where({ id: req.params.id }).first();
        if (!song || !song.file_path) {
            return res.status(404).send('Audio file not found');
        }
        res.sendFile(song.file_path);
    } catch (err) {
        next(err);
    }
});

// POST identify song using audio fingerprinting (AcoustID) - RETURNS CANDIDATE
router.post('/:id/identify', async (req, res, next) => {
    try {
        const result = await identificationQueue.add(async () => {
            const song = await db('songs').where({ id: req.params.id }).first();
            if (!song || !song.file_path) {
                throw new Error('Song or file not found');
            }

            const metadata = await identifySongMetadata(song.file_path);

            // Return the candidate metadata to frontend for confirmation
            return {
                title: metadata.title,
                artist: metadata.artist, // String representation
                album: metadata.album,
                year: metadata.year,
                genre: metadata.genre,
                coverUrl: metadata.coverUrl // Remote URL, processed on Apply
            };
        });

        res.json(result);

    } catch (err) {
        if (err.message === 'Song or file not found') {
            return res.status(404).json({ error: err.message });
        }
        res.status(500).json({ 
            error: err.message || 'Identification failed', 
            details: 'Ensure fpcalc is installed on the server.' 
        });
    }
});

// POST identify song using Hybrid approach (Spotify) - RETURNS CANDIDATE
router.post('/:id/identify-spotify', async (req, res, next) => {
    try {
        const result = await identificationQueue.add(async () => {
            const song = await db('songs')
                .leftJoin('song_artists', 'songs.id', 'song_artists.song_id')
                .leftJoin('artists', 'song_artists.artist_id', 'artists.id')
                .leftJoin('albums', 'songs.album_id', 'albums.id')
                .where({ 'songs.id': req.params.id })
                .orderBy('song_artists.is_primary', 'desc')
                .select('songs.*', 'artists.name as artist_name', 'albums.title as album_title')
                .first();

            if (!song) {
                throw new Error('Song not found');
            }

            // 1. Try to identify via AcoustID first to get Clean Title/Artist
            let searchTitle = song.title;
            let searchArtist = song.artist_name || 'Unknown Artist';
            
            try {
                console.log(`[Hybrid] Fingerprinting ${song.file_path}...`);
                const acoustidData = await identifySongMetadata(song.file_path);
                if (acoustidData.title) {
                    console.log(`[Hybrid] AcoustID Found: ${acoustidData.title} by ${acoustidData.artist}`);
                    searchTitle = acoustidData.title;
                    searchArtist = acoustidData.artist;
                }
            } catch (e) {
                console.warn(`[Hybrid] AcoustID failed, using existing metadata: ${e.message}`);
            }

            // 3. Search Spotify using the (hopefully clean) title and artist
            console.log(`[Hybrid] Searching Spotify for: ${searchTitle} - ${searchArtist}`);
            const metadata = await searchSpotifyMetadata(searchTitle, searchArtist);

            // Return candidate metadata
            return {
                title: metadata.title,
                artist: metadata.artist, // String
                album: metadata.album,
                year: metadata.year,
                genre: metadata.genre,
                coverUrl: metadata.coverUrl // Remote URL
            };
        });

        res.json(result);

    } catch (err) {
        console.error("Hybrid Identify Error", err);
        if (err.message === 'Song not found') {
             return res.status(404).json({ error: err.message });
        }
        res.status(500).json({ error: err.message || 'Spotify identification failed' });
    }
});

// POST Refine Metadata (Gemini) - RETURNS CANDIDATE
router.post('/:id/refine', async (req, res, next) => {
    try {
        const result = await identificationQueue.add(async () => {
            const song = await db('songs')
                .leftJoin('song_artists', 'songs.id', 'song_artists.song_id')
                .leftJoin('artists', 'song_artists.artist_id', 'artists.id')
                .leftJoin('albums', 'songs.album_id', 'albums.id')
                .where({ 'songs.id': req.params.id })
                .orderBy('song_artists.is_primary', 'desc')
                .select('songs.*', 'artists.name as artist_name', 'albums.title as album_title')
                .first();

            if (!song) {
                throw new Error('Song not found');
            }

            const filename = path.basename(song.file_path);
            const suggestion = await refineMetadataWithGemini(
                filename, 
                song.title, 
                song.artist_name || 'Unknown Artist', 
                song.album_title || 'Unknown Album'
            );

            if (!suggestion) {
                throw new Error('Failed to generate suggestions');
            }

            return suggestion;
        });

        res.json(result);
    } catch (err) {
        if (err.message === 'Song not found') {
             return res.status(404).json({ error: err.message });
        }
        next(err);
    }
});

// POST fetch synced lyrics
router.post('/:id/lyrics/fetch', async (req, res, next) => {
    try {
        const song = await db('songs')
            .leftJoin('song_artists', 'songs.id', 'song_artists.song_id')
            .leftJoin('artists', 'song_artists.artist_id', 'artists.id')
            .leftJoin('albums', 'songs.album_id', 'albums.id')
            .where({ 'songs.id': req.params.id })
            .orderBy('song_artists.is_primary', 'desc')
            .select('songs.*', 'artists.name as artist_name', 'albums.title as album_title')
            .first();

        if (!song) {
            return res.status(404).json({ error: 'Song not found' });
        }

        const lyrics = await fetchSyncedLyrics(
            song.title,
            song.artist_name,
            song.album_title,
            song.duration_seconds
        );

        if (!lyrics) {
            return res.status(404).json({ error: 'Lyrics not found' });
        }

        await db('songs').where({ id: req.params.id }).update({ lyrics });

        const query = db('songs').where({ 'songs.id': req.params.id });
        const results = await fetchSongsWithDetails(query, true);
        const transformed = results[0];

        broadcast('song:update', transformed);

        // --- UPDATE PHYSICAL FILE METADATA ASYNC ---
        if (song.file_path) {
            identificationQueue.add(async () => {
                try {
                    await updateAudioTags(song.file_path, {
                        lyrics: lyrics
                    });
                } catch (e) {
                    console.error(`Failed to update lyrics tags for ${transformed.title}:`, e.message);
                }
            });
        }

        res.json(transformed);

    } catch (err) {
        next(err);
    }
});

// POST create song
router.post('/', async (req, res, next) => {
    try {
        const { title, artist, album, duration, coverUrl, genre, filePath } = req.body;
        const id = uuidv4();

        // 1. Process Artists
        
        // 2. Handle Album
        let albumId = null;
        if (album) {
            const existingAlbum = await db('albums').where('title', 'like', album).first();
            if (existingAlbum) {
                albumId = existingAlbum.id;
                await db('albums').where({ id: albumId }).increment('track_count', 1);
            } else {
                albumId = uuidv4();
                await db('albums').insert({
                    id: albumId,
                    title: album,
                    cover_url: coverUrl, // Album gets the cover
                    year: new Date().getFullYear(),
                    genre: JSON.stringify(Array.isArray(genre) ? genre : [genre]),
                    track_count: 1
                });
            }
        }

        // 3. Create Song
        // Parse duration string to seconds if needed (assuming input might be "MM:SS" or raw seconds)
        let durationSeconds = 0;
        if (typeof duration === 'string' && duration.includes(':')) {
            const parts = duration.split(':');
            durationSeconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
        } else {
            durationSeconds = parseInt(duration) || 0;
        }

        await db('songs').insert({
            id,
            title,
            album_id: albumId,
            duration_seconds: durationSeconds,
            file_path: filePath,
            genre: JSON.stringify(Array.isArray(genre) ? genre : [genre]),
            is_favorite: false
        });

        // 4. Link Artists
        const artistNames = artist.split(/[;,/]/).map(a => a.trim()).filter(Boolean);
        await processSongArtists(id, artistNames);

        // 5. Return
        const query = db('songs').where({ 'songs.id': id });
        const results = await fetchSongsWithDetails(query, true);
        const transformed = results[0];

        broadcast('song:update', transformed); 
        res.status(201).json(transformed);
    } catch (err) {
        next(err);
    }
});

// PUT update song
router.put('/:id', async (req, res, next) => {
    try {
        const { title, artist, album, genre, albumId: providedAlbumId, remoteCoverUrl, year } = req.body;
        
        // 1. Fetch current song state to track changes
        const currentSong = await db('songs').where({ id: req.params.id }).first();
        if (!currentSong) return res.status(404).json({ error: 'Song not found' });

        const oldAlbumId = currentSong.album_id;
        let newAlbumId = undefined; // Undefined = no change to column

        // 2. Determine New Album ID
        
        // Case A: Explicit ID provided (from dropdown selection)
        if (providedAlbumId) {
             const exists = await db('albums').where({ id: providedAlbumId }).first();
             if (exists) {
                 newAlbumId = providedAlbumId;
             }
        }

        // Case B: No ID provided, but Album Name string is present
        // This handles:
        // 1. User typed a new album name (create new)
        // 2. User cleared the ID but typed an existing name (lookup)
        if (!newAlbumId && album) {
             // Look up by title
             const existingAlbum = await db('albums').where('title', 'like', album).first();
             if (existingAlbum) {
                 newAlbumId = existingAlbum.id;
             } else {
                 // Create New Album
                 newAlbumId = uuidv4();
                 await db('albums').insert({
                     id: newAlbumId,
                     title: album,
                     cover_url: `https://picsum.photos/seed/${encodeURIComponent(album)}/300/300`,
                     year: year || new Date().getFullYear(),
                     genre: JSON.stringify(Array.isArray(genre) ? genre : [genre]),
                     track_count: 0 // Will increment later
                 });
             }
        }

        // 3. Prepare Song Update
        const updateData = {
            title,
            genre: JSON.stringify(Array.isArray(genre) ? genre : [genre])
        };
        
        if (newAlbumId !== undefined) {
            updateData.album_id = newAlbumId;
        }

        // 4. Update Song
        await db('songs').where({ id: req.params.id }).update(updateData);

        // 5. Handle Album Updates (Cover URL & Year)
        const targetAlbumId = newAlbumId || oldAlbumId;
        if (targetAlbumId) {
            const albumUpdates = {};
            
            // If remote cover provided (from identification), download it
            if (remoteCoverUrl) {
                const downloaded = await downloadCoverImage(remoteCoverUrl, `${targetAlbumId}`);
                if (downloaded) albumUpdates.cover_url = downloaded;
            }

            if (year) albumUpdates.year = year;
            // Also update album genre to match song if helpful
            if (genre && genre.length > 0) albumUpdates.genre = JSON.stringify(genre);

            if (Object.keys(albumUpdates).length > 0) {
                await db('albums').where({ id: targetAlbumId }).update(albumUpdates);
            }
        }

        // 6. Maintain Track Counts if album changed
        if (newAlbumId && newAlbumId !== oldAlbumId) {
            // Decrement old album count
            if (oldAlbumId) {
                await db('albums').where({ id: oldAlbumId }).decrement('track_count', 1);
            }
            // Increment new album count
            await db('albums').where({ id: newAlbumId }).increment('track_count', 1);
        }

        // Process artists
        // IMPORTANT: Check if artist is provided specifically (empty string is valid update to remove artists)
        if (artist !== undefined) {
            const artistNames = artist.split(/[;,/]/).map(a => a.trim()).filter(Boolean);
            await processSongArtists(req.params.id, artistNames);
        }

        const query = db('songs').where({ 'songs.id': req.params.id });
        const results = await fetchSongsWithDetails(query, true);
        const transformed = results[0];

        broadcast('song:update', transformed);
        
        // Also broadcast album update
        if (targetAlbumId) {
             const albumData = await db('albums').where({ id: targetAlbumId }).first();
             broadcast('album:update', { ...albumData, isFavorite: Boolean(albumData.is_favorite) });
        }

        // --- UPDATE PHYSICAL FILE METADATA ASYNC ---
        if (currentSong.file_path) {
            // Resolve cover path if available from update
            let coverPath = null;
            if (transformed.coverUrl && transformed.coverUrl.startsWith('/uploads/')) {
                // Assuming coverUrl format: /uploads/covers/filename.jpg
                const relativePath = transformed.coverUrl.replace(/^\/uploads\//, '');
                coverPath = path.join(config.UPLOAD_DIR, relativePath);
            }

            identificationQueue.add(async () => {
                // Construct new filename if title/artist changed to keep file system organized
                let newFilePath = null;
                try {
                    const dir = path.dirname(currentSong.file_path);
                    const ext = path.extname(currentSong.file_path);
                    
                    // Sanitize filename safe characters
                    const safeArtist = (transformed.artist || 'Unknown Artist').replace(/[<>:"/\\|?*]/g, '').trim();
                    const safeTitle = (transformed.title || 'Unknown Title').replace(/[<>:"/\\|?*]/g, '').trim();
                    
                    const newFilename = `${safeArtist} - ${safeTitle}${ext}`;
                    const potentialPath = path.join(dir, newFilename);
                    
                    // Only rename if path is different and target doesn't exist
                    if (potentialPath !== currentSong.file_path) {
                        if (!fs.existsSync(potentialPath)) {
                            newFilePath = potentialPath;
                        } else {
                            console.warn(`[Rename] Target file exists, skipping rename: ${newFilename}`);
                        }
                    }

                    await updateAudioTags(currentSong.file_path, {
                        title: transformed.title,
                        artist: transformed.artist,
                        album: transformed.album,
                        year: year || undefined,
                        genre: transformed.genre,
                        coverPath: coverPath // Pass resolved cover path
                    }, newFilePath);

                    // Update DB with new path if renamed successfully
                    if (newFilePath) {
                        await db('songs').where({ id: req.params.id }).update({ file_path: newFilePath });
                    }
                } catch (e) {
                    console.error(`Failed to update file tags/name for ${transformed.title}:`, e.message);
                }
            });
        }

        res.json(transformed);
    } catch (err) {
        next(err);
    }
});

// PATCH toggle favorite
router.patch('/:id/favorite', async (req, res, next) => {
    try {
        const song = await db('songs').where({ id: req.params.id }).first();
        if (!song) {
            return res.status(404).json({ error: 'Song not found' });
        }

        await db('songs').where({ id: req.params.id }).update({
            is_favorite: !song.is_favorite
        });

        const query = db('songs').where({ 'songs.id': req.params.id });
        const results = await fetchSongsWithDetails(query, true);
        const transformed = results[0];

        broadcast('song:update', transformed);
        res.json(transformed);
    } catch (err) {
        next(err);
    }
});

// PATCH update lyrics
router.patch('/:id/lyrics', async (req, res, next) => {
    try {
        const { lyrics } = req.body;
        
        const song = await db('songs').where({ id: req.params.id }).first();
        if (!song) {
            return res.status(404).json({ error: 'Song not found' });
        }

        await db('songs').where({ id: req.params.id }).update({ lyrics });

        const query = db('songs').where({ 'songs.id': req.params.id });
        const results = await fetchSongsWithDetails(query, true);
        const transformed = results[0];

        broadcast('song:update', transformed);

        // --- UPDATE PHYSICAL FILE METADATA ASYNC ---
        if (song.file_path) {
            identificationQueue.add(async () => {
                try {
                    await updateAudioTags(song.file_path, {
                        lyrics: lyrics
                    });
                } catch (e) {
                    console.error(`Failed to update lyrics tags for ${transformed.title}:`, e.message);
                }
            });
        }

        res.json(transformed);
    } catch (err) {
        next(err);
    }
});

// PATCH update song cover (Actually updates the Album Cover)
router.patch('/:id/cover', upload.single('cover'), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No cover image provided' });
        }

        let coverUrl = `/uploads/covers/${req.file.filename}`;
        const song = await db('songs').where({ id: req.params.id }).first();
        
        if (song && song.album_id) {
            // Rename uploaded file to match album_id
            const ext = path.extname(req.file.originalname);
            const newFilename = `${song.album_id}${ext}`;
            const oldPath = req.file.path;
            const newPath = path.join(config.UPLOAD_DIR, 'covers', newFilename);

            try {
                // Rename file
                await fs.promises.rename(oldPath, newPath);
                coverUrl = `/uploads/covers/${newFilename}`;
            } catch (e) {
                console.error("Failed to rename cover image:", e);
                // Continue with original filename if rename fails
            }

            await db('albums').where({ id: song.album_id }).update({
                cover_url: coverUrl
            });
        }

        const query = db('songs').where({ 'songs.id': req.params.id });
        const results = await fetchSongsWithDetails(query, true);
        const transformed = results[0];

        broadcast('song:update', transformed);
        // Also broadcast album update
        if (song.album_id) {
             const album = await db('albums').where({ id: song.album_id }).first();
             broadcast('album:update', { ...album, isFavorite: Boolean(album.is_favorite) });
        }

        // --- UPDATE PHYSICAL FILE METADATA ASYNC ---
        if (song && song.file_path) {
            let coverPath = null;
            if (coverUrl.startsWith('/uploads/')) {
                const relativePath = coverUrl.replace(/^\/uploads\//, '');
                coverPath = path.join(config.UPLOAD_DIR, relativePath);
            }

            identificationQueue.add(async () => {
                try {
                    await updateAudioTags(song.file_path, {
                        coverPath: coverPath
                    });
                } catch (e) {
                    console.error(`Failed to update file cover for ${transformed.title}:`, e.message);
                }
            });
        }

        res.json(transformed);
    } catch (err) {
        next(err);
    }
});

// DELETE song
router.delete('/:id', async (req, res, next) => {
    try {
        const deleted = await db('songs').where({ id: req.params.id }).del();
        if (!deleted) {
            return res.status(404).json({ error: 'Song not found' });
        }
        broadcast('song:delete', { id: req.params.id });
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

export default router;
