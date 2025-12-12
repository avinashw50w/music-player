import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Routes
import songsRouter from './routes/songs.js';
import albumsRouter from './routes/albums.js';
import artistsRouter from './routes/artists.js';
import playlistsRouter from './routes/playlists.js';
import uploadRouter from './routes/upload.js';

// Middleware
import { errorHandler } from './middleware/errorHandler.js';

// Config
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

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
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api/songs', songsRouter);
app.use('/api/albums', albumsRouter);
app.use('/api/artists', artistsRouter);
app.use('/api/playlists', playlistsRouter);
app.use('/api/upload', uploadRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Search endpoint (searches across songs, albums, artists)
app.get('/api/search', async (req, res, next) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.json({ songs: [], albums: [], artists: [] });
        }

        const db = (await import('./config/database.js')).default;
        const searchTerm = `%${q}%`;

        const songs = await db('songs')
            .where('title', 'like', searchTerm)
            .orWhere('artist_name', 'like', searchTerm)
            .orWhere('album_name', 'like', searchTerm)
            .orWhere('genre', 'like', searchTerm)
            .limit(20)
            .select('*');

        const albums = await db('albums')
            .where('title', 'like', searchTerm)
            .orWhere('artist_name', 'like', searchTerm)
            .limit(10)
            .select('*');

        const artists = await db('artists')
            .where('name', 'like', searchTerm)
            .limit(10)
            .select('*');

        res.json({
            songs: songs.map(s => ({
                id: s.id,
                title: s.title,
                artist: s.artist_name,
                album: s.album_name,
                duration: s.duration,
                coverUrl: s.cover_url,
                genre: s.genre,
                isFavorite: Boolean(s.is_favorite)
            })),
            albums: albums.map(a => ({
                id: a.id,
                title: a.title,
                artist: a.artist_name,
                coverUrl: a.cover_url,
                year: a.year,
                genre: a.genre
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

// Start server
app.listen(PORT, () => {
    console.log(`🎵 Myousic Backend running on http://localhost:${PORT}`);
    console.log(`📁 Uploads served from: ${path.join(__dirname, '../uploads')}`);
});

export default app;
