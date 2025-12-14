
import express from 'express';
import db from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import { broadcast } from '../services/sse.js';
import { identifySongMetadata, downloadCoverImage } from '../services/metadataService.js';
import { config } from '../config/env.js';

const router = express.Router();

// Configure multer for cover uploads
const storage = multer.diskStorage({
    destination: path.join(config.UPLOAD_DIR, 'covers'),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `song-${Date.now()}${ext}`);
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
    fileUrl: row.file_path ? `/api/songs/${row.id}/stream` : null,
    genre: (() => { 
        try { 
            return JSON.parse(row.genre); 
        } catch { 
            return row.genre ? [row.genre] : ['Unknown']; 
        } 
    })(),
    isFavorite: Boolean(row.is_favorite),
    lyrics: row.lyrics,
    bitrate: row.bitrate,
    format: row.format
});

// GET all songs
router.get('/', async (req, res, next) => {
    try {
        const { limit, offset, search, favorites } = req.query;
        let query = db('songs').select('*').orderBy('created_at', 'desc');
        
        if (search) {
            const term = `%${search}%`;
            query = query.where(function() {
                this.where('title', 'like', term)
                    .orWhere('artist_name', 'like', term)
                    .orWhere('album_name', 'like', term);
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

        const songs = await query;
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

// POST identify song using audio fingerprinting
router.post('/:id/identify', async (req, res, next) => {
    try {
        const song = await db('songs').where({ id: req.params.id }).first();
        if (!song || !song.file_path) {
            return res.status(404).json({ error: 'Song or file not found' });
        }

        // 1. Identify
        const metadata = await identifySongMetadata(song.file_path);

        // 2. Download Cover if available
        let coverUrl = song.cover_url;
        if (metadata.coverUrl) {
            const downloaded = await downloadCoverImage(metadata.coverUrl, `auto-${song.id}`);
            if (downloaded) coverUrl = downloaded;
        }

        // 3. Update Artist (find or create)
        let artistId = song.artist_id;
        if (metadata.artist) {
             const existingArtist = await db('artists').where('name', 'like', metadata.artist).first();
             if (existingArtist) {
                 artistId = existingArtist.id;
             } else {
                 artistId = uuidv4();
                 await db('artists').insert({
                     id: artistId,
                     name: metadata.artist,
                     avatar_url: `https://picsum.photos/seed/${encodeURIComponent(metadata.artist)}/200/200`
                 });
             }
        }

        // 4. Update Album (find or create)
        let albumId = song.album_id;
        if (metadata.album) {
            const existingAlbum = await db('albums').where('title', 'like', metadata.album).first();
            if (existingAlbum) {
                albumId = existingAlbum.id;
            } else {
                albumId = uuidv4();
                await db('albums').insert({
                    id: albumId,
                    title: metadata.album,
                    artist_id: artistId,
                    artist_name: metadata.artist,
                    cover_url: coverUrl || `https://picsum.photos/seed/${encodeURIComponent(metadata.album)}/300/300`,
                    year: metadata.year,
                    genre: JSON.stringify(metadata.genre || []),
                    track_count: 1
                });
            }
        }

        // 5. Update Song
        await db('songs').where({ id: req.params.id }).update({
            title: metadata.title || song.title,
            artist_name: metadata.artist || song.artist_name,
            artist_id: artistId,
            album_name: metadata.album || song.album_name,
            album_id: albumId,
            cover_url: coverUrl
            // We generally don't overwrite genre from AcoustID as it's often empty, keeping existing is safer
        });

        const updatedSong = await db('songs').where({ id: req.params.id }).first();
        const transformed = transformSong(updatedSong);
        
        broadcast('song:update', transformed);
        res.json(transformed);

    } catch (err) {
        // Return 500 but with specific error message
        res.status(500).json({ 
            error: err.message || 'Identification failed', 
            details: 'Ensure fpcalc is installed on the server.' 
        });
    }
});

// POST create song
router.post('/', async (req, res, next) => {
    try {
        const { title, artist, album, duration, coverUrl, genre, filePath } = req.body;
        const id = uuidv4();

        // Ensure genre is stringified for DB
        const genreString = Array.isArray(genre) ? JSON.stringify(genre) : JSON.stringify([genre]);

        await db('songs').insert({
            id,
            title,
            artist_name: artist,
            album_name: album,
            duration,
            cover_url: coverUrl,
            genre: genreString,
            file_path: filePath,
            is_favorite: false
        });

        const song = await db('songs').where({ id }).first();
        const transformed = transformSong(song);
        broadcast('song:update', transformed); // Treat create as update for list syncing
        res.status(201).json(transformed);
    } catch (err) {
        next(err);
    }
});

// PUT update song
router.put('/:id', async (req, res, next) => {
    try {
        const { title, artist, album, genre, coverUrl } = req.body;
        
        // Ensure genre is stringified for DB
        const genreString = Array.isArray(genre) ? JSON.stringify(genre) : JSON.stringify([genre]);

        await db('songs').where({ id: req.params.id }).update({
            title,
            artist_name: artist,
            album_name: album,
            genre: genreString,
            cover_url: coverUrl
        });

        const song = await db('songs').where({ id: req.params.id }).first();
        if (!song) {
            return res.status(404).json({ error: 'Song not found' });
        }
        const transformed = transformSong(song);
        broadcast('song:update', transformed);
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

        const updated = await db('songs').where({ id: req.params.id }).first();
        const transformed = transformSong(updated);
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

        await db('songs').where({ id: req.params.id }).update({ lyrics });

        const song = await db('songs').where({ id: req.params.id }).first();
        if (!song) {
            return res.status(404).json({ error: 'Song not found' });
        }
        const transformed = transformSong(song);
        broadcast('song:update', transformed);
        res.json(transformed);
    } catch (err) {
        next(err);
    }
});

// PATCH update song cover
router.patch('/:id/cover', upload.single('cover'), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No cover image provided' });
        }

        const coverUrl = `/uploads/covers/${req.file.filename}`;

        await db('songs').where({ id: req.params.id }).update({
            cover_url: coverUrl
        });

        const song = await db('songs').where({ id: req.params.id }).first();
        if (!song) {
            return res.status(404).json({ error: 'Song not found' });
        }
        const transformed = transformSong(song);
        broadcast('song:update', transformed);
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
