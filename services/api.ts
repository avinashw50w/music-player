const API_BASE_URL = '/api';

// ===== Helper Functions =====

async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || 'Request failed');
    }
    return response.json();
}

// ===== Upload with Progress =====

export interface UploadProgress {
    loaded: number;
    total: number;
    percentage: number;
}

export function uploadAudioFiles(
    files: File[],
    onProgress?: (progress: UploadProgress) => void
): Promise<{ success: boolean; count: number; songs: Song[] }> {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        files.forEach(file => formData.append('files', file));

        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable && onProgress) {
                onProgress({
                    loaded: e.loaded,
                    total: e.total,
                    percentage: Math.round((e.loaded / e.total) * 100)
                });
            }
        });

        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(JSON.parse(xhr.responseText));
            } else {
                reject(new Error('Upload failed'));
            }
        });

        xhr.addEventListener('error', () => reject(new Error('Upload failed')));
        xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

        xhr.open('POST', `${API_BASE_URL}/upload/audio`);
        xhr.send(formData);
    });
}

export function uploadFolder(
    files: File[],
    onProgress?: (progress: UploadProgress) => void
): Promise<{ success: boolean; count: number; songs: Song[] }> {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        files.forEach(file => formData.append('files', file));

        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable && onProgress) {
                onProgress({
                    loaded: e.loaded,
                    total: e.total,
                    percentage: Math.round((e.loaded / e.total) * 100)
                });
            }
        });

        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(JSON.parse(xhr.responseText));
            } else {
                reject(new Error('Upload failed'));
            }
        });

        xhr.addEventListener('error', () => reject(new Error('Upload failed')));
        xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

        xhr.open('POST', `${API_BASE_URL}/upload/folder`);
        xhr.send(formData);
    });
}

// ===== Types =====

import type { Song, Album, Artist, Playlist } from '../types';

// ===== Songs API =====

export async function getSongs(): Promise<Song[]> {
    const response = await fetch(`${API_BASE_URL}/songs`);
    return handleResponse<Song[]>(response);
}

export async function getSong(id: string): Promise<Song> {
    const response = await fetch(`${API_BASE_URL}/songs/${id}`);
    return handleResponse<Song>(response);
}

export async function updateSong(id: string, data: Partial<Song>): Promise<Song> {
    const response = await fetch(`${API_BASE_URL}/songs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return handleResponse<Song>(response);
}

export async function toggleSongFavorite(id: string): Promise<Song> {
    const response = await fetch(`${API_BASE_URL}/songs/${id}/favorite`, {
        method: 'PATCH'
    });
    return handleResponse<Song>(response);
}

export async function updateSongLyrics(id: string, lyrics: string): Promise<Song> {
    const response = await fetch(`${API_BASE_URL}/songs/${id}/lyrics`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lyrics })
    });
    return handleResponse<Song>(response);
}

export async function updateSongCover(id: string, file: File): Promise<Song> {
    const formData = new FormData();
    formData.append('cover', file);

    const response = await fetch(`${API_BASE_URL}/songs/${id}/cover`, {
        method: 'PATCH',
        body: formData
    });
    return handleResponse<Song>(response);
}

export async function deleteSong(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/songs/${id}`, {
        method: 'DELETE'
    });
    await handleResponse(response);
}

// ===== Albums API =====

export async function getAlbums(): Promise<Album[]> {
    const response = await fetch(`${API_BASE_URL}/albums`);
    return handleResponse<Album[]>(response);
}

export async function getAlbum(id: string): Promise<Album & { songs: Song[] }> {
    const response = await fetch(`${API_BASE_URL}/albums/${id}`);
    return handleResponse(response);
}

export async function updateAlbum(id: string, data: Partial<Album>): Promise<Album> {
    const response = await fetch(`${API_BASE_URL}/albums/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return handleResponse<Album>(response);
}

export async function toggleAlbumFavorite(id: string): Promise<Album> {
    const response = await fetch(`${API_BASE_URL}/albums/${id}/favorite`, {
        method: 'PATCH'
    });
    return handleResponse<Album>(response);
}

export async function updateAlbumCover(id: string, file: File): Promise<Album> {
    const formData = new FormData();
    formData.append('cover', file);

    const response = await fetch(`${API_BASE_URL}/albums/${id}/cover`, {
        method: 'PATCH',
        body: formData
    });
    return handleResponse<Album>(response);
}

// ===== Artists API =====

export async function getArtists(): Promise<Artist[]> {
    const response = await fetch(`${API_BASE_URL}/artists`);
    return handleResponse<Artist[]>(response);
}

export async function getArtist(id: string): Promise<Artist & { albums: Album[]; songs: Song[] }> {
    const response = await fetch(`${API_BASE_URL}/artists/${id}`);
    return handleResponse(response);
}

export async function updateArtist(id: string, data: Partial<Artist>): Promise<Artist> {
    const response = await fetch(`${API_BASE_URL}/artists/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return handleResponse<Artist>(response);
}

export async function updateArtistAvatar(id: string, file: File): Promise<Artist> {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await fetch(`${API_BASE_URL}/artists/${id}/avatar`, {
        method: 'PATCH',
        body: formData
    });
    return handleResponse<Artist>(response);
}

// ===== Playlists API =====

export async function getPlaylists(): Promise<(Playlist & { songCount: number })[]> {
    const response = await fetch(`${API_BASE_URL}/playlists`);
    return handleResponse(response);
}

export async function getPlaylist(id: string): Promise<Playlist & { songs: Song[] }> {
    const response = await fetch(`${API_BASE_URL}/playlists/${id}`);
    return handleResponse(response);
}

export async function createPlaylist(name: string): Promise<Playlist> {
    const response = await fetch(`${API_BASE_URL}/playlists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
    });
    return handleResponse<Playlist>(response);
}

export async function renamePlaylist(id: string, name: string): Promise<Playlist> {
    const response = await fetch(`${API_BASE_URL}/playlists/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
    });
    return handleResponse<Playlist>(response);
}

export async function deletePlaylist(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/playlists/${id}`, {
        method: 'DELETE'
    });
    await handleResponse(response);
}

export async function addSongToPlaylist(playlistId: string, songId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/playlists/${playlistId}/songs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId })
    });
    await handleResponse(response);
}

export async function removeSongFromPlaylist(playlistId: string, songId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/playlists/${playlistId}/songs/${songId}`, {
        method: 'DELETE'
    });
    await handleResponse(response);
}

export async function reorderPlaylistSongs(playlistId: string, songIds: string[]): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/playlists/${playlistId}/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songIds })
    });
    await handleResponse(response);
}

// ===== Search API =====

export interface SearchResults {
    songs: Song[];
    albums: Album[];
    artists: Artist[];
}

export async function search(query: string): Promise<SearchResults> {
    const response = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}`);
    return handleResponse<SearchResults>(response);
}

// ===== Genres API =====

export interface Genre {
    id: string;
    name: string;
    color: string;
}

export async function getGenres(): Promise<Genre[]> {
    const response = await fetch(`${API_BASE_URL}/genres`);
    return handleResponse<Genre[]>(response);
}