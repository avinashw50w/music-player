import express from 'express';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database.js';
import { extractMetadata, generateWaveform, extractCoverArt } from '../services/audioService.js';
import { addClient, removeClient, broadcast, updateScanStatus, currentScanStatus } from '../services/sse.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// SSE Endpoint
router.get('/events', (req, res) => {
    const headers = {
        'Content-Type': 'text/event-stream',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache'
    };
    res.writeHead(200, headers);

    const clientId = addClient(res);

    req.on('close', () => {
        removeClient(clientId);
    });
});

// Recursively walk directory
async function* walk(dir) {
    try {
        const files = await fs.promises.readdir(dir, { withFileTypes: true });
        for (const d of files) {
            const entry = path.join(dir, d.name);
            if (d.isDirectory()) yield* walk(entry);
            else if (d.isFile()) yield entry;
        }
    } catch (e) {
        console.error(`Error scanning directory ${dir}:`, e);
    }
}

// POST start scanning
router.post('/scan', async (req, res) => {
    const { path: scanPath } = req.body;

    if (!scanPath) {
        return res.status(400).json({ error: 'Path is required' });
    }

    if (currentScanStatus.isScanning) {
        return res.status(409).json({ error: 'Scan already in progress' });
    }

    // Reset status
    updateScanStatus({
        isScanning: true,
        progress: 0,
        currentFile: 'Starting scan...',
        totalFound: 0,
        processed: 0,
        error: null
    });

    broadcast('scan:start', currentScanStatus);
    res.json({ success: true, message: 'Scan started' });

    // Process scan asynchronously
    (async () => {
        try {
            // 1. Count files first for progress
            updateScanStatus({ currentFile: 'Counting files...' });
            broadcast('scan:progress', currentScanStatus);
            
            const audioExtensions = ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg', '.wma'];
            let audioFiles = [];

            for await (const file of walk(scanPath)) {
                const ext = path.extname(file).toLowerCase();
                if (audioExtensions.includes(ext)) {
                    audioFiles.push(file);
                }
            }

            updateScanStatus({ totalFound: audioFiles.length });
            
            if (currentScanStatus.totalFound === 0) {
                updateScanStatus({
                    isScanning: false,
                    currentFile: 'No audio files found',
                    progress: 100
                });
                broadcast('scan:complete', currentScanStatus);
                return;
            }

            // 2. Process files
            for (let i = 0; i < audioFiles.length; i++) {
                const filePath = audioFiles[i];
                updateScanStatus({
                    currentFile: path.basename(filePath),
                    processed: i + 1,
                    progress: Math.round(((i + 1) / currentScanStatus.totalFound) * 100)
                });

                // Broadcast progress every file
                broadcast('scan:progress', currentScanStatus);

                try {
                    // Check if file already exists in DB (by exact path)
                    const existing = await db('songs').where({ file_path: filePath }).first();
                    if (existing) continue;

                    const metadata = await extractMetadata(filePath);
                    const waveform = await generateWaveform(filePath);
                    
                    const songId = uuidv4();
                    
                    // Extract Cover Art
                    let coverUrl = `https://picsum.photos/seed/${songId}/200/200`; // Fallback
                    const coverFilename = `cover-${Date.now()}-${uuidv4().slice(0,8)}.jpg`;
                    const coverPath = path.join(__dirname, '../../uploads/covers', coverFilename);
                    
                    try {
                        const extractedCover = await extractCoverArt(filePath, coverPath);
                        if (extractedCover) {
                            coverUrl = `/uploads/covers/${coverFilename}`;
                        }
                    } catch (e) {
                        console.warn('Cover extraction failed', e);
                    }

                    // Artist Logic
                    let artistId = null;
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

                    // Album Logic
                    let albumId = null;
                    if (metadata.album) {
                        const existingAlbum = await db('albums').where('title', 'like', metadata.album).first();
                        if (existingAlbum) {
                            albumId = existingAlbum.id;
                            await db('albums').where({ id: albumId }).increment('track_count', 1);
                        } else {
                            albumId = uuidv4();
                            await db('albums').insert({
                                id: albumId,
                                title: metadata.album,
                                artist_id: artistId,
                                artist_name: metadata.artist || 'Unknown Artist',
                                cover_url: coverUrl, // Use same cover for album
                                year: metadata.year,
                                genre: JSON.stringify(metadata.genre),
                                track_count: 1
                            });
                        }
                    }

                    await db('songs').insert({
                        id: songId,
                        title: metadata.title,
                        artist_id: artistId,
                        artist_name: metadata.artist,
                        album_id: albumId,
                        album_name: metadata.album,
                        duration: metadata.duration,
                        duration_seconds: metadata.durationSeconds,
                        cover_url: coverUrl,
                        file_path: filePath, // STORE ABSOLUTE PATH
                        genre: JSON.stringify(metadata.genre),
                        is_favorite: false,
                        bitrate: metadata.bitrate,
                        format: metadata.format,
                        waveform_data: JSON.stringify(waveform)
                    });

                } catch (err) {
                    console.error(`Failed to process ${filePath}`, err);
                }
            }

            updateScanStatus({ isScanning: false });
            broadcast('scan:complete', currentScanStatus);
        } catch (err) {
            console.error('Scan failed:', err);
            updateScanStatus({
                error: err.message,
                isScanning: false
            });
            broadcast('scan:error', currentScanStatus);
        }
    })();
});

// GET scan status
router.get('/status', (req, res) => {
    res.json(currentScanStatus);
});

// POST refresh library
router.post('/refresh', async (req, res, next) => {
    try {
        const songs = await db('songs').select('id', 'file_path', 'title');
        let removedCount = 0;

        for (const song of songs) {
            if (song.file_path) {
                try {
                    await fs.promises.access(song.file_path);
                } catch {
                    // File does not exist, delete from DB
                    await db('songs').where({ id: song.id }).del();
                    console.log(`Removed missing song: ${song.title} (${song.file_path})`);
                    removedCount++;
                    broadcast('song:delete', { id: song.id });
                }
            }
        }
        
        res.json({ success: true, removedCount, message: `Library refreshed. Removed ${removedCount} missing songs.` });
    } catch (err) {
        next(err);
    }
});

export default router;