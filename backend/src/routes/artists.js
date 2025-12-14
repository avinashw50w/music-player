
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

// GET all artists
router.get('/', async (req, res, next) => {
    try {
        const { limit, offset, search, favorites } = req.query;
        let query = db('artists').select('*').orderBy('name', 'asc');

        // Only show artists which has atleast one song
        query.whereExists(function() {
            this.select('*').from('songs').whereRaw('songs.artist_id = artists.id');
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

        const albums = await db('albums').where({ artist_id: req.params.id }).select('*');
        const songs = await db('songs')
            .where({ artist_id: req.params.id })
            .limit(parseInt(songLimit))
            .offset(parseInt(songOffset))
            .select('*');

        res.json({
            ...transformArtist(artist),
            albums: albums.map(a => ({
                id: a.id,
                title: a.title,
                coverUrl: a.cover_url,
                year: a.year,
                genre: a.genre,
                trackCount: a.track_count
            })),
            songs: songs.map(s => ({
                id: s.id,
                title: s.title,
                artist: s.artist_name,
                artistId: s.artist_id,
                album: s.album_name,
                albumId: s.album_id,
                duration: s.duration,
                coverUrl: s.cover_url,
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
        const songs = await db('songs')
            .where({ artist_id: req.params.id })
            .limit(parseInt(limit))
            .offset(parseInt(offset))
            .select('*');

        res.json(songs.map(s => ({
            id: s.id,
            title: s.title,
            artist: s.artist_name,
            artistId: s.artist_id,
            album: s.album_name,
            albumId: s.album_id,
            duration: s.duration,
            coverUrl: s.cover_url,
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
        
        // Unlink songs associated with this artist
        await db('songs')
            .where({ artist_id: id })
            .update({ 
                artist_id: null, 
                artist_name: 'Unknown Artist' 
            });
            
        // Unlink albums associated with this artist
        await db('albums')
            .where({ artist_id: id })
            .update({
                artist_id: null,
                artist_name: 'Unknown Artist'
            });

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
