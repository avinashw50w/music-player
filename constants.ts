// This file now contains only fallback/default data
// The application fetches real data from the backend API

import { Song, Album, Artist, Playlist } from './types';

// API Base URL - used by services/api.ts
export const API_BASE_URL = 'http://localhost:3010/api';

// Default/fallback data for when backend is not available
export const ARTISTS: Artist[] = [];
export const ALBUMS: Album[] = [];
export const SONGS: Song[] = [];
export const PLAYLISTS: Playlist[] = [];

export const GENRES = ['Pop', 'R&B', 'Jazz', 'Rock', 'Indie', 'Classical', 'Electronic', 'Hip Hop'];