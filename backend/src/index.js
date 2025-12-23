
import express from 'express';
import cors from 'cors';
import { config } from './config/env.js'; // Import config first
import { migrate } from './config/migrate.js';

// Routes
import songsRouter from './routes/songs.js';
import albumsRouter from './routes/albums.js';
import artistsRouter from './routes/artists.js';
import playlistsRouter from './routes/playlists.js';
import uploadRouter from './routes/upload.js';
import libraryRouter from './routes/library.js';
import settingsRouter from './routes/settings.js';

import { closeAllClients } from './services/sse.js';
import { fuzzySearch } from './services/searchService.js';

// Middleware
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = config.PORT;

// CORS configuration
app.use(cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file serving for uploads
app.use('/uploads', express.static(config.UPLOAD_DIR));

// API Routes
app.use('/api/songs', songsRouter);
app.use('/api/albums', albumsRouter);
app.use('/api/artists', artistsRouter);
app.use('/api/playlists', playlistsRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/library', libraryRouter);
app.use('/api/settings', settingsRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Format duration helper (duplicated here for simplicity or could import)
const formatDuration = (seconds) => {
    if (!seconds) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

// Search endpoint (searches across songs, albums, artists)
app.get('/api/search', async (req, res, next) => {
    try {
        const { q, type } = req.query; // type: 'song' | 'album' | 'artist' | undefined
        if (!q) {
            return res.json({ songs: [], albums: [], artists: [] });
        }

        const db = (await import('./config/database.js')).default;
        
        // 1. Get Fuzzy Matched IDs
        const { songIds, albumIds, artistIds } = await fuzzySearch(q, type);
        
        let songs = [];
        let albums = [];
        let artists = [];

        // 2. Fetch Full Details for Matched IDs (Maintaining Order)
        
        // Search Songs
        if (songIds.length > 0) {
            const unorderedSongs = await db('songs')
                .leftJoin('albums', 'songs.album_id', 'albums.id')
                .whereIn('songs.id', songIds)
                .select('songs.*', 'albums.title as album_title', 'albums.cover_url as album_cover_url');
            
            // Re-sort based on Fuse score (order of IDs)
            songs = songIds
                .map(id => unorderedSongs.find(s => s.id === id))
                .filter(Boolean);
        }

        // Search Albums
        if (albumIds.length > 0) {
            const unorderedAlbums = await db('albums')
                .whereIn('id', albumIds)
                .select('*');
            
            albums = albumIds
                .map(id => unorderedAlbums.find(a => a.id === id))
                .filter(Boolean);
        }

        // Search Artists
        if (artistIds.length > 0) {
            const unorderedArtists = await db('artists')
                .whereIn('id', artistIds)
                .select('*');
            
            artists = artistIds
                .map(id => unorderedArtists.find(a => a.id === id))
                .filter(Boolean);
        }

        // --- Post-Processing ---

        // Fetch artists for found songs
        const artistsBySong = {};
        if (songs.length > 0) {
            const songArtists = await db('song_artists')
                .join('artists', 'song_artists.artist_id', 'artists.id')
                .whereIn('song_artists.song_id', songs.map(s => s.id))
                .select('song_artists.song_id', 'artists.name');
            
            songArtists.forEach(sa => {
                if (!artistsBySong[sa.song_id]) artistsBySong[sa.song_id] = [];
                artistsBySong[sa.song_id].push(sa.name);
            });
        }

        // Fetch primary artist for albums
        const albumArtists = await Promise.all(albums.map(async (a) => {
            const artist = await db('songs')
                .join('song_artists', 'songs.id', 'song_artists.song_id')
                .join('artists', 'song_artists.artist_id', 'artists.id')
                .where('songs.album_id', a.id)
                .first('artists.name');
            return artist ? artist.name : 'Unknown Artist';
        }));

        res.json({
            songs: songs.map(s => ({
                id: s.id,
                title: s.title,
                artist: artistsBySong[s.id] ? artistsBySong[s.id].join(', ') : 'Unknown',
                album: s.album_title,
                duration: formatDuration(s.duration_seconds),
                coverUrl: s.album_cover_url,
                fileUrl: s.file_path ? `/api/songs/${s.id}/stream` : null,
                genre: (() => { try { return JSON.parse(s.genre); } catch { return [s.genre]; } })(),
                isFavorite: Boolean(s.is_favorite)
            })),
            albums: albums.map((a, idx) => ({
                id: a.id,
                title: a.title,
                artist: albumArtists[idx],
                coverUrl: a.cover_url,
                year: a.year,
                genre: (() => { try { return JSON.parse(a.genre); } catch { return [a.genre]; } })(),
                trackCount: a.track_count
            })),
            artists: artists.map(ar => ({
                id: ar.id,
                name: ar.name,
                avatarUrl: ar.avatar_url,
                followers: ar.followers
            }))
        });
    } catch (err) {
        next(err);
    }
});

// Genres endpoint
app.get('/api/genres', async (req, res, next) => {
    try {
        const db = (await import('./config/database.js')).default;
        const genres = await db('genres').select('*').orderBy('name', 'asc');
        res.json(genres.map(g => ({
            id: g.id,
            name: g.name,
            color: g.color
        })));
    } catch (err) {
        next(err);
    }
});

// Error handling middleware
app.use(errorHandler);

// Start server with DB Migration check
const startServer = async () => {
    try {
        await migrate();

        const server = app.listen(PORT, () => {
            console.log(`🎵 Myousic Backend running on http://localhost:${PORT}`);
            console.log(`📁 Uploads served from: ${config.UPLOAD_DIR}`);
        });

        // Graceful Shutdown
        const shutdown = () => {
            console.log('Received shutdown signal. Closing server...');
            
            // 1. Close all SSE clients explicitly
            closeAllClients();

            // 2. Force close all TCP connections (Node v18.2+)
            if (server.closeAllConnections) {
                server.closeAllConnections();
            }

            // 3. Stop accepting new connections
            server.close(async () => {
                console.log('HTTP server closed.');
                try {
                    const db = (await import('./config/database.js')).default;
                    await db.destroy();
                    console.log('Database connection closed.');
                    process.exit(0);
                } catch (err) {
                    console.error('Error closing database connection:', err);
                    process.exit(1);
                }
            });

            // Force exit if hanging
            setTimeout(() => {
                console.error('Could not close connections in time, forcefully shutting down');
                process.exit(1);
            }, 5000);
        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);

    } catch (error) {
        console.error('Failed to initialize application:', error);
        process.exit(1);
    }
};

startServer();

export default app;
