import { Song, Album, Artist, Playlist } from '../types';

const API_BASE_URL = '/api';

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  songs?: Song[];
  count?: number;
}

export interface ScanStatus {
    isScanning: boolean;
    progress: number;
    currentFile: string;
    totalFound: number;
    processed: number;
    error?: string;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Request failed with status ${response.status}`);
  }
  return response.json();
}

// Songs
export async function getSongs(): Promise<Song[]> {
  const response = await fetch(`${API_BASE_URL}/songs`);
  return handleResponse<Song[]>(response);
}

export async function toggleSongFavorite(id: string): Promise<Song> {
  const response = await fetch(`${API_BASE_URL}/songs/${id}/favorite`, { method: 'PATCH' });
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


// Albums
export async function getAlbums(): Promise<Album[]> {
  const response = await fetch(`${API_BASE_URL}/albums`);
  return handleResponse<Album[]>(response);
}

export async function toggleAlbumFavorite(id: string): Promise<Album> {
  const response = await fetch(`${API_BASE_URL}/albums/${id}/favorite`, { method: 'PATCH' });
  return handleResponse<Album>(response);
}

export async function updateAlbum(id: string, data: Partial<Album>): Promise<Album> {
    const response = await fetch(`${API_BASE_URL}/albums/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
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

// Artists
export async function getArtists(): Promise<Artist[]> {
  const response = await fetch(`${API_BASE_URL}/artists`);
  return handleResponse<Artist[]>(response);
}

export async function toggleArtistFavorite(id: string): Promise<Artist> {
  const response = await fetch(`${API_BASE_URL}/artists/${id}/favorite`, { method: 'PATCH' });
  return handleResponse<Artist>(response);
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

// Playlists
export async function getPlaylists(): Promise<Playlist[]> {
  const response = await fetch(`${API_BASE_URL}/playlists`);
  return handleResponse<Playlist[]>(response);
}

export async function createPlaylist(name: string): Promise<Playlist> {
    const response = await fetch(`${API_BASE_URL}/playlists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
    });
    return handleResponse<Playlist>(response);
}

export async function togglePlaylistFavorite(id: string): Promise<Playlist> {
  const response = await fetch(`${API_BASE_URL}/playlists/${id}/favorite`, { method: 'PATCH' });
  return handleResponse<Playlist>(response);
}

export async function addSongToPlaylist(playlistId: string, songId: string): Promise<void> {
    await fetch(`${API_BASE_URL}/playlists/${playlistId}/songs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId })
    });
}

export async function removeSongFromPlaylist(playlistId: string, songId: string): Promise<void> {
    await fetch(`${API_BASE_URL}/playlists/${playlistId}/songs/${songId}`, {
        method: 'DELETE'
    });
}

export async function deletePlaylist(id: string): Promise<void> {
    await fetch(`${API_BASE_URL}/playlists/${id}`, { method: 'DELETE' });
}

export async function renamePlaylist(id: string, name: string): Promise<Playlist> {
    const response = await fetch(`${API_BASE_URL}/playlists/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
    });
    return handleResponse<Playlist>(response);
}

export async function reorderPlaylistSongs(playlistId: string, songIds: string[]): Promise<void> {
    await fetch(`${API_BASE_URL}/playlists/${playlistId}/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songIds })
    });
}

// Library Management
export async function scanLibrary(path: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/library/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
    });
    return handleResponse(response);
}

export async function getLibraryStatus(): Promise<ScanStatus> {
    const response = await fetch(`${API_BASE_URL}/library/status`);
    return handleResponse<ScanStatus>(response);
}

export async function refreshLibrary(): Promise<{ success: boolean; removedCount: number; message: string }> {
    const response = await fetch(`${API_BASE_URL}/library/refresh`, {
        method: 'POST'
    });
    return handleResponse(response);
}