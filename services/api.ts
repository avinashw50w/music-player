/// <reference types="vite/client" />

import { Song, Album, Artist, Playlist } from '../types';

const API_HOST = import.meta.env.VITE_API_URL || 'http://localhost:3010';
const API_BASE_URL = `${API_HOST}/api`;

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

export interface Genre {
    id: string;
    name: string;
    color: string;
}

// Helper to resolve relative URLs to absolute backend URLs
const resolveUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')) return url;
    if (url.startsWith('/')) return `${API_HOST}${url}`;
    return `${API_HOST}/${url}`;
};

// Data Transformers
const transformSong = (s: Song): Song => ({
    ...s,
    coverUrl: resolveUrl(s.coverUrl),
    fileUrl: resolveUrl(s.fileUrl)
});

const transformAlbum = (a: Album): Album => ({
    ...a,
    coverUrl: resolveUrl(a.coverUrl)
});

const transformArtist = (a: Artist): Artist => ({
    ...a,
    avatarUrl: resolveUrl(a.avatarUrl)
});

const transformPlaylist = (p: Playlist): Playlist => ({
    ...p,
    coverUrl: p.coverUrl ? resolveUrl(p.coverUrl) : undefined
});

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Request failed with status ${response.status}`);
  }
  return response.json();
}

// Search
export interface SearchResults {
    songs: Song[];
    albums: Album[];
    artists: Artist[];
}

export async function search(query: string, options?: { type?: 'song' | 'album' | 'artist', signal?: AbortSignal }): Promise<SearchResults> {
    const params = new URLSearchParams({ q: query });
    if (options?.type) params.append('type', options.type);
    
    const response = await fetch(`${API_BASE_URL}/search?${params.toString()}`, { signal: options?.signal });
    const data = await handleResponse<SearchResults>(response);
    
    return {
        songs: data.songs.map(transformSong),
        albums: data.albums.map(transformAlbum),
        artists: data.artists.map(transformArtist)
    };
}

// Genres
export async function getGenres(): Promise<Genre[]> {
    const response = await fetch(`${API_BASE_URL}/genres`);
    return handleResponse<Genre[]>(response);
}

// Songs
export async function getSongs(limit?: number, offset?: number, search?: string, signal?: AbortSignal, favorites?: boolean): Promise<Song[]> {
  const params = new URLSearchParams();
  if (limit !== undefined) params.append('limit', limit.toString());
  if (offset !== undefined) params.append('offset', offset.toString());
  if (search) params.append('search', search);
  if (favorites) params.append('favorites', 'true');
  
  const response = await fetch(`${API_BASE_URL}/songs?${params.toString()}`, { signal });
  const data = await handleResponse<Song[]>(response);
  return data.map(transformSong);
}

export async function getSong(id: string): Promise<Song> {
    const response = await fetch(`${API_BASE_URL}/songs/${id}`);
    const data = await handleResponse<Song>(response);
    return transformSong(data);
}

export async function toggleSongFavorite(id: string): Promise<Song> {
  const response = await fetch(`${API_BASE_URL}/songs/${id}/favorite`, { method: 'PATCH' });
  const data = await handleResponse<Song>(response);
  return transformSong(data);
}

export async function updateSong(id: string, data: Partial<Song> & { year?: number; remoteCoverUrl?: string }): Promise<Song> {
    const response = await fetch(`${API_BASE_URL}/songs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    const result = await handleResponse<Song>(response);
    return transformSong(result);
}

export async function updateSongLyrics(id: string, lyrics: string): Promise<Song> {
    const response = await fetch(`${API_BASE_URL}/songs/${id}/lyrics`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lyrics })
    });
    const result = await handleResponse<Song>(response);
    return transformSong(result);
}

export async function fetchSyncedLyrics(id: string): Promise<Song> {
    const response = await fetch(`${API_BASE_URL}/songs/${id}/lyrics/fetch`, {
        method: 'POST'
    });
    const result = await handleResponse<Song>(response);
    return transformSong(result);
}

