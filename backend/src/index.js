
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
        const searchTerm = `%${q}%`;
        
        let songs = [];
        let albums = [];
        let artists = [];

        // Search Songs
        if (!type || type === 'song') {
            songs = await db('songs')
                .leftJoin('albums', 'songs.album_id', 'albums.id')
                .where('songs.title', 'like', searchTerm)
                .orWhereIn('songs.id', function() {
                    this.select('song_id').from('song_artists')
                        .join('artists', 'song_artists.artist_id', 'artists.id')
                        .where('artists.name', 'like', searchTerm);
                })
                .orWhere('albums.title', 'like', searchTerm)
                .limit(20)
                .select('songs.*', 'albums.title as album_title', 'albums.cover_url as album_cover_url');
        }

        // Search Albums
        if (!type || type === 'album') {
            albums = await db('albums')
                .where(function() {
                    this.where('title', 'like', searchTerm);
                })
                .limit(10)
                .select('*');
        }

        // Search Artists
        if (!type || type === 'artist') {
            artists = await db('artists')
                .where('name', 'like', searchTerm)
                .limit(10)
                .select('*');
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
                // Removed lyrics to optimize payload
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
        const genres = await db('genres').select('*');
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
