export interface Song {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  album: string;
  albumId?: string;
  duration: string;
  coverUrl: string;
  genre: string[];
  isFavorite: boolean;
  fileUrl?: string;
  lyrics?: string;
  bitrate?: number;
  format?: string;
  waveformData?: number[];
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  year: number;
  trackCount: number;
  genre: string[];
  isFavorite?: boolean;
}

export interface Artist {
  id: string;
  name: string;
  avatarUrl: string;
  followers: string;
  isFavorite?: boolean;
}

export interface Playlist {
  id: string;
  name: string;
  coverUrl?: string;
  songIds: string[];
  songCount?: number;
}

export type ViewType =
  | 'home'
  | 'search'
  | 'browse'
  | 'favorites'
  | 'album_details'
  | 'artist_details'
  | 'playlist_details'
  | 'song_details'
  | 'all_songs'
  | 'all_albums'
  | 'all_artists'
  | 'all_playlists';

export interface NavigationState {
  view: ViewType;
  entityId?: string; // Used for details views (albumId, artistId, etc.)
}