export async function updateSongCover(id: string, file: File): Promise<Song> {
    const formData = new FormData();
    formData.append('cover', file);
    const response = await fetch(`${API_BASE_URL}/songs/${id}/cover`, {
        method: 'PATCH',
        body: formData
    });
    const result = await handleResponse<Song>(response);
    return transformSong(result);
}

export async function identifySong(id: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/songs/${id}/identify`, {
        method: 'POST'
    });
    const data = await handleResponse<any>(response);
    // Identify returns a candidate object, not a full DB song, but may contain coverUrl
    if (data.coverUrl) data.coverUrl = resolveUrl(data.coverUrl);
    return data;
}

export async function identifySongSpotify(id: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/songs/${id}/identify-spotify`, {
        method: 'POST'
    });
    const data = await handleResponse<any>(response);
    if (data.coverUrl) data.coverUrl = resolveUrl(data.coverUrl);
    return data;
}

export async function getGeminiSuggestion(id: string): Promise<{ title: string; artist: string; album: string; genre: string[]; year?: number; coverUrl?: string }> {
    const response = await fetch(`${API_BASE_URL}/songs/${id}/refine`, {
        method: 'POST'
    });
    const data = await handleResponse<{ title: string; artist: string; album: string; genre: string[]; year?: number; coverUrl?: string }>(response);
    if (data.coverUrl) data.coverUrl = resolveUrl(data.coverUrl);
    return data;
}

export async function deleteSong(id: string): Promise<void> {
    await fetch(`${API_BASE_URL}/songs/${id}`, { method: 'DELETE' });
}

// Albums
export async function getAlbums(limit?: number, offset?: number, search?: string, signal?: AbortSignal, favorites?: boolean): Promise<Album[]> {
  const params = new URLSearchParams();
  if (limit !== undefined) params.append('limit', limit.toString());
  if (offset !== undefined) params.append('offset', offset.toString());
  if (search) params.append('search', search);
  if (favorites) params.append('favorites', 'true');

  const response = await fetch(`${API_BASE_URL}/albums?${params.toString()}`, { signal });
  const data = await handleResponse<Album[]>(response);
  return data.map(transformAlbum);
}

export async function getAlbum(id: string, songLimit: number = 20, songOffset: number = 0): Promise<Album & { songs: Song[] }> {
    const response = await fetch(`${API_BASE_URL}/albums/${id}?songLimit=${songLimit}&songOffset=${songOffset}`);
    const data = await handleResponse<Album & { songs: Song[] }>(response);
    return {
        ...transformAlbum(data),
        songs: data.songs.map(transformSong)
    };
}

export async function getAlbumSongs(id: string, limit: number = 20, offset: number = 0): Promise<Song[]> {
    const response = await fetch(`${API_BASE_URL}/albums/${id}/songs?limit=${limit}&offset=${offset}`);
    const data = await handleResponse<Song[]>(response);
    return data.map(transformSong);
}

export async function toggleAlbumFavorite(id: string): Promise<Album> {
  const response = await fetch(`${API_BASE_URL}/albums/${id}/favorite`, { method: 'PATCH' });
  const data = await handleResponse<Album>(response);
  return transformAlbum(data);
}

