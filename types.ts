
export interface Song {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  artists?: { id: string; name: string }[];
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
  isFavorite?: boolean;
}

export interface NavigationState {
  view: 'song_details' | 'album_details' | 'artist_details' | 'playlist_details' | string;
  id?: string;
}