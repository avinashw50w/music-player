
import express from 'express';
import db from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import { broadcast } from '../services/sse.js';
import { config } from '../config/env.js';

const router = express.Router();

// Configure multer for avatar uploads
const storage = multer.diskStorage({
    destination: path.join(config.UPLOAD_DIR, 'covers'),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `artist-${Date.now()}${ext}`);
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

// Helper to transform DB row to API response format
const transformArtist = (row) => ({
    id: row.id,
    name: row.name,
    avatarUrl: row.avatar_url,
    followers: row.followers,
    isFavorite: Boolean(row.is_favorite)
});

// Format duration helper
const formatDuration = (seconds) => {
    if (!seconds) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

// GET all artists
router.get('/', async (req, res, next) => {
    try {
        const { limit, offset, search, favorites } = req.query;
        let query = db('artists').select('*').orderBy('name', 'asc');

        // Only show artists which have at least one song
        query.whereExists(function() {
            this.select('*').from('song_artists').whereRaw('song_artists.artist_id = artists.id');
        });

        if (search) {
            query = query.where('name', 'like', `%${search}%`);
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

        const artists = await query;
        res.json(artists.map(transformArtist));
    } catch (err) {
        next(err);
    }
});

// GET artist by ID with albums and songs
router.get('/:id', async (req, res, next) => {
    try {
        const { songLimit = 20, songOffset = 0 } = req.query;
        const artist = await db('artists').where({ id: req.params.id }).first();
        if (!artist) {
            return res.status(404).json({ error: 'Artist not found' });
        }

        // Get albums associated with this artist (via songs)
        const albums = await db('albums')
            .whereIn('id', function() {
                this.select('album_id').from('songs')
                    .join('song_artists', 'songs.id', 'song_artists.song_id')
                    .where('song_artists.artist_id', artist.id)
                    .distinct();
            })
            .select('*');

        // Get songs
        const songs = await db('songs')
            .join('song_artists', 'songs.id', 'song_artists.song_id')
            .leftJoin('albums', 'songs.album_id', 'albums.id')
            .where('song_artists.artist_id', req.params.id)
            .limit(parseInt(songLimit))
            .offset(parseInt(songOffset))
            .select('songs.*', 'albums.title as album_title', 'albums.cover_url as album_cover_url');

        res.json({
            ...transformArtist(artist),
            albums: albums.map(a => ({
                id: a.id,
                title: a.title,
                coverUrl: a.cover_url,
                year: a.year,
                genre: (() => { try { return JSON.parse(a.genre); } catch { return a.genre ? [a.genre] : ['Unknown']; } })(),
                trackCount: a.track_count
            })),
            songs: songs.map(s => ({
                id: s.id,
                title: s.title,
                artist: artist.name, // Context is this artist
                artistId: artist.id,
                album: s.album_title,
                albumId: s.album_id,
                duration: formatDuration(s.duration_seconds),
                coverUrl: s.album_cover_url,
                genre: (() => { try { return JSON.parse(s.genre); } catch { return [s.genre]; } })(),
                isFavorite: Boolean(s.is_favorite),
                fileUrl: s.file_path ? `/api/songs/${s.id}/stream` : null
            }))
        });
    } catch (err) {
        next(err);
    }
});

// GET artist songs (paginated)
router.get('/:id/songs', async (req, res, next) => {
    try {
        const { limit = 20, offset = 0 } = req.query;
        const artist = await db('artists').where({ id: req.params.id }).first();
        
        const songs = await db('songs')
            .join('song_artists', 'songs.id', 'song_artists.song_id')
            .leftJoin('albums', 'songs.album_id', 'albums.id')
            .where('song_artists.artist_id', req.params.id)
            .limit(parseInt(limit))
            .offset(parseInt(offset))
            .select('songs.*', 'albums.title as album_title', 'albums.cover_url as album_cover_url');

        res.json(songs.map(s => ({
            id: s.id,
            title: s.title,
            artist: artist?.name,
            artistId: artist?.id,
            album: s.album_title,
            albumId: s.album_id,
            duration: formatDuration(s.duration_seconds),
            coverUrl: s.album_cover_url,
            genre: (() => { try { return JSON.parse(s.genre); } catch { return [s.genre]; } })(),
            isFavorite: Boolean(s.is_favorite),
            fileUrl: s.file_path ? `/api/songs/${s.id}/stream` : null
        })));
    } catch (err) {
        next(err);
    }
});

// POST create artist
router.post('/', async (req, res, next) => {
    try {
        const { name, avatarUrl, followers } = req.body;
        const id = uuidv4();

        await db('artists').insert({
            id,
            name,
            avatar_url: avatarUrl,
            followers: followers || '0',
            is_favorite: false
        });

        const artist = await db('artists').where({ id }).first();
        const transformed = transformArtist(artist);
        broadcast('artist:update', transformed);
        res.status(201).json(transformed);
    } catch (err) {
        next(err);
    }
});

// PUT update artist
router.put('/:id', async (req, res, next) => {
    try {
        const { name, followers } = req.body;

        await db('artists').where({ id: req.params.id }).update({
            name,
            followers
        });

        const artist = await db('artists').where({ id: req.params.id }).first();
        if (!artist) {
            return res.status(404).json({ error: 'Artist not found' });
        }
        const transformed = transformArtist(artist);
        broadcast('artist:update', transformed);
        res.json(transformed);
    } catch (err) {
        next(err);
    }
});

// PATCH update artist avatar
router.patch('/:id/avatar', upload.single('avatar'), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No avatar image provided' });
        }

        const avatarUrl = `/uploads/covers/${req.file.filename}`;

        await db('artists').where({ id: req.params.id }).update({
            avatar_url: avatarUrl
        });

        const artist = await db('artists').where({ id: req.params.id }).first();
        if (!artist) {
            return res.status(404).json({ error: 'Artist not found' });
        }
        const transformed = transformArtist(artist);
        broadcast('artist:update', transformed);
        res.json(transformed);
    } catch (err) {
        next(err);
    }
});

// PATCH toggle favorite
router.patch('/:id/favorite', async (req, res, next) => {
    try {
        const artist = await db('artists').where({ id: req.params.id }).first();
        if (!artist) {
            return res.status(404).json({ error: 'Artist not found' });
        }

        await db('artists').where({ id: req.params.id }).update({
            is_favorite: !artist.is_favorite
        });

        const updated = await db('artists').where({ id: req.params.id }).first();
        const transformed = transformArtist(updated);
        broadcast('artist:update', transformed);
        res.json(transformed);
    } catch (err) {
        next(err);
    }
});

// DELETE artist
router.delete('/:id', async (req, res, next) => {
    try {
        const id = req.params.id;
        
        // Remove links in song_artists (handled by CASCADE usually but good to be explicit/safe)
        await db('song_artists').where({ artist_id: id }).del();

        const deleted = await db('artists').where({ id }).del();
        
        if (!deleted) {
            return res.status(404).json({ error: 'Artist not found' });
        }
        broadcast('artist:delete', { id });
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

export default router;
