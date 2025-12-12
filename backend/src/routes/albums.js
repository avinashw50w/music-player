import express from 'express';
import db from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

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
    genre: row.genre,
    trackCount: row.track_count,
    isFavorite: Boolean(row.is_favorite)
});

// GET all albums
router.get('/', async (req, res, next) => {
    try {
        const albums = await db('albums').select('*').orderBy('created_at', 'desc');
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
                genre: s.genre,
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

        await db('albums').insert({
            id,
            title,
            artist_name: artist,
            artist_id: artistId,
            cover_url: coverUrl,
            year,
            genre,
            track_count: 0,
            is_favorite: false
        });

        const album = await db('albums').where({ id }).first();
        res.status(201).json(transformAlbum(album));
    } catch (err) {
        next(err);
    }
});

// PUT update album
router.put('/:id', async (req, res, next) => {
    try {
        const { title, artist, year, genre } = req.body;

        await db('albums').where({ id: req.params.id }).update({
            title,
            artist_name: artist,
            year,
            genre
        });

        const album = await db('albums').where({ id: req.params.id }).first();
        if (!album) {
            return res.status(404).json({ error: 'Album not found' });
        }
        res.json(transformAlbum(album));
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
        res.json(transformAlbum(album));
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
        res.json(transformAlbum(updated));
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
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

export default router;
