import db from './database.js';

async function migrate() {
    console.log('Running migrations...');

    // Artists table
    await db.schema.createTableIfNotExists('artists', (table) => {
        table.string('id').primary();
        table.string('name').notNullable();
        table.string('avatar_url');
        table.string('followers').defaultTo('0');
        table.boolean('is_favorite').defaultTo(false);
        table.timestamp('created_at').defaultTo(db.fn.now());
    });

    // Albums table
    await db.schema.createTableIfNotExists('albums', (table) => {
        table.string('id').primary();
        table.string('title').notNullable();
        table.string('artist_id').references('id').inTable('artists');
        table.string('artist_name').notNullable();
        table.string('cover_url');
        table.integer('year');
        table.string('genre');
        table.integer('track_count').defaultTo(0);
        table.boolean('is_favorite').defaultTo(false);
        table.timestamp('created_at').defaultTo(db.fn.now());
    });

    // Songs table
    await db.schema.createTableIfNotExists('songs', (table) => {
        table.string('id').primary();
        table.string('title').notNullable();
        table.string('artist_id').references('id').inTable('artists');
        table.string('artist_name').notNullable();
        table.string('album_id').references('id').inTable('albums');
        table.string('album_name');
        table.string('duration');
        table.integer('duration_seconds');
        table.string('cover_url');
        table.string('file_path');
        table.string('genre');
        table.boolean('is_favorite').defaultTo(false);
        table.text('lyrics');
        table.integer('bitrate');
        table.string('format');
        table.text('waveform_data');
        table.timestamp('created_at').defaultTo(db.fn.now());
    });

    // Playlists table
    await db.schema.createTableIfNotExists('playlists', (table) => {
        table.string('id').primary();
        table.string('name').notNullable();
        table.string('cover_url');
        table.boolean('is_favorite').defaultTo(false);
        table.timestamp('created_at').defaultTo(db.fn.now());
    });

    // Playlist Songs junction table
    await db.schema.createTableIfNotExists('playlist_songs', (table) => {
        table.increments('id').primary();
        table.string('playlist_id').references('id').inTable('playlists').onDelete('CASCADE');
        table.string('song_id').references('id').inTable('songs').onDelete('CASCADE');
        table.integer('position').notNullable();
        table.unique(['playlist_id', 'song_id']);
    });

    // Genres table
    await db.schema.createTableIfNotExists('genres', (table) => {
        table.string('id').primary();
        table.string('name').notNullable();
        table.string('color');
    });

    // Insert default genres
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

    console.log('Migrations complete!');
    process.exit(0);
}

migrate().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});