export async function updateAlbum(id: string, data: Partial<Album>): Promise<Album> {
    const response = await fetch(`${API_BASE_URL}/albums/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    const result = await handleResponse<Album>(response);
    return transformAlbum(result);
}

export async function updateAlbumCover(id: string, file: File): Promise<Album> {
    const formData = new FormData();
    formData.append('cover', file);
    const response = await fetch(`${API_BASE_URL}/albums/${id}/cover`, {
        method: 'PATCH',
        body: formData
    });
    const result = await handleResponse<Album>(response);
    return transformAlbum(result);
}

// Artists
export async function getArtists(limit?: number, offset?: number, search?: string, signal?: AbortSignal, favorites?: boolean): Promise<Artist[]> {
  const params = new URLSearchParams();
  if (limit !== undefined) params.append('limit', limit.toString());
  if (offset !== undefined) params.append('offset', offset.toString());
  if (search) params.append('search', search);
  if (favorites) params.append('favorites', 'true');

  const response = await fetch(`${API_BASE_URL}/artists?${params.toString()}`, { signal });
  const data = await handleResponse<Artist[]>(response);
  return data.map(transformArtist);
}

export async function getArtist(id: string, songLimit: number = 20, songOffset: number = 0): Promise<Artist & { songs: Song[], albums: Album[] }> {
    const response = await fetch(`${API_BASE_URL}/artists/${id}?songLimit=${songLimit}&songOffset=${songOffset}`);
    const data = await handleResponse<Artist & { songs: Song[], albums: Album[] }>(response);
    return {
        ...transformArtist(data),
        albums: data.albums.map(transformAlbum),
        songs: data.songs.map(transformSong)
    };
}

export async function getArtistSongs(id: string, limit: number = 20, offset: number = 0): Promise<Song[]> {
    const response = await fetch(`${API_BASE_URL}/artists/${id}/songs?limit=${limit}&offset=${offset}`);
    const data = await handleResponse<Song[]>(response);
    return data.map(transformSong);
}

export async function toggleArtistFavorite(id: string): Promise<Artist> {
  const response = await fetch(`${API_BASE_URL}/artists/${id}/favorite`, { method: 'PATCH' });
  const data = await handleResponse<Artist>(response);
  return transformArtist(data);
}

export async function updateArtist(id: string, data: Partial<Artist>): Promise<Artist> {
    const response = await fetch(`${API_BASE_URL}/artists/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    const result = await handleResponse<Artist>(response);
    return transformArtist(result);
}

export async function updateArtistAvatar(id: string, file: File): Promise<Artist> {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await fetch(`${API_BASE_URL}/artists/${id}/avatar`, {
        method: 'PATCH',
        body: formData
    });
    const result = await handleResponse<Artist>(response);
    return transformArtist(result);
}

// Playlists
export async function getPlaylists(favorites?: boolean): Promise<Playlist[]> {
  const params = new URLSearchParams();
  if (favorites) params.append('favorites', 'true');
  const response = await fetch(`${API_BASE_URL}/playlists?${params.toString()}`);
  const data = await handleResponse<Playlist[]>(response);
  return data.map(transformPlaylist);
}

export async function getPlaylist(id: string): Promise<Playlist & { songs: Song[] }> {
    const response = await fetch(`${API_BASE_URL}/playlists/${id}`);
    const data = await handleResponse<Playlist & { songs: Song[] }>(response);
    return {
        ...transformPlaylist(data),
        songs: data.songs.map(transformSong)
    };
}

export async function createPlaylist(name: string): Promise<Playlist> {
    const response = await fetch(`${API_BASE_URL}/playlists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
    });
    const result = await handleResponse<Playlist>(response);
    return transformPlaylist(result);
}

export async function togglePlaylistFavorite(id: string): Promise<Playlist> {
  const response = await fetch(`${API_BASE_URL}/playlists/${id}/favorite`, { method: 'PATCH' });
  const result = await handleResponse<Playlist>(response);
  return transformPlaylist(result);
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
    const result = await handleResponse<Playlist>(response);
    return transformPlaylist(result);
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

export async function uploadAudioFiles(files: File[]): Promise<UploadProgress> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    const response = await fetch(`${API_BASE_URL}/upload/folder`, {
        method: 'POST',
        body: formData
    });
    const data = await handleResponse<UploadProgress>(response);
    
    if (data.songs) {
        data.songs = data.songs.map(transformSong);
    }
    
    return data;
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

// System Settings
export async function getSettings(): Promise<Record<string, string>> {
    const response = await fetch(`${API_BASE_URL}/settings`);
    return handleResponse<Record<string, string>>(response);
}

export async function saveSettings(settings: Record<string, string>): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
    });
    return handleResponse(response);
}