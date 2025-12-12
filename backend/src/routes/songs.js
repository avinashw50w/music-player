import express from 'express';
import db from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Helper to transform DB row to API response format
const transformSong = (row) => ({
    id: row.id,
    title: row.title,
    artist: row.artist_name,
    artistId: row.artist_id,
    album: row.album_name,
    albumId: row.album_id,
    duration: row.duration,
    durationSeconds: row.duration_seconds,
    coverUrl: row.cover_url,
    fileUrl: row.file_path ? `/uploads/audio/${row.file_path.split('/').pop()}` : null,
    genre: row.genre,
    isFavorite: Boolean(row.is_favorite),
    lyrics: row.lyrics,
    bitrate: row.bitrate,
    format: row.format,
    waveformData: row.waveform_data ? JSON.parse(row.waveform_data) : null
});

// GET all songs
router.get('/', async (req, res, next) => {
    try {
        const songs = await db('songs').select('*').orderBy('created_at', 'desc');
        res.json(songs.map(transformSong));
    } catch (err) {
        next(err);
    }
});

// GET song by ID
router.get('/:id', async (req, res, next) => {
    try {
        const song = await db('songs').where({ id: req.params.id }).first();
        if (!song) {
            return res.status(404).json({ error: 'Song not found' });
        }
        res.json(transformSong(song));
    } catch (err) {
        next(err);
    }
});

// POST create song
router.post('/', async (req, res, next) => {
    try {
        const { title, artist, album, duration, coverUrl, genre, filePath } = req.body;
        const id = uuidv4();

        await db('songs').insert({
            id,
            title,
            artist_name: artist,
            album_name: album,
            duration,
            cover_url: coverUrl,
            genre,
            file_path: filePath,
            is_favorite: false
        });

        const song = await db('songs').where({ id }).first();
        res.status(201).json(transformSong(song));
    } catch (err) {
        next(err);
    }
});

// PUT update song
router.put('/:id', async (req, res, next) => {
    try {
        const { title, artist, album, genre, coverUrl } = req.body;

        await db('songs').where({ id: req.params.id }).update({
            title,
            artist_name: artist,
            album_name: album,
            genre,
            cover_url: coverUrl
        });

        const song = await db('songs').where({ id: req.params.id }).first();
        if (!song) {
            return res.status(404).json({ error: 'Song not found' });
        }
        res.json(transformSong(song));
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

        const updated = await db('songs').where({ id: req.params.id }).first();
        res.json(transformSong(updated));
    } catch (err) {
        next(err);
    }
});

// PATCH update lyrics
router.patch('/:id/lyrics', async (req, res, next) => {
    try {
        const { lyrics } = req.body;

        await db('songs').where({ id: req.params.id }).update({ lyrics });

        const song = await db('songs').where({ id: req.params.id }).first();
        if (!song) {
            return res.status(404).json({ error: 'Song not found' });
        }
        res.json(transformSong(song));
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
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

export default router;
