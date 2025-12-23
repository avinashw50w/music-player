
import express from 'express';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database.js';
import { config } from '../config/env.js';
import { extractMetadata, extractCoverArt } from '../services/audioService.js';
import { addClient, removeClient, broadcast, updateScanStatus, currentScanStatus } from '../services/sse.js';

const router = express.Router();
let isScanCancelled = false;

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
            if (isScanCancelled) break; 
            const entry = path.join(dir, d.name);
            if (d.isDirectory()) yield* walk(entry);
            else if (d.isFile()) yield entry;
        }
    } catch (e) {
        console.error(`Error scanning directory ${dir}:`, e);
    }
}

// GET library stats
router.get('/stats', async (req, res, next) => {
    try {
        const [songs] = await db('songs').count('id as count');
        const [albums] = await db('albums').count('id as count');
        const [artists] = await db('artists').count('id as count');
        const [playlists] = await db('playlists').count('id as count');
        
        res.json({
            songCount: songs.count || 0,
            albumCount: albums.count || 0,
            artistCount: artists.count || 0,
            playlistCount: playlists.count || 0
        });
    } catch (err) {
        next(err);
    }
});

// POST start scanning
router.post('/scan', async (req, res) => {
    let { path: scanPath } = req.body;

    if (!scanPath) {
        return res.status(400).json({ error: 'Path is required' });
    }

    // Resolve to absolute path to ensure consistency
    scanPath = path.resolve(scanPath);

    if (currentScanStatus.isScanning) {
        return res.status(409).json({ error: 'Scan already in progress' });
    }

    // Reset status
    isScanCancelled = false;
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
                if (isScanCancelled) break;
                const ext = path.extname(file).toLowerCase();
                if (audioExtensions.includes(ext)) {
                    audioFiles.push(file);
                }
            }

            if (isScanCancelled) {
                updateScanStatus({ isScanning: false, currentFile: 'Scan cancelled.' });
                broadcast('scan:complete', currentScanStatus);
                return;
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

            // Ensure covers directory exists
            const coversDir = path.join(config.UPLOAD_DIR, 'covers');
            if (!fs.existsSync(coversDir)) {
                fs.mkdirSync(coversDir, { recursive: true });
            }

            // 3. Process files
            for (let i = 0; i < audioFiles.length; i++) {
                if (isScanCancelled) {
                    updateScanStatus({ 
                        isScanning: false, 
                        currentFile: 'Scan cancelled by user.',
                        progress: 0
                    });
                    broadcast('scan:complete', currentScanStatus);
                    return;
                }

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
                    
                    // Extract Cover Art to temporary file
                    let hasExtractedCover = false;
                    const tempCoverFilename = `temp-${songId}.jpg`;
                    const tempCoverPath = path.join(coversDir, tempCoverFilename);
                    
                    try {
                        const extractedPath = await extractCoverArt(filePath, tempCoverPath);
                        if (extractedPath) hasExtractedCover = true;
                    } catch (e) {
                        // console.warn('Cover extraction failed', e);
                    }

                    // Album Logic
                    let albumId = null;
                    let coverUrl = `https://picsum.photos/seed/${songId}/200/200`; // Default fallback

                    if (metadata.album) {
                        const existingAlbum = await db('albums').where('title', 'like', metadata.album).first();
                        
                        if (existingAlbum) {
                            albumId = existingAlbum.id;
                            
                            // Check if album already has a proper local cover (named {albumId}.jpg)
                            const finalCoverFilename = `${albumId}.jpg`;
                            const finalCoverPath = path.join(coversDir, finalCoverFilename);
                            
                            if (fs.existsSync(finalCoverPath)) {
                                // Use existing local cover
                                coverUrl = `/uploads/covers/${finalCoverFilename}`;
                                // Clean up temp extracted cover since we don't need it
                                if (hasExtractedCover) fs.unlink(tempCoverPath, ()=>{});
                            } else {
                                // No local cover exists. If we extracted one, adopt it.
                                if (hasExtractedCover) {
                                    await fs.promises.rename(tempCoverPath, finalCoverPath);
                                    coverUrl = `/uploads/covers/${finalCoverFilename}`;
                                    // Update album record with new local cover
                                    await db('albums').where({ id: albumId }).update({ cover_url: coverUrl });
                                } else {
                                    // Keep existing URL (remote or fallback)
                                    coverUrl = existingAlbum.cover_url;
                                }
                            }
                            
                            await db('albums').where({ id: albumId }).increment('track_count', 1);
                        } else {
                            // Create New Album
                            albumId = uuidv4();
                            
                            if (hasExtractedCover) {
                                const finalCoverFilename = `${albumId}.jpg`;
                                const finalCoverPath = path.join(coversDir, finalCoverFilename);
                                await fs.promises.rename(tempCoverPath, finalCoverPath);
                                coverUrl = `/uploads/covers/${finalCoverFilename}`;
                            } else {
                                coverUrl = `https://picsum.photos/seed/${encodeURIComponent(metadata.album)}/300/300`;
                            }

                            await db('albums').insert({
                                id: albumId,
                                title: metadata.album,
                                cover_url: coverUrl,
                                year: metadata.year,
                                genre: JSON.stringify(metadata.genre),
                                track_count: 1
                            });
                        }
                    } else {
                        // No album metadata. 
                        // Clean up temp cover if extracted (or could use for song-specific, but keeping it simple)
                        if (hasExtractedCover) fs.unlink(tempCoverPath, ()=>{});
                    }

                    // Insert Song
                    await db('songs').insert({
                        id: songId,
                        title: metadata.title,
                        album_id: albumId,
                        duration_seconds: metadata.durationSeconds,
                        file_path: filePath,
                        genre: JSON.stringify(metadata.genre),
                        is_favorite: false,
                        bitrate: metadata.bitrate,
                        format: metadata.format,
                        lyrics: metadata.lyrics
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

// POST stop scanning
router.post('/scan/stop', (req, res) => {
    if (currentScanStatus.isScanning) {
        isScanCancelled = true;
        res.json({ success: true, message: 'Scan stop requested' });
    } else {
        res.json({ success: false, message: 'No scan in progress' });
    }
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
