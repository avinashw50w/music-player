
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import { promisify } from 'util';
import fs from 'fs';
import { execFile } from 'child_process';

const execFileAsync = promisify(execFile);

/**
 * Extract raw lyrics using specific ffprobe command that preserves newlines
 * @param {string} filePath 
 */
async function extractLyricsRaw(filePath) {
    try {
        // Try 'lyrics' tag (Standard)
        // Command verified by user: ffprobe -v quiet -show_entries format_tags=lyrics -of default=nw=1:nk=1 file.mp3
        let { stdout } = await execFileAsync('ffprobe', [
            '-v', 'quiet',
            '-show_entries', 'format_tags=lyrics',
            '-of', 'default=nw=1:nk=1',
            filePath
        ]);

        if (stdout && stdout.trim().length > 0) {
            return stdout.trim();
        }

        // Try 'unsyncedlyrics' (Common for ID3v2 USLT frames in ffmpeg)
        ({ stdout } = await execFileAsync('ffprobe', [
            '-v', 'quiet',
            '-show_entries', 'format_tags=unsyncedlyrics',
            '-of', 'default=nw=1:nk=1',
            filePath
        ]));

        if (stdout && stdout.trim().length > 0) {
            return stdout.trim();
        }

        return null;
    } catch (e) {
        // console.error(`Raw lyrics extraction failed for ${filePath}:`, e.message);
        return null;
    }
}

/**
 * Extract metadata from an audio file using FFmpeg
 * @param {string} filePath - Path to the file on disk
 * @param {string} [originalFilename] - Original filename (if uploaded) to use for title fallback
 */
export async function extractMetadata(filePath, originalFilename = null) {
    // Run probe and raw lyrics extraction in parallel
    const [probeMetadata, rawLyrics] = await Promise.all([
        new Promise((resolve, reject) => {
            ffmpeg.ffprobe(filePath, (err, metadata) => {
                if (err) reject(err);
                else resolve(metadata);
            });
        }),
        extractLyricsRaw(filePath)
    ]);

    const format = probeMetadata.format;
    const audioStream = probeMetadata.streams.find(s => s.codec_type === 'audio');

    // Merge tags for general metadata
    const mergedTags = { ...(format.tags || {}), ...(audioStream?.tags || {}) };

    const durationSeconds = Math.floor(format.duration || 0);
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = durationSeconds % 60;
    const duration = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    // Handle Multiple Genres
    let genres = [];
    const rawGenre = mergedTags.genre || mergedTags.GENRE || 'Unknown';
    if (rawGenre) {
        genres = rawGenre.split(/[;,/]/).map(g => g.trim()).filter(Boolean);
    }
    if (genres.length === 0) genres = ['Unknown'];

    // Handle Multiple Artists
    const rawArtist = mergedTags.artist || mergedTags.ARTIST || 'Unknown Artist';
    const artistNames = rawArtist.split(/[;,/]/).map(a => a.trim()).filter(Boolean);
    if (artistNames.length === 0) artistNames.push('Unknown Artist');

    // Determine Title
    const filenameForTitle = originalFilename || filePath;
    const fallbackTitle = path.basename(filenameForTitle, path.extname(filenameForTitle));

    // Determine Lyrics
    // Prefer raw extraction if successful (preserves newlines better)
    // Fallback to probe tags if raw failed but probe has something (though likely truncated)
    let lyrics = rawLyrics;

    if (!lyrics) {
        let maxLen = 0;
        const tagSources = [format.tags, audioStream?.tags].filter(t => t);
        tagSources.forEach(source => {
            Object.keys(source).forEach(key => {
                if (key.match(/(lyrics|uslt|unsyncedlyrics)/i)) {
                    const val = source[key];
                    if (typeof val === 'string' && val.length > maxLen) {
                        maxLen = val.length;
                        lyrics = val;
                    }
                }
            });
        });
    }

    return {
        title: mergedTags.title || fallbackTitle,
        artist: artistNames.join(', '),
        artists: artistNames,
        album: mergedTags.album || mergedTags.ALBUM || 'Unknown Album',
        genre: genres, 
        year: mergedTags.date ? parseInt(mergedTags.date.substring(0, 4)) : null,
        duration,
        durationSeconds,
        bitrate: Math.floor((format.bit_rate || 0) / 1000),
        format: audioStream?.codec_name?.toUpperCase() || path.extname(filePath).slice(1).toUpperCase(),
        sampleRate: audioStream?.sample_rate,
        channels: audioStream?.channels,
        lyrics: lyrics
    };
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
        if (metadata.coverPath && fs.existsSync(metadata.coverPath)) {
            command.input(metadata.coverPath);
            outputOptions.push('-map', '0:a');
            outputOptions.push('-map', '1');
            outputOptions.push('-disposition:v', 'attached_pic');
        } else {
            outputOptions.push('-map', '0');
        }

        // Add Text Metadata
        if (metadata.title !== undefined) outputOptions.push('-metadata', `title=${metadata.title}`);
        if (metadata.artist !== undefined) outputOptions.push('-metadata', `artist=${metadata.artist}`);
        if (metadata.album !== undefined) outputOptions.push('-metadata', `album=${metadata.album}`);
        if (metadata.year !== undefined) outputOptions.push('-metadata', `date=${metadata.year}`);
        if (metadata.genre !== undefined) {
            const genreStr = Array.isArray(metadata.genre) ? metadata.genre.join(', ') : (metadata.genre || '');
            outputOptions.push('-metadata', `genre=${genreStr}`);
        }
        
        if (metadata.lyrics !== undefined) {
            const safeLyrics = metadata.lyrics ? metadata.lyrics.replace(/\r\n/g, '\n').replace(/\r/g, '\n') : '';
            const ext = path.extname(filePath).toLowerCase();

            if (ext === '.mp3' || ext === '.id3') {
                outputOptions.push('-metadata', `unsyncedlyrics=${safeLyrics}`);
                outputOptions.push('-metadata', 'lyrics=');
            } else {
                outputOptions.push('-metadata', `lyrics=${safeLyrics}`);
            }
        }

        command
            .outputOptions(outputOptions)
            .save(tempPath)
            .on('end', async () => {
                try {
                    await fs.promises.rename(tempPath, filePath);
                    console.log(`[Metadata] Updated file tags for: ${path.basename(filePath)}`);
                    resolve(true);
                } catch (err) {
                    fs.unlink(tempPath, () => {});
                    reject(err);
                }
            })
            .on('error', (err) => {
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
