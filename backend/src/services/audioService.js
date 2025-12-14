
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import { promisify } from 'util';

/**
 * Extract metadata from an audio file using FFmpeg
 */
export async function extractMetadata(filePath) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) {
                reject(err);
                return;
            }

            const format = metadata.format;
            const audioStream = metadata.streams.find(s => s.codec_type === 'audio');

            // Try to get tags from format or stream
            const tags = format.tags || {};

            const durationSeconds = Math.floor(format.duration || 0);
            const minutes = Math.floor(durationSeconds / 60);
            const seconds = durationSeconds % 60;
            const duration = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

            // Handle Multiple Genres
            let genres = [];
            const rawGenre = tags.genre || tags.GENRE || 'Unknown';
            if (rawGenre) {
                // Split by common delimiters (semicolon, comma, slash) and trim
                genres = rawGenre.split(/[;,/]/).map(g => g.trim()).filter(Boolean);
            }
            if (genres.length === 0) genres = ['Unknown'];

            // Handle Multiple Artists (simple split)
            const rawArtist = tags.artist || tags.ARTIST || 'Unknown Artist';
            const artistNames = rawArtist.split(/[;,/]/).map(a => a.trim()).filter(Boolean);
            if (artistNames.length === 0) artistNames.push('Unknown Artist');

            resolve({
                title: tags.title || path.basename(filePath, path.extname(filePath)),
                artist: artistNames.join(', '), // Display string
                artists: artistNames, // Array of names for logic
                album: tags.album || tags.ALBUM || 'Unknown Album',
                genre: genres, 
                year: tags.date ? parseInt(tags.date.substring(0, 4)) : null,
                duration,
                durationSeconds,
                bitrate: Math.floor((format.bit_rate || 0) / 1000), // Convert to kbps
                format: audioStream?.codec_name?.toUpperCase() || path.extname(filePath).slice(1).toUpperCase(),
                sampleRate: audioStream?.sample_rate,
                channels: audioStream?.channels
            });
        });
    });
}

/**
 * Extract embedded cover art from audio file
 */
export async function extractCoverArt(audioPath, outputPath) {
    return new Promise((resolve, reject) => {
        ffmpeg(audioPath)
            .outputOptions(['-an', '-vcodec', 'copy'])
            .output(outputPath)
            .on('error', (err) => {
                // No cover art embedded, return null
                resolve(null);
            })
            .on('end', () => {
                resolve(outputPath);
            })
            .run();
    });
}

/**
 * Format duration seconds to MM:SS string
 */
export function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
