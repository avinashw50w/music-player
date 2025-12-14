
import db from './database.js';
import { fileURLToPath } from 'url';
import process from 'process';

export async function migrate() {
    console.log('Running migrations...');

    // Artists table
    if (!(await db.schema.hasTable('artists'))) {
        await db.schema.createTable('artists', (table) => {
            table.string('id').primary();
            table.string('name').notNullable();
            table.string('avatar_url');
            table.string('followers').defaultTo('0');
            table.boolean('is_favorite').defaultTo(false);
            table.timestamp('created_at').defaultTo(db.fn.now());
        });
    }

    // Albums table
    if (!(await db.schema.hasTable('albums'))) {
        await db.schema.createTable('albums', (table) => {
            table.string('id').primary();
            table.string('title').notNullable();
            // Removed artist_id and artist_name as they are derived
            table.string('cover_url');
            table.integer('year');
            table.string('genre');
            table.integer('track_count').defaultTo(0);
            table.boolean('is_favorite').defaultTo(false);
            table.timestamp('created_at').defaultTo(db.fn.now());
        });
    }

    // Songs table
    if (!(await db.schema.hasTable('songs'))) {
        await db.schema.createTable('songs', (table) => {
            table.string('id').primary();
            table.string('title').notNullable();
            // Removed redundant columns: artist_id, artist_name, album_name, duration, cover_url
            table.string('album_id').references('id').inTable('albums');
            table.integer('duration_seconds');
            table.string('file_path');
            table.string('genre');
            table.boolean('is_favorite').defaultTo(false);
            table.text('lyrics');
            table.integer('bitrate');
            table.string('format');
            table.timestamp('created_at').defaultTo(db.fn.now());
        });
    } 

    // Playlists table
    if (!(await db.schema.hasTable('playlists'))) {
        await db.schema.createTable('playlists', (table) => {
            table.string('id').primary();
            table.string('name').notNullable();
            table.string('cover_url');
            table.boolean('is_favorite').defaultTo(false);
            table.timestamp('created_at').defaultTo(db.fn.now());
        });
    }

    // Ensure is_favorite column exists in playlists
    if (await db.schema.hasTable('playlists')) {
        const hasPlaylistFavorite = await db.schema.hasColumn('playlists', 'is_favorite');
        if (!hasPlaylistFavorite) {
            await db.schema.alterTable('playlists', (table) => {
                table.boolean('is_favorite').defaultTo(false);
            });
        }
    }

    // Playlist Songs junction table
    if (!(await db.schema.hasTable('playlist_songs'))) {
        await db.schema.createTable('playlist_songs', (table) => {
            table.increments('id').primary();
            table.string('playlist_id').references('id').inTable('playlists').onDelete('CASCADE');
            table.string('song_id').references('id').inTable('songs').onDelete('CASCADE');
            table.integer('position').notNullable();
            table.unique(['playlist_id', 'song_id']);
        });
    }

    // Song Artists junction table
    if (!(await db.schema.hasTable('song_artists'))) {
        await db.schema.createTable('song_artists', (table) => {
            table.increments('id').primary();
            table.string('song_id').references('id').inTable('songs').onDelete('CASCADE');
            table.string('artist_id').references('id').inTable('artists').onDelete('CASCADE');
            table.boolean('is_primary').defaultTo(false); // Added is_primary
            table.unique(['song_id', 'artist_id']);
        });
        console.log('Created song_artists table');
    } else {
        if (!(await db.schema.hasColumn('song_artists', 'is_primary'))) {
            await db.schema.alterTable('song_artists', table => table.boolean('is_primary').defaultTo(false));
            console.log('Added is_primary to song_artists');
        }
    }

    // Genres table
    if (!(await db.schema.hasTable('genres'))) {
        await db.schema.createTable('genres', (table) => {
            table.string('id').primary();
            table.string('name').notNullable();
            table.string('color');
        });
    }

    // Insert default genres
    if (await db.schema.hasTable('genres')) {
        const genresExist = await db('genres').first();
        if (!genresExist) {
            await db('genres').insert([
                { id: 'pop', name: 'Pop', color: 'bg-purple-600' },
                { id: 'rock', name: 'Rock', color: 'bg-red-600' },
                { id: 'jazz', name: 'Jazz', color: 'bg-blue-600' },
                { id: 'hiphop', name: 'Hip Hop', color: 'bg-orange-600' },
                { id: 'classical', name: 'Classical', color: 'bg-slate-600' },
                { id: 'electronic', name: 'Electronic', color: 'bg-emerald-600' },
                { id: 'rnb', name: 'R&B', color: 'bg-pink-600' },
                { id: 'indie', name: 'Indie', color: 'bg-teal-600' }
            ]);
        }
    }

    console.log('Migrations complete!');
}

// Run if executed directly via node (e.g., npm run migrate)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    migrate()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error('Migration failed:', err);
            process.exit(1);
        });
}
