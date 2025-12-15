
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import { promisify } from 'util';
import fs from 'fs';

/**
 * Extract metadata from an audio file using FFmpeg
 * @param {string} filePath - Path to the file on disk
 * @param {string} [originalFilename] - Original filename (if uploaded) to use for title fallback
 */
export async function extractMetadata(filePath, originalFilename = null) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) {
                reject(err);
                return;
            }

            const format = metadata.format;
            const audioStream = metadata.streams.find(s => s.codec_type === 'audio');

            // Try to get tags from format or stream (format usually has global tags)
            const tags = format.tags || audioStream?.tags || {};

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

            // Determine Title: Use tag, or fallback to original filename if provided, else current filepath
            const filenameForTitle = originalFilename || filePath;
            const fallbackTitle = path.basename(filenameForTitle, path.extname(filenameForTitle));

            // Extract Lyrics (Common keys)
            // Enhanced to look for language specific keys like 'lyrics-eng'
            let lyrics = tags.lyrics || tags.LYRICS || tags.unsyncedlyrics || tags.USLT || null;
            
            if (!lyrics) {
                // Search for any key starting with lyrics- or ending with lyrics
                const keys = Object.keys(tags);
                for (const key of keys) {
                    if (key.toLowerCase().startsWith('lyrics') || key.toLowerCase().endsWith('lyrics')) {
                        lyrics = tags[key];
                        break;
                    }
                }
            }

            resolve({
                title: tags.title || fallbackTitle,
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
                channels: audioStream?.channels,
                lyrics: lyrics
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
 * Update audio file tags (Title, Artist, Album, Year, Genre, Cover Art, Lyrics)
 * This creates a temporary copy and replaces the original.
 * @param {string} filePath - Absolute path to the file
 * @param {Object} metadata - { title, artist, album, year, genre, coverPath, lyrics }
 */
export async function updateAudioTags(filePath, metadata) {
    const tempPath = `${filePath}.tmp${path.extname(filePath)}`;
    
    return new Promise((resolve, reject) => {
        const command = ffmpeg(filePath);
        
        // Base Output Options
        const outputOptions = [
            '-id3v2_version', '3', // Ensure generic ID3 compatibility for MP3
            '-write_id3v1', '1',
            '-c', 'copy' // Copy codec (no re-encoding for audio/video streams unless specified)
        ];

        // Handle Cover Art Embedding
        // Note: For best compatibility, we replace existing art if new art is provided
        if (metadata.coverPath && fs.existsSync(metadata.coverPath)) {
            command.input(metadata.coverPath);
            
            // Map 0:a (Audio from input 0)
            outputOptions.push('-map', '0:a');
            // Map 1 (Image from input 1)
            outputOptions.push('-map', '1');
            
            outputOptions.push('-disposition:v', 'attached_pic');
        } else {
            // Keep original streams (preserves existing art if no new art provided)
            outputOptions.push('-map', '0');
        }

        // Add Text Metadata
        // Note: We avoid manual quoting as spawn handles separate arguments.
        if (metadata.title !== undefined) outputOptions.push('-metadata', `title=${metadata.title}`);
        if (metadata.artist !== undefined) outputOptions.push('-metadata', `artist=${metadata.artist}`);
        if (metadata.album !== undefined) outputOptions.push('-metadata', `album=${metadata.album}`);
        if (metadata.year !== undefined) outputOptions.push('-metadata', `date=${metadata.year}`);
        if (metadata.genre !== undefined) {
            const genreStr = Array.isArray(metadata.genre) ? metadata.genre.join(', ') : (metadata.genre || '');
            outputOptions.push('-metadata', `genre=${genreStr}`);
        }
        // Explicitly check for undefined to allow empty string (clearing lyrics)
        if (metadata.lyrics !== undefined) {
            // Write to multiple common lyric tags to maximize compatibility
            // 'lyrics' is generic, 'unsyncedlyrics' often maps to USLT in ID3v2
            outputOptions.push('-metadata', `lyrics=${metadata.lyrics}`);
            outputOptions.push('-metadata', `unsyncedlyrics=${metadata.lyrics}`);
        }

        command
            .outputOptions(outputOptions)
            .save(tempPath)
            .on('end', async () => {
                try {
                    // Replace original with temp
                    await fs.promises.rename(tempPath, filePath);
                    console.log(`[Metadata] Updated file tags for: ${path.basename(filePath)}`);
                    resolve(true);
                } catch (err) {
                    // Try to clean up temp if rename fails
                    fs.unlink(tempPath, () => {});
                    reject(err);
                }
            })
            .on('error', (err) => {
                // Clean up temp
                fs.unlink(tempPath, () => {});
                console.error(`[Metadata] Failed to update tags for ${path.basename(filePath)}: ${err.message}`);
                reject(err);
            });
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
