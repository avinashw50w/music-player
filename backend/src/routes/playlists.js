
import express from 'express';
import db from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { broadcast } from '../services/sse.js';
import { config } from '../config/env.js';

const router = express.Router();

// Helper to transform DB row to API response format
const transformPlaylist = (row) => ({
    id: row.id,
    name: row.name,
    coverUrl: row.cover_url,
    createdAt: row.created_at,
    isFavorite: Boolean(row.is_favorite)
});

// Format duration helper
const formatDuration = (seconds) => {
    if (!seconds) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

// Helper to get full playlist with song IDs for broadcast
const getFullPlaylist = async (id) => {
    const playlist = await db('playlists').where({ id }).first();
    if (!playlist) return null;
    
    const songs = await db('playlist_songs')
        .where({ playlist_id: id })
        .orderBy('position', 'asc')
        .select('song_id');

    return {
        ...transformPlaylist(playlist),
        songIds: songs.map(s => s.song_id),
        songCount: songs.length
    };
};

// GET all playlists
router.get('/', async (req, res, next) => {
    try {
        const { favorites } = req.query;
        let query = db('playlists').select('*').orderBy('created_at', 'desc');

        if (favorites === 'true') {
            query = query.where('is_favorite', true);
        }

        const playlists = await query;

        // Get songs and counts for each playlist
        const playlistsWithSongs = await Promise.all(
            playlists.map(async (p) => {
                const songs = await db('playlist_songs')
                    .where({ playlist_id: p.id })
                    .orderBy('position', 'asc')
                    .select('song_id');
                
                return {
                    ...transformPlaylist(p),
                    songIds: songs.map(s => s.song_id),
                    songCount: songs.length
                };
            })
        );

        res.json(playlistsWithSongs);
    } catch (err) {
        next(err);
    }
});

// GET playlist by ID with songs
router.get('/:id', async (req, res, next) => {
    try {
        const playlist = await db('playlists').where({ id: req.params.id }).first();
        if (!playlist) {
            return res.status(404).json({ error: 'Playlist not found' });
        }

        // Get songs in playlist order
        const playlistSongs = await db('playlist_songs')
            .where({ playlist_id: req.params.id })
            .orderBy('position', 'asc')
            .select('song_id');

        const songIds = playlistSongs.map(ps => ps.song_id);

        // Get full song data
        if (songIds.length > 0) {
            const songs = await db('songs')
                .leftJoin('albums', 'songs.album_id', 'albums.id')
                .whereIn('songs.id', songIds)
                .select('songs.*', 'albums.title as album_title', 'albums.cover_url as album_cover_url');

            // Fetch artists
            const songArtists = await db('song_artists')
                .join('artists', 'song_artists.artist_id', 'artists.id')
                .whereIn('song_artists.song_id', songIds)
                .select('song_artists.song_id', 'artists.id', 'artists.name');

            const artistsBySong = {};
            songArtists.forEach(sa => {
                if (!artistsBySong[sa.song_id]) artistsBySong[sa.song_id] = [];
                artistsBySong[sa.song_id].push({ id: sa.id, name: sa.name });
            });

            // Map back to ordered list
            const orderedSongs = songIds.map(id => songs.find(s => s.id === id)).filter(Boolean);

            res.json({
                ...transformPlaylist(playlist),
                songIds,
                songs: orderedSongs.map(s => {
                    const artists = artistsBySong[s.id] || [];
                    return {
                        id: s.id,
                        title: s.title,
                        artist: artists.map(a => a.name).join(', '),
                        artistId: artists[0]?.id,
                        artists: artists,
                        album: s.album_title,
                        albumId: s.album_id,
                        duration: formatDuration(s.duration_seconds),
                        coverUrl: s.album_cover_url,
                        genre: (() => { try { return JSON.parse(s.genre); } catch { return [s.genre]; } })(),
                        isFavorite: Boolean(s.is_favorite),
                        fileUrl: s.file_path ? `/api/songs/${s.id}/stream` : null,
                        // Lyrics removed from list view
                    };
                })
            });
        } else {
            res.json({
                ...transformPlaylist(playlist),
                songIds: [],
                songs: []
            });
        }
    } catch (err) {
        next(err);
    }
});

// POST create playlist
router.post('/', async (req, res, next) => {
    try {
        const { name, coverUrl } = req.body;
        const id = uuidv4();
        
        let finalCoverUrl = coverUrl;

        if (!finalCoverUrl) {
            const tempUrl = `https://picsum.photos/seed/${encodeURIComponent(name)}-${Date.now()}/200/200`;
            try {
                const response = await fetch(tempUrl);
                if (response.ok) {
                    const filename = `playlist-${id}.jpg`;
                    const uploadDir = path.join(config.UPLOAD_DIR, 'covers');
                    if (!fs.existsSync(uploadDir)) {
                        fs.mkdirSync(uploadDir, { recursive: true });
                    }
                    const filepath = path.join(uploadDir, filename);
                    const fileStream = fs.createWriteStream(filepath);
                    // @ts-ignore
                    await pipeline(response.body, fileStream);
                    finalCoverUrl = `/uploads/covers/${filename}`;
                } else {
                    finalCoverUrl = tempUrl;
                }
            } catch (err) {
                finalCoverUrl = tempUrl;
            }
        }

        await db('playlists').insert({
            id,
            name,
            cover_url: finalCoverUrl,
            is_favorite: false
        });

        const playlist = await getFullPlaylist(id);
        broadcast('playlist:create', playlist);
        res.status(201).json(playlist);
    } catch (err) {
        next(err);
    }
});

// PUT rename playlist
router.put('/:id', async (req, res, next) => {
    try {
        const { name, coverUrl } = req.body;

        const updates = { name };
        if (coverUrl) updates.cover_url = coverUrl;

        await db('playlists').where({ id: req.params.id }).update(updates);

        const playlist = await getFullPlaylist(req.params.id);
        if (!playlist) {
            return res.status(404).json({ error: 'Playlist not found' });
        }
        broadcast('playlist:update', playlist);
        res.json(playlist);
    } catch (err) {
        next(err);
    }
});

// PATCH toggle favorite
router.patch('/:id/favorite', async (req, res, next) => {
    try {
        const playlist = await db('playlists').where({ id: req.params.id }).first();
        if (!playlist) {
            return res.status(404).json({ error: 'Playlist not found' });
        }

        await db('playlists').where({ id: req.params.id }).update({
            is_favorite: !playlist.is_favorite
        });

        const updated = await getFullPlaylist(req.params.id);
        broadcast('playlist:update', updated);
        res.json(updated);
    } catch (err) {
        next(err);
    }
});

// DELETE playlist
router.delete('/:id', async (req, res, next) => {
    try {
        const playlist = await db('playlists').where({ id: req.params.id }).first();
        const deleted = await db('playlists').where({ id: req.params.id }).del();
        
        if (!deleted) {
            return res.status(404).json({ error: 'Playlist not found' });
        }

        if (playlist && playlist.cover_url && playlist.cover_url.startsWith('/uploads/covers/playlist-')) {
             const filepath = path.join(config.UPLOAD_DIR, 'covers', path.basename(playlist.cover_url));
             fs.unlink(filepath, (err) => {});
        }
        
        broadcast('playlist:delete', { id: req.params.id });
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

// POST add song to playlist
router.post('/:id/songs', async (req, res, next) => {
    try {
        const { songId } = req.body;

        const exists = await db('playlist_songs')
            .where({ playlist_id: req.params.id, song_id: songId })
            .first();

        if (exists) {
            return res.status(400).json({ error: 'Song already in playlist' });
        }

        const maxPos = await db('playlist_songs')
            .where({ playlist_id: req.params.id })
            .max('position as max')
            .first();

        await db('playlist_songs').insert({
            playlist_id: req.params.id,
            song_id: songId,
            position: (maxPos?.max || 0) + 1
        });

        const playlist = await getFullPlaylist(req.params.id);
        broadcast('playlist:update', playlist);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

// DELETE remove song from playlist
router.delete('/:id/songs/:songId', async (req, res, next) => {
    try {
        await db('playlist_songs')
            .where({ playlist_id: req.params.id, song_id: req.params.songId })
            .del();

        const playlist = await getFullPlaylist(req.params.id);
        broadcast('playlist:update', playlist);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

// PUT reorder songs in playlist
router.put('/:id/reorder', async (req, res, next) => {
    try {
        const { songIds } = req.body;

        await Promise.all(
            songIds.map((songId, index) =>
                db('playlist_songs')
                    .where({ playlist_id: req.params.id, song_id: songId })
                    .update({ position: index + 1 })
            )
        );

        const playlist = await getFullPlaylist(req.params.id);
        broadcast('playlist:update', playlist);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

export default router;
