
import express from 'express';
import db from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { broadcast } from '../services/sse.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for cover uploads
const storage = multer.diskStorage({
    destination: path.join(__dirname, '../../uploads/covers'),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `album-${Date.now()}${ext}`);
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
const transformAlbum = (row) => ({
    id: row.id,
    title: row.title,
    artist: row.artist_name,
    artistId: row.artist_id,
    coverUrl: row.cover_url,
    year: row.year,
    genre: (() => { 
        try { 
            return JSON.parse(row.genre); 
        } catch { 
            return row.genre ? [row.genre] : ['Unknown']; 
        } 
    })(),
    trackCount: row.track_count,
    isFavorite: Boolean(row.is_favorite)
});

// GET all albums
router.get('/', async (req, res, next) => {
    try {
        const { limit, offset, search } = req.query;
        let query = db('albums').select('*').orderBy('created_at', 'desc');

        if (search) {
            const term = `%${search}%`;
            query = query.where(function() {
                this.where('title', 'like', term)
                    .orWhere('artist_name', 'like', term);
            });
        }

        if (limit) {
            query = query.limit(parseInt(limit));
        }
        if (offset) {
            query = query.offset(parseInt(offset));
        }

        const albums = await query;
        res.json(albums.map(transformAlbum));
    } catch (err) {
        next(err);
    }
});

// GET album by ID with songs
router.get('/:id', async (req, res, next) => {
    try {
        const album = await db('albums').where({ id: req.params.id }).first();
        if (!album) {
            return res.status(404).json({ error: 'Album not found' });
        }

        const songs = await db('songs').where({ album_id: req.params.id }).select('*');

        res.json({
            ...transformAlbum(album),
            songs: songs.map(s => ({
                id: s.id,
                title: s.title,
                artist: s.artist_name,
                album: s.album_name,
                duration: s.duration,
                coverUrl: s.cover_url,
                genre: (() => { try { return JSON.parse(s.genre); } catch { return [s.genre]; } })(),
                isFavorite: Boolean(s.is_favorite)
            }))
        });
    } catch (err) {
        next(err);
    }
});

// POST create album
router.post('/', async (req, res, next) => {
    try {
        const { title, artist, artistId, coverUrl, year, genre } = req.body;
        const id = uuidv4();

        const genreString = Array.isArray(genre) ? JSON.stringify(genre) : JSON.stringify([genre]);

        await db('albums').insert({
            id,
            title,
            artist_name: artist,
            artist_id: artistId,
            cover_url: coverUrl,
            year,
            genre: genreString,
            track_count: 0,
            is_favorite: false
        });

        const album = await db('albums').where({ id }).first();
        const transformed = transformAlbum(album);
        broadcast('album:update', transformed);
        res.status(201).json(transformed);
    } catch (err) {
        next(err);
    }
});

// PUT update album
router.put('/:id', async (req, res, next) => {
    try {
        const { title, artist, year, genre } = req.body;

        const genreString = Array.isArray(genre) ? JSON.stringify(genre) : JSON.stringify([genre]);

        await db('albums').where({ id: req.params.id }).update({
            title,
            artist_name: artist,
            year,
            genre: genreString
        });

        const album = await db('albums').where({ id: req.params.id }).first();
        if (!album) {
            return res.status(404).json({ error: 'Album not found' });
        }
        const transformed = transformAlbum(album);
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
        const transformed = transformAlbum(album);
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
        const transformed = transformAlbum(updated);
        broadcast('album:update', transformed);
        res.json(transformed);
    } catch (err) {
        next(err);
    }
});

// DELETE album
router.delete('/:id', async (req, res, next) => {
    try {
        const deleted = await db('albums').where({ id: req.params.id }).del();
        if (!deleted) {
            return res.status(404).json({ error: 'Album not found' });
        }
        broadcast('album:delete', { id: req.params.id });
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

export default router;
