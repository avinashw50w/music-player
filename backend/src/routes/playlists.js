import express from 'express';
import db from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Helper to transform DB row to API response format
const transformPlaylist = (row) => ({
    id: row.id,
    name: row.name,
    coverUrl: row.cover_url,
    createdAt: row.created_at
});

// GET all playlists
router.get('/', async (req, res, next) => {
    try {
        const playlists = await db('playlists').select('*').orderBy('created_at', 'desc');

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
        const songs = await db('songs').whereIn('id', songIds).select('*');

        // Sort songs by playlist order
        const orderedSongs = songIds.map(id => songs.find(s => s.id === id)).filter(Boolean);

        res.json({
            ...transformPlaylist(playlist),
            songIds,
            songs: orderedSongs.map(s => ({
                id: s.id,
                title: s.title,
                artist: s.artist_name,
                album: s.album_name,
                duration: s.duration,
                coverUrl: s.cover_url,
                genre: s.genre,
                isFavorite: Boolean(s.is_favorite),
                fileUrl: s.file_path ? `/uploads/audio/${s.file_path.split('/').pop()}` : null
            }))
        });
    } catch (err) {
        next(err);
    }
});

// POST create playlist
router.post('/', async (req, res, next) => {
    try {
        const { name, coverUrl } = req.body;
        const id = uuidv4();

        await db('playlists').insert({
            id,
            name,
            cover_url: coverUrl || `https://picsum.photos/seed/${name}-${Date.now()}/200/200`
        });

        const playlist = await db('playlists').where({ id }).first();
        res.status(201).json({
            ...transformPlaylist(playlist),
            songIds: [],
            songCount: 0
        });
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

        const playlist = await db('playlists').where({ id: req.params.id }).first();
        if (!playlist) {
            return res.status(404).json({ error: 'Playlist not found' });
        }
        res.json(transformPlaylist(playlist));
    } catch (err) {
        next(err);
    }
});

// DELETE playlist
router.delete('/:id', async (req, res, next) => {
    try {
        // Delete associated playlist_songs first (handled by CASCADE)
        const deleted = await db('playlists').where({ id: req.params.id }).del();
        if (!deleted) {
            return res.status(404).json({ error: 'Playlist not found' });
        }
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

// POST add song to playlist
router.post('/:id/songs', async (req, res, next) => {
    try {
        const { songId } = req.body;

        // Check if already in playlist
        const exists = await db('playlist_songs')
            .where({ playlist_id: req.params.id, song_id: songId })
            .first();

        if (exists) {
            return res.status(400).json({ error: 'Song already in playlist' });
        }

        // Get max position
        const maxPos = await db('playlist_songs')
            .where({ playlist_id: req.params.id })
            .max('position as max')
            .first();

        await db('playlist_songs').insert({
            playlist_id: req.params.id,
            song_id: songId,
            position: (maxPos?.max || 0) + 1
        });

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

        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

// PUT reorder songs in playlist
router.put('/:id/reorder', async (req, res, next) => {
    try {
        const { songIds } = req.body;

        // Update positions
        await Promise.all(
            songIds.map((songId, index) =>
                db('playlist_songs')
                    .where({ playlist_id: req.params.id, song_id: songId })
                    .update({ position: index + 1 })
            )
        );

        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

export default router;