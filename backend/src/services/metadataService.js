
import { getFingerprint } from './fingerprint.js';
import { pipeline } from 'stream/promises';
import fs from 'fs';
import path from 'path';
import { config } from '../config/env.js';
import { getArtistDetails, getReleaseGroupDetails } from './musicBrainz.js';

/**
 * Identify song using Audio Fingerprinting and fetch metadata
 * @param {string} filePath - Path to local audio file
 * @returns {Promise<Object>} - Identified metadata
 */
export async function identifySongMetadata(filePath) {
    // 1. Generate Fingerprint
    const { duration, fingerprint } = await getFingerprint(filePath);

    // 2. Query AcoustID
    const params = new URLSearchParams({
        client: config.ACOUSTID_CLIENT_ID,
        meta: 'recordings releases releasegroups compress', 
        duration: duration.toString(),
        fingerprint: fingerprint
    });

    const acoustidResponse = await fetch(`https://api.acoustid.org/v2/lookup?${params.toString()}`);

    if (!acoustidResponse.ok) {
        const errorBody = await acoustidResponse.text();
        throw new Error(`AcoustID API failed (${acoustidResponse.status}): ${errorBody}`);
    }

    const acoustidData = await acoustidResponse.json();
    console.log(acoustidData)
    if (!acoustidData.results || acoustidData.results.length === 0) {
        throw new Error('No matches found for this song.');
    }

    // 3. Find Best Match
    const bestMatch = acoustidData.results.reduce((prev, current) => {
        return (current.score > prev.score) ? current : prev;
    }, acoustidData.results[0]);

    if (!bestMatch.recordings || bestMatch.recordings.length === 0) {
         throw new Error('Match found, but no metadata available.');
    }

    const recording = bestMatch.recordings[0];
    
    // Parse Release Groups and Releases
    let releaseGroup = null;
    let release = null;

    if (recording.releasegroups && recording.releasegroups.length > 0) {
        releaseGroup = recording.releasegroups[0];
        if (releaseGroup.releases && releaseGroup.releases.length > 0) {
            release = releaseGroup.releases[0];
        }
    } else if (recording.releases && recording.releases.length > 0) {
        release = recording.releases[0];
    }

    // 4. Basic Metadata from AcoustID
    const artists = recording.artists ? recording.artists.map(a => ({ name: a.name, id: a.id })) : [];
    const artistDisplay = artists.map(a => a.name).join(', ') || 'Unknown Artist';
    
    const metadata = {
        title: recording.title,
        artist: artistDisplay,
        artists: artists,
        album: releaseGroup ? releaseGroup.title : (release ? release.title : 'Unknown Album'),
        year: (release && release.date && release.date.year) ? parseInt(release.date.year) : null,
        mbid: release ? release.id : null,
        releaseGroupMbid: releaseGroup ? releaseGroup.id : null,
        genre: [] 
    };

    // 5. Enrich with MusicBrainz Data (Genres, Dates, etc.)
    
    // Fetch Artist Genres
    const artistGenres = new Set();
    // Only fetch for the first 2 artists to avoid too many requests
    for (const artist of artists.slice(0, 2)) {
        if (artist.id) {
            try {
                const mbArtist = await getArtistDetails(artist.id);
                if (mbArtist && mbArtist.genres) {
                    mbArtist.genres.forEach(g => artistGenres.add(g));
                }
            } catch (e) {
                console.warn(`Failed to fetch MB details for artist ${artist.name}`);
            }
        }
    }

    // Fetch Album Genres & Date
    if (metadata.releaseGroupMbid) {
        try {
            const mbAlbum = await getReleaseGroupDetails(metadata.releaseGroupMbid);
            if (mbAlbum) {
                if (mbAlbum.genres) mbAlbum.genres.forEach(g => artistGenres.add(g));
                if (mbAlbum.date && !metadata.year) {
                    metadata.year = parseInt(mbAlbum.date.substring(0, 4));
                }
            }
        } catch (e) {
            console.warn(`Failed to fetch MB details for album ${metadata.album}`);
        }
    }

    // Format Genres: Take top 5, capitalize
    metadata.genre = Array.from(artistGenres)
        .slice(0, 5)
        .map(g => g.charAt(0).toUpperCase() + g.slice(1));

    // 6. Fetch Cover Art if we have a release MBID
    if (metadata.mbid) {
        try {
            const coverUrl = `https://coverartarchive.org/release/${metadata.mbid}/front-500`;
            const headRes = await fetch(coverUrl, { method: 'HEAD' });
            
            if (headRes.ok) {
                metadata.coverUrl = coverUrl;
            } else {
                const fallbackUrl = `https://coverartarchive.org/release/${metadata.mbid}/front`;
                const fallbackHead = await fetch(fallbackUrl, { method: 'HEAD' });
                if (fallbackHead.ok) metadata.coverUrl = fallbackUrl;
            }
        } catch (e) {
            // console.warn('Failed to find cover art for release', metadata.mbid);
        }
    }

    return metadata;
}

/**
 * Downloads an image from a URL to the local uploads directory
 */
export async function downloadCoverImage(url, filenamePrefix) {
    if (!url) return null;

    try {
        const response = await fetch(url);
        if (!response.ok) return null;

        const uploadsDir = path.join(config.UPLOAD_DIR, 'covers');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const filename = `${filenamePrefix}-${Date.now()}.jpg`;
        const filepath = path.join(uploadsDir, filename);
        
        // @ts-ignore
        await pipeline(response.body, fs.createWriteStream(filepath));
        
        return `/uploads/covers/${filename}`;
    } catch (e) {
        console.warn('Failed to download cover image:', e);
        return null;
    }
}
