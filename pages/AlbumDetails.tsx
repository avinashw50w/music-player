import React, { useState } from 'react';
import { Song, Album, NavigationState, Artist } from '../types';
import * as api from '../services/api';
import { DetailHeader } from '../components/DetailHeader';
import { ActionButtons } from '../components/ActionButtons';
import { TrackList } from '../components/TrackList';
import { EditModal } from '../components/EditModal';

interface DetailProps {
  id?: string;
  onBack: () => void;
  songs: Song[];
  albums?: Album[];
  artists?: Artist[];
  currentSongId?: string;
  isPlaying: boolean;
  onPlaySong: (song: Song, context?: Song[]) => void;
  onPlayContext: (context: Song[]) => void;
  onToggleFavorite: (id: string) => void;
  onAddToPlaylist: (song: Song) => void;
  onUpdateSong?: (song: Song) => void;
  onUpdateAlbum?: (album: Album) => void;
  onUpdateArtist?: (artist: Artist) => void;
  onNavigate?: (view: NavigationState['view'], id?: string) => void;
}

export const AlbumDetails: React.FC<DetailProps> = ({ id, onBack, songs, albums = [], currentSongId, isPlaying, onPlaySong, onPlayContext, onToggleFavorite, onUpdateAlbum }) => {
  const album = albums.find(a => a.id === id) || albums[0];
  const [isEditing, setIsEditing] = useState(false);

  if (!album) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <p className="text-slate-400">Album not found</p>
      </div>
    );
  }

  const albumSongs = songs.filter(s => s.album === album.title);
  const isContextPlaying = isPlaying && currentSongId && albumSongs.some(s => s.id === currentSongId);

  const handleSave = async (data: any) => {
    try {
      const updated = await api.updateAlbum(album.id, {
        title: data.title,
        genre: data.genre,
        year: parseInt(data.year) || album.year
      });
      onUpdateAlbum?.(updated);
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to update album", err);
    }
  };

  const handleCoverUpload = async (file: File) => {
    try {
      const updated = await api.updateAlbumCover(album.id, file);
      onUpdateAlbum?.(updated);
    } catch (err) {
      console.error("Failed to update album cover", err);
    }
  };

  return (
    <div className="min-h-full">
      <DetailHeader
        title={album.title}
        subtitle={
          <div className="flex items-center gap-2">
            <span>{album.artist}</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400 font-normal">{album.year}</span>
          </div>
        }
        meta={<>{album.trackCount} songs <span className="text-slate-600 mx-2">•</span> {album.genre}</>}
        image={album.coverUrl}
        type="Album"
        onBack={onBack}
        heroColor="from-blue-500/20"
        onImageUpload={handleCoverUpload}
      />
      <ActionButtons 
        isPlaying={!!isContextPlaying}
        onPlay={() => onPlayContext(albumSongs)} 
        onFollow={() => { }} 
        onEdit={() => setIsEditing(true)}
      />
      <div className="mt-8">
        <TrackList
          songs={albumSongs}
          currentSongId={currentSongId}
          isPlaying={isPlaying}
          onPlaySong={onPlaySong}
          onToggleFavorite={onToggleFavorite}
        />
      </div>
      {isEditing && (
        <EditModal
          title="Edit Album"
          onClose={() => setIsEditing(false)}
          onSave={handleSave}
          fields={[
            { name: 'title', label: 'Title', value: album.title },
            { name: 'year', label: 'Year', value: String(album.year) },
            { name: 'genre', label: 'Genre', value: album.genre }
          ]}
        />
      )}
    </div>
  );
};