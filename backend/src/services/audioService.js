
import path from 'path';
import { promisify } from 'util';
import fs from 'fs';
import { execFile, spawn } from 'child_process';

const execFileAsync = promisify(execFile);

/**
 * Execute ffprobe to get JSON metadata
 * @param {string} filePath 
 */
async function probeFile(filePath) {
    return new Promise((resolve, reject) => {
        const ffprobe = spawn('ffprobe', [
            '-v', 'quiet',
            '-print_format', 'json',
            '-show_format',
            '-show_streams',
            filePath
        ]);

        let stdout = '';
        let stderr = '';

        ffprobe.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        ffprobe.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        ffprobe.on('close', (code) => {
            if (code === 0) {
                try {
                    resolve(JSON.parse(stdout));
                } catch (e) {
                    reject(new Error('Failed to parse ffprobe output: ' + e.message));
                }
            } else {
                reject(new Error(`ffprobe exited with code ${code}: ${stderr}`));
            }
        });

        ffprobe.on('error', (err) => {
            reject(err);
        });
    });
}

/**
 * Extract raw lyrics using specific ffprobe command that preserves newlines
 * @param {string} filePath 
 */
async function extractLyricsRaw(filePath) {
    try {
        // Try 'lyrics' tag (Standard)
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
        return null;
    }
}

/**
 * Extract metadata from an audio file using system FFmpeg
 * @param {string} filePath - Path to the file on disk
 * @param {string} [originalFilename] - Original filename (if uploaded) to use for title fallback
 */
export async function extractMetadata(filePath, originalFilename = null) {
    // Run probe and raw lyrics extraction in parallel
    const [probeData, rawLyrics] = await Promise.all([
        probeFile(filePath),
        extractLyricsRaw(filePath)
    ]);

    const format = probeData.format || {};
    const audioStream = (probeData.streams || []).find(s => s.codec_type === 'audio') || {};

    // Merge tags for general metadata
    const mergedTags = { ...(format.tags || {}), ...(audioStream.tags || {}) };

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
    let lyrics = rawLyrics;

    if (!lyrics) {
        let maxLen = 0;
        const tagSources = [format.tags, audioStream.tags].filter(t => t);
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
        format: audioStream.codec_name?.toUpperCase() || path.extname(filePath).slice(1).toUpperCase(),
        sampleRate: audioStream.sample_rate,
        channels: audioStream.channels,
        lyrics: lyrics
    };
}

/**
 * Extract embedded cover art from audio file using system FFmpeg
 */
export async function extractCoverArt(audioPath, outputPath) {
    return new Promise((resolve, reject) => {
        // ffmpeg -i input -an -vcodec copy output -y
        const args = [
            '-i', audioPath,
            '-an',
            '-vcodec', 'copy',
            '-y',
            outputPath
        ];

        const ffmpeg = spawn('ffmpeg', args);

        ffmpeg.on('close', (code) => {
            if (code === 0 && fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
                resolve(outputPath);
            } else {
                // No cover art embedded or error
                resolve(null);
            }
        });

        ffmpeg.on('error', () => {
            resolve(null);
        });
    });
}

/**
 * Update audio file tags using system FFmpeg
 * This creates a temporary copy and replaces the original.
 * @param {string} filePath - Absolute path to the source file
 * @param {Object} metadata - { title, artist, album, year, genre, coverPath, lyrics }
 * @param {string} [newFilePath] - Optional new path to rename the file to (e.g. "Artist - Title.mp3")
 */
export async function updateAudioTags(filePath, metadata, newFilePath = null) {
    // Ensure file exists or try to resolve it
    let resolvedPath = filePath;
    if (!fs.existsSync(resolvedPath)) {
        resolvedPath = path.resolve(filePath);
        if (!fs.existsSync(resolvedPath)) {
             throw new Error(`Input file not found: ${filePath}`);
        }
    }

    const targetPath = newFilePath || resolvedPath;
    // We write to a temp file in the same directory as the target to ensure atomic rename is possible
    const tempPath = `${targetPath}.tmp${path.extname(targetPath)}`;
    
    return new Promise((resolve, reject) => {
        const args = [];

        // 1. INPUTS
        // Main Audio File
        args.push('-i', resolvedPath);

        // Cover Art File (if exists)
        let hasCover = false;
        if (metadata.coverPath && fs.existsSync(metadata.coverPath)) {
            hasCover = true;
            args.push('-i', metadata.coverPath);
        }

        // 2. MAPPING
        if (hasCover) {
            args.push('-map', '0:a'); // Use audio from input 0
            args.push('-map', '1:0'); // Use video/image from input 1
        } else {
            args.push('-map', '0'); // Use all streams from input 0
        }

        // 3. CODEC & FORMAT OPTIONS
        args.push('-c', 'copy'); // Copy streams (don't re-encode audio)
        args.push('-id3v2_version', '3'); // ID3v2.3 for best compatibility
        args.push('-write_id3v1', '1');

        // 4. METADATA
        // Helper to add metadata args
        const addMeta = (key, value) => {
            if (value !== undefined && value !== null) {
                const strVal = String(value);
                args.push('-metadata', `${key}=${strVal}`);
            }
        };

        addMeta('title', metadata.title);
        addMeta('artist', metadata.artist);
        addMeta('album', metadata.album);
        addMeta('date', metadata.year);
        
        if (metadata.genre) {
            const genreStr = Array.isArray(metadata.genre) ? metadata.genre.join(', ') : metadata.genre;
            addMeta('genre', genreStr);
        }

        if (metadata.lyrics !== undefined) {
            const safeLyrics = metadata.lyrics ? metadata.lyrics.replace(/\r\n/g, '\n').replace(/\r/g, '\n') : '';
            const ext = path.extname(resolvedPath).toLowerCase();
            
            if (ext === '.mp3' || ext === '.id3') {
                addMeta('unsyncedlyrics', safeLyrics);
                // Clear standard lyrics tag to avoid duplicates/conflicts
                args.push('-metadata', 'lyrics=');
            } else {
                addMeta('lyrics', safeLyrics);
            }
        }

        // Cover Art Specific Metadata
        if (hasCover) {
            args.push('-metadata:s:v', 'title=Album cover');
            args.push('-metadata:s:v', 'comment=Cover (front)');
            args.push('-disposition:v', 'attached_pic');
        }

        // 5. OUTPUT
        args.push('-y', tempPath);

        const ffmpeg = spawn('ffmpeg', args);

        let stderr = '';
        ffmpeg.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        ffmpeg.on('close', async (code) => {
            if (code === 0) {
                try {
                    // 1. Move temp file to target path
                    await fs.promises.rename(tempPath, targetPath);
                    
                    // 2. If we renamed the file (target != source), delete the old source
                    if (targetPath !== resolvedPath) {
                        try {
                            await fs.promises.unlink(resolvedPath);
                        } catch (e) {
                            console.warn(`[Metadata] Failed to delete old file ${path.basename(resolvedPath)}: ${e.message}`);
                        }
                    }

                    console.log(`[Metadata] Updated file tags for: ${path.basename(targetPath)}`);
                    resolve(true);
                } catch (err) {
                    fs.unlink(tempPath, () => {});
                    reject(err);
                }
            } else {
                fs.unlink(tempPath, () => {});
                console.error(`[Metadata] FFmpeg Error for ${path.basename(resolvedPath)}:`, stderr);
                reject(new Error(`ffmpeg exited with code ${code}`));
            }
        });

        ffmpeg.on('error', (err) => {
            fs.unlink(tempPath, () => {});
            console.error(`[Metadata] Failed to spawn ffmpeg:`, err);
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
