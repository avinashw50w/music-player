
import express from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database.js';
import { config } from '../config/env.js';
import { extractMetadata } from '../services/audioService.js';

const router = express.Router();

// Configure multer for audio uploads
const audioStorage = multer.diskStorage({
    destination: path.join(config.UPLOAD_DIR, 'audio'),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}-${uuidv4().slice(0, 8)}${ext}`);
    }
});

const coverStorage = multer.diskStorage({
    destination: path.join(config.UPLOAD_DIR, 'covers'),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `cover-${Date.now()}${ext}`);
    }
});

const audioUpload = multer({
    storage: audioStorage,
    fileFilter: (req, file, cb) => {
        const allowed = ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg', '.wma'];
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, allowed.includes(ext));
    },
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB limit
    }
});

const coverUpload = multer({
    storage: coverStorage,
    fileFilter: (req, file, cb) => {
        const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, allowed.includes(ext));
    }
});

// Helper to process multiple artists
async function linkArtistsToSong(songId, artistNames) {
    let primaryArtistId = null;
    
    for (let i = 0; i < artistNames.length; i++) {
        const name = artistNames[i].trim();
        if (!name) continue;

        let artistId;
        const existing = await db('artists').where('name', 'like', name).first();
        
        if (existing) {
            artistId = existing.id;
        } else {
            artistId = uuidv4();
            await db('artists').insert({
                id: artistId,
                name: name,
                avatar_url: `https://picsum.photos/seed/${encodeURIComponent(name)}/200/200`
            });
        }

        if (i === 0) primaryArtistId = artistId;

        try {
            await db('song_artists').insert({
                song_id: songId,
                artist_id: artistId,
                is_primary: i === 0 // First one is primary
            });
        } catch(e) {
            // ignore unique constraint
        }
    }
    return primaryArtistId;
}

// POST upload audio files
router.post('/audio', audioUpload.array('files', 50), async (req, res, next) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No audio files provided' });
        }

        const songs = [];
        const total = req.files.length;

        for (let i = 0; i < req.files.length; i++) {
            const file = req.files[i];
            const filePath = file.path;

            try {
                // Extract metadata
                const metadata = await extractMetadata(filePath);

                const songId = uuidv4();

                // Check/create album
                let albumId = null;
                // Default cover
                let coverUrl = `https://picsum.photos/seed/${songId}/100/100`;

                if (metadata.album && metadata.album !== 'Unknown Album') {
                    const existingAlbum = await db('albums')
                        .where('title', 'like', metadata.album)
                        .first();

                    if (existingAlbum) {
                        albumId = existingAlbum.id;
                        coverUrl = existingAlbum.cover_url;
                        // Update track count
                        await db('albums').where({ id: albumId }).increment('track_count', 1);
                    } else {
                        albumId = uuidv4();
                        coverUrl = `https://picsum.photos/seed/${encodeURIComponent(metadata.album)}/300/300`;
                        await db('albums').insert({
                            id: albumId,
                            title: metadata.album,
                            cover_url: coverUrl,
                            year: metadata.year,
                            genre: JSON.stringify(metadata.genre), 
                            track_count: 1
                        });
                    }
                }

                // Insert song
                await db('songs').insert({
                    id: songId,
                    title: metadata.title,
                    album_id: albumId,
                    duration_seconds: metadata.durationSeconds,
                    file_path: filePath,
                    genre: JSON.stringify(metadata.genre), 
                    is_favorite: false,
                    bitrate: metadata.bitrate,
                    format: metadata.format
                });

                // Process artists (Linking happens after song creation due to FK)
                await linkArtistsToSong(songId, metadata.artists);

                songs.push({
                    id: songId,
                    title: metadata.title,
                    artist: metadata.artist,
                    album: metadata.album,
                    duration: metadata.duration,
                    coverUrl: coverUrl,
                    fileUrl: `/uploads/audio/${file.filename}`,
                    genre: metadata.genre,
                    isFavorite: false,
                    progress: Math.round(((i + 1) / total) * 100)
                });
            } catch (err) {
                console.error(`Error processing ${file.originalname}:`, err);
                // Continue with next file
            }
        }

        res.json({
            success: true,
            count: songs.length,
            songs
        });
    } catch (err) {
        next(err);
    }
});

// POST upload folder (same as audio but with folder structure indication)
router.post('/folder', audioUpload.array('files', 200), async (req, res, next) => {
    // Reusing same logic logic as audio upload, simplified for this response
    // In a real app, you might want to DRY this up by calling a shared processing function.
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No audio files provided' });
        }

        const songs = [];
        const total = req.files.length;

        for (let i = 0; i < req.files.length; i++) {
            const file = req.files[i];
            const filePath = file.path;

            try {
                const metadata = await extractMetadata(filePath);
                const songId = uuidv4();

                let albumId = null;
                let coverUrl = `https://picsum.photos/seed/${songId}/100/100`;

                if (metadata.album && metadata.album !== 'Unknown Album') {
                    const existingAlbum = await db('albums')
                        .where('title', 'like', metadata.album)
                        .first();

                    if (existingAlbum) {
                        albumId = existingAlbum.id;
                        coverUrl = existingAlbum.cover_url;
                        await db('albums').where({ id: albumId }).increment('track_count', 1);
                    } else {
                        albumId = uuidv4();
                        coverUrl = `https://picsum.photos/seed/${encodeURIComponent(metadata.album)}/300/300`;
                        await db('albums').insert({
                            id: albumId,
                            title: metadata.album,
                            cover_url: coverUrl,
                            year: metadata.year,
                            genre: JSON.stringify(metadata.genre), 
                            track_count: 1
                        });
                    }
                }

                await db('songs').insert({
                    id: songId,
                    title: metadata.title,
                    album_id: albumId,
                    duration_seconds: metadata.durationSeconds,
                    file_path: filePath,
                    genre: JSON.stringify(metadata.genre), 
                    is_favorite: false,
                    bitrate: metadata.bitrate,
                    format: metadata.format
                });

                await linkArtistsToSong(songId, metadata.artists);

                songs.push({
                    id: songId,
                    title: metadata.title,
                    artist: metadata.artist,
                    album: metadata.album,
                    duration: metadata.duration,
                    coverUrl: coverUrl,
                    fileUrl: `/uploads/audio/${file.filename}`,
                    genre: metadata.genre,
                    isFavorite: false
                });
            } catch (err) {
                console.error(`Error processing ${file.originalname}:`, err);
            }
        }

        res.json({
            success: true,
            count: songs.length,
            songs
        });
    } catch (err) {
        next(err);
    }
});

// POST upload cover image
router.post('/cover', coverUpload.single('cover'), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No cover image provided' });
        }

        const coverUrl = `/uploads/covers/${req.file.filename}`;

        res.json({
            success: true,
            coverUrl
        });
    } catch (err) {
        next(err);
    }
});

export default router;
