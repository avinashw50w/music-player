
import express from 'express';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database.js';
import { extractMetadata, extractCoverArt } from '../services/audioService.js';
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

            // 2. Fetch existing file paths to skip duplicates efficiently
            updateScanStatus({ currentFile: 'Checking database...' });
            const existingPaths = new Set();
            const existingSongs = await db('songs').select('file_path');
            existingSongs.forEach(s => existingPaths.add(s.file_path));

            // 3. Process files
            for (let i = 0; i < audioFiles.length; i++) {
                const filePath = audioFiles[i];
                
                // Skip if already exists
                if (existingPaths.has(filePath)) {
                    updateScanStatus({
                        currentFile: `Skipping: ${path.basename(filePath)}`,
                        processed: i + 1,
                        progress: Math.round(((i + 1) / currentScanStatus.totalFound) * 100)
                    });
                    broadcast('scan:progress', currentScanStatus);
                    continue; 
                }

                updateScanStatus({
                    currentFile: path.basename(filePath),
                    processed: i + 1,
                    progress: Math.round(((i + 1) / currentScanStatus.totalFound) * 100)
                });

                broadcast('scan:progress', currentScanStatus);

                try {
                    const metadata = await extractMetadata(filePath);
                    
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
                        // console.warn('Cover extraction failed', e);
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
                                cover_url: coverUrl, // Use extracted cover for album
                                year: metadata.year,
                                genre: JSON.stringify(metadata.genre),
                                track_count: 1
                            });
                        }
                    }

                    // Insert Song
                    await db('songs').insert({
                        id: songId,
                        title: metadata.title,
                        album_id: albumId,
                        duration_seconds: metadata.durationSeconds,
                        file_path: filePath, // STORE ABSOLUTE PATH
                        genre: JSON.stringify(metadata.genre),
                        is_favorite: false,
                        bitrate: metadata.bitrate,
                        format: metadata.format,
                        lyrics: metadata.lyrics // Store extracted lyrics
                    });

                    // Artist Logic (Multi-artist support)
                    if (metadata.artists && metadata.artists.length > 0) {
                        for (let j = 0; j < metadata.artists.length; j++) {
                            const name = metadata.artists[j].trim();
                            if (!name) continue;
                            
                            let artistId;
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
                            
                            try {
                                await db('song_artists').insert({
                                    song_id: songId,
                                    artist_id: artistId,
                                    is_primary: j === 0 // First is primary
                                });
                            } catch(e) {}
                        }
                    }

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
