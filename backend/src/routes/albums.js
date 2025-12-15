
import express from 'express';
import db from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import { broadcast } from '../services/sse.js';
import { config } from '../config/env.js';

const router = express.Router();

// Configure multer for cover uploads
const storage = multer.diskStorage({
    destination: path.join(config.UPLOAD_DIR, 'covers'),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        // Use album ID as filename if available (standard update), otherwise fallback
        if (req.params.id) {
            cb(null, `${req.params.id}${ext}`);
        } else {
            cb(null, `album-${Date.now()}${ext}`);
        }
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

// Format duration helper
const formatDuration = (seconds) => {
    if (!seconds) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

// Helper to get album artists (derived from songs)
const getAlbumArtists = async (albumId) => {
    const artists = await db('songs')
        .join('song_artists', 'songs.id', 'song_artists.song_id')
        .join('artists', 'song_artists.artist_id', 'artists.id')
        .where('songs.album_id', albumId)
        .distinct('artists.name')
        .select();
    
    // Simplification: join names. Ideally return array.
    return artists.map(a => a.name).join(', ') || 'Unknown Artist';
};

// Helper to transform DB row to API response
const transformAlbum = async (row) => {
    // If not joined, we might need to fetch artists
    let artistName = 'Unknown Artist';
    
    // Optimization: if we are listing many albums, doing a subquery for each is heavy.
    // In SQLite we can use group_concat in the main query.
    // For now, we will handle single album transformation or assume query handles it.
    if (row.artist_names) {
        artistName = row.artist_names;
    } else {
        artistName = await getAlbumArtists(row.id);
    }

    return {
        id: row.id,
        title: row.title,
        artist: artistName,
        coverUrl: row.cover_url,
        year: row.year,
        genre: (() => { 
            try { 
                const parsed = JSON.parse(row.genre); 
                return Array.isArray(parsed) ? parsed : (parsed ? [String(parsed)] : []);
            } 
            catch { return row.genre ? [row.genre] : ['Unknown']; } 
        })(),
        trackCount: row.track_count,
        isFavorite: Boolean(row.is_favorite)
    };
};

// GET all albums
router.get('/', async (req, res, next) => {
    try {
        const { limit, offset, search, favorites } = req.query;
        let query = db('albums')
            .select(
                'albums.*',
                // Subquery to get artist names efficiently
                db.raw(`(
                    SELECT GROUP_CONCAT(DISTINCT artists.name) 
                    FROM songs 
                    JOIN song_artists ON songs.id = song_artists.song_id 
                    JOIN artists ON song_artists.artist_id = artists.id 
                    WHERE songs.album_id = albums.id
                ) as artist_names`)
            )
            .orderBy('created_at', 'desc');

        // Only show albums with songs
        query.whereExists(function() {
            this.select('*').from('songs').whereRaw('songs.album_id = albums.id');
        });

        if (search) {
            const term = `%${search}%`;
            query = query.where(function() {
                this.where('title', 'like', term);
            });
        }

        if (favorites === 'true') {
            query = query.where('is_favorite', true);
        }

        if (limit) {
            query = query.limit(parseInt(limit));
        }
        if (offset) {
            query = query.offset(parseInt(offset));
        }

        const albums = await query;
        const results = await Promise.all(albums.map(transformAlbum));
        res.json(results);
    } catch (err) {
        next(err);
    }
});

// GET album by ID with songs
router.get('/:id', async (req, res, next) => {
    try {
        const { songLimit = 20, songOffset = 0 } = req.query;
        
        const album = await db('albums')
            .where({ id: req.params.id })
            .select(
                'albums.*',
                db.raw(`(
                    SELECT GROUP_CONCAT(DISTINCT artists.name) 
                    FROM songs 
                    JOIN song_artists ON songs.id = song_artists.song_id 
                    JOIN artists ON song_artists.artist_id = artists.id 
                    WHERE songs.album_id = albums.id
                ) as artist_names`)
            )
            .first();

        if (!album) {
            return res.status(404).json({ error: 'Album not found' });
        }

        const songs = await db('songs')
            .where({ album_id: req.params.id })
            .limit(parseInt(songLimit))
            .offset(parseInt(songOffset))
            .select('*');

        // Need to fetch artists for these songs too
        const songIds = songs.map(s => s.id);
        const songArtists = await db('song_artists')
            .join('artists', 'song_artists.artist_id', 'artists.id')
            .whereIn('song_artists.song_id', songIds)
            .select('song_artists.song_id', 'artists.id', 'artists.name', 'song_artists.is_primary');

        const artistsBySong = {};
        songArtists.forEach(sa => {
            if (!artistsBySong[sa.song_id]) artistsBySong[sa.song_id] = [];
            artistsBySong[sa.song_id].push({ id: sa.id, name: sa.name, isPrimary: Boolean(sa.is_primary) });
        });

        res.json({
            ...(await transformAlbum(album)),
            songs: songs.map(s => {
                const artists = artistsBySong[s.id] || [];
                return {
                    id: s.id,
                    title: s.title,
                    artist: artists.map(a => a.name).join(', '),
                    artistId: artists[0]?.id,
                    artists: artists,
                    album: album.title,
                    albumId: album.id,
                    duration: formatDuration(s.duration_seconds),
                    coverUrl: album.cover_url,
                    genre: (() => { 
                        try { 
                            const parsed = JSON.parse(s.genre); 
                            return Array.isArray(parsed) ? parsed : (parsed ? [String(parsed)] : []);
                        } 
                        catch { return s.genre ? [s.genre] : []; } 
                    })(),
                    isFavorite: Boolean(s.is_favorite),
                    fileUrl: s.file_path ? `/api/songs/${s.id}/stream` : null,
                    // Lyrics removed from list view
                }
            })
        });
    } catch (err) {
        next(err);
    }
});

// GET album songs (paginated)
router.get('/:id/songs', async (req, res, next) => {
    try {
        const { limit = 20, offset = 0 } = req.query;
        const album = await db('albums').where('id', req.params.id).first();
        const songs = await db('songs')
            .where({ album_id: req.params.id })
            .limit(parseInt(limit))
            .offset(parseInt(offset))
            .select('*');

        const songIds = songs.map(s => s.id);
        const songArtists = await db('song_artists')
            .join('artists', 'song_artists.artist_id', 'artists.id')
            .whereIn('song_artists.song_id', songIds)
            .select('song_artists.song_id', 'artists.id', 'artists.name');

        const artistsBySong = {};
        songArtists.forEach(sa => {
            if (!artistsBySong[sa.song_id]) artistsBySong[sa.song_id] = [];
            artistsBySong[sa.song_id].push({ id: sa.id, name: sa.name });
        });

        res.json(songs.map(s => {
            const artists = artistsBySong[s.id] || [];
            return {
                id: s.id,
                title: s.title,
                artist: artists.map(a => a.name).join(', '),
                artists: artists,
                album: album?.title,
                albumId: album?.id,
                duration: formatDuration(s.duration_seconds),
                coverUrl: album?.cover_url,
                genre: (() => { 
                    try { 
                        const parsed = JSON.parse(s.genre); 
                        return Array.isArray(parsed) ? parsed : (parsed ? [String(parsed)] : []);
                    } 
                    catch { return s.genre ? [s.genre] : []; } 
                })(),
                isFavorite: Boolean(s.is_favorite),
                fileUrl: s.file_path ? `/api/songs/${s.id}/stream` : null,
                // Lyrics removed from list view
            }
        }));
    } catch (err) {
        next(err);
    }
});

// POST create album
router.post('/', async (req, res, next) => {
    try {
        const { title, coverUrl, year, genre } = req.body;
        const id = uuidv4();

        const genreString = Array.isArray(genre) ? JSON.stringify(genre) : JSON.stringify([genre]);

        await db('albums').insert({
            id,
            title,
            cover_url: coverUrl,
            year,
            genre: genreString,
            track_count: 0,
            is_favorite: false
        });

        const album = await db('albums').where({ id }).first();
        const transformed = await transformAlbum(album);
        broadcast('album:update', transformed);
        res.status(201).json(transformed);
    } catch (err) {
        next(err);
    }
});

// PUT update album
router.put('/:id', async (req, res, next) => {
    try {
        const { title, year, genre } = req.body;

        const genreString = Array.isArray(genre) ? JSON.stringify(genre) : JSON.stringify([genre]);

        await db('albums').where({ id: req.params.id }).update({
            title,
            year,
            genre: genreString
        });

        const album = await db('albums').where({ id: req.params.id }).first();
        if (!album) {
            return res.status(404).json({ error: 'Album not found' });
        }
        const transformed = await transformAlbum(album);
        broadcast('album:update', transformed);
        res.json(transformed);
    } catch (err) {
        next(err);
    }
});

// PATCH update album cover
router.patch('/:id/cover', upload.single('cover'), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No cover image provided' });
        }

        const coverUrl = `/uploads/covers/${req.file.filename}`;

        await db('albums').where({ id: req.params.id }).update({
            cover_url: coverUrl
        });

        const album = await db('albums').where({ id: req.params.id }).first();
        if (!album) {
            return res.status(404).json({ error: 'Album not found' });
        }
        const transformed = await transformAlbum(album);
        broadcast('album:update', transformed);
        res.json(transformed);
    } catch (err) {
        next(err);
    }
});

// PATCH toggle favorite
router.patch('/:id/favorite', async (req, res, next) => {
    try {
        const album = await db('albums').where({ id: req.params.id }).first();
        if (!album) {
            return res.status(404).json({ error: 'Album not found' });
        }

        await db('albums').where({ id: req.params.id }).update({
            is_favorite: !album.is_favorite
        });

        const updated = await db('albums').where({ id: req.params.id }).first();
        const transformed = await transformAlbum(updated);
        broadcast('album:update', transformed);
        res.json(transformed);
    } catch (err) {
        next(err);
    }
});

// DELETE album
router.delete('/:id', async (req, res, next) => {
    try {
        const id = req.params.id;

        // Unlink songs associated with this album
        await db('songs')
            .where({ album_id: id })
            .update({ 
                album_id: null
            });

        const deleted = await db('albums').where({ id }).del();
        
        if (!deleted) {
            return res.status(404).json({ error: 'Album not found' });
        }
        broadcast('album:delete', { id });
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

export default router;
