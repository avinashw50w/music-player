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

            resolve({
                title: tags.title || path.basename(filePath, path.extname(filePath)),
                artist: tags.artist || tags.ARTIST || 'Unknown Artist',
                album: tags.album || tags.ALBUM || 'Unknown Album',
                genre: genres, // Now returns an array
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
 * Generate waveform data for audio visualization
 * Returns an array of amplitude values
 */
export async function generateWaveform(filePath, samples = 100) {
    return new Promise((resolve, reject) => {
        const amplitudes = [];

        ffmpeg(filePath)
            .audioFilters(`aresample=8000,asetnsamples=${samples}`)
            .format('null')
            .on('stderr', (line) => {
                // Parse audio levels from stderr
                const match = line.match(/\[Parsed[^\]]+\]\s*(-?\d+\.?\d*)/);
                if (match) {
                    amplitudes.push(Math.abs(parseFloat(match[1])));
                }
            })
            .on('error', (err) => {
                // If waveform generation fails, return mock data
                console.warn('Waveform generation failed:', err.message);
                resolve(generateMockWaveform(samples));
            })
            .on('end', () => {
                if (amplitudes.length === 0) {
                    resolve(generateMockWaveform(samples));
                } else {
                    // Normalize amplitudes to 0-1 range
                    const max = Math.max(...amplitudes);
                    const normalized = amplitudes.map(a => max > 0 ? a / max : 0);
                    resolve(normalized);
                }
            })
            .output('/dev/null')
            .run();
    });
}

/**
 * Generate mock waveform data for fallback
 */
function generateMockWaveform(samples = 100) {
    const waveform = [];
    for (let i = 0; i < samples; i++) {
        // Create a smooth sine-like pattern with some randomness
        const base = Math.sin(i / samples * Math.PI * 4) * 0.5 + 0.5;
        const random = Math.random() * 0.3;
        waveform.push(Math.min(1, Math.max(0, base + random)));
    }
    return waveform;
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