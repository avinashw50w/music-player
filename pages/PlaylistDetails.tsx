
import React, { useState, useEffect } from 'react';
import { Song, Playlist } from '../types';
import * as api from '../services/api';
import { DetailHeader } from '../components/DetailHeader';
import { ActionButtons } from '../components/ActionButtons';
import { TrackList } from '../components/TrackList';
import { Music } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';

interface PlaylistDetailsProps {
    currentSongId?: string;
    isPlaying: boolean;
    onPlaySong: (song: Song, context?: Song[]) => void;
    onPlayContext: (context: Song[]) => void;
    onToggleFavorite: (id: string) => void;
    onAddToPlaylist: (song: Song) => void;
    onDeletePlaylist: (id: string) => void;
    onRenamePlaylist: (id: string, name: string) => void;
    onRemoveSong: (playlistId: string, songId: string) => void;
    onReorderSongs: (playlistId: string, from: number, to: number) => void;
}

export const PlaylistDetails: React.FC<PlaylistDetailsProps> = ({ 
    currentSongId, isPlaying, onPlaySong, onPlayContext, onToggleFavorite, onAddToPlaylist,
    onDeletePlaylist, onRenamePlaylist, onRemoveSong, onReorderSongs
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
      if (id) {
          setLoading(true);
          api.getPlaylist(id)
            .then(data => {
                const { songs: playlistSongs, ...plData } = data;
                setPlaylist(plData);
                setSongs(playlistSongs);
            })
            .catch(err => {
                console.error("Failed to fetch playlist", err);
                setPlaylist(null);
            })
            .finally(() => setLoading(false));
      }
  }, [id]);

  if (loading) {
      return (
          <div className="min-h-full flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
      );
  }

  if (!playlist) return (
     <div className="min-h-full flex items-center justify-center">
        <p className="text-slate-400">Playlist not found</p>
     </div>
  );

  const isContextPlaying = isPlaying && currentSongId && songs.some((s: Song) => s.id === currentSongId);

  const handleEdit = () => {
    const newName = window.prompt("Rename Playlist", playlist.name);
    if (newName && newName.trim() !== "") {
      onRenamePlaylist(playlist.id, newName);
      setPlaylist(prev => prev ? { ...prev, name: newName } : null);
    }
  };

  const handlePlayToggle = () => {
    if (isContextPlaying && currentSongId) {
        const song = songs.find((s: Song) => s.id === currentSongId);
        if (song) onPlaySong(song);
    } else {
        onPlayContext(songs);
    }
  };

  const handleDelete = () => {
      onDeletePlaylist(playlist.id);
      navigate('/');
  };

  const handleRemoveSong = (songId: string) => {
      onRemoveSong(playlist.id, songId);
      setSongs(prev => prev.filter(s => s.id !== songId));
  };

  const handleReorder = (from: number, to: number) => {
      // Optimistic update
      const newSongs = [...songs];
      const [moved] = newSongs.splice(from, 1);
      newSongs.splice(to, 0, moved);
      setSongs(newSongs);
      onReorderSongs(playlist.id, from, to);
  };

  // Internal favorite toggle wrapper to update local state
  const handleToggleFavoriteInternal = (targetId: string) => {
      onToggleFavorite(targetId);
      if (targetId === playlist.id) {
          setPlaylist(prev => prev ? { ...prev, isFavorite: !prev.isFavorite } : null);
      } else {
          setSongs(prev => prev.map(s => s.id === targetId ? { ...s, isFavorite: !s.isFavorite } : s));
      }
  };

  return (
    <div className="min-h-full">
      <DetailHeader
        title={playlist.name}
        subtitle="Public Playlist"
        meta={`${songs.length} songs`}
        image={playlist.coverUrl || 'https://picsum.photos/200/200'}
        type="Playlist"
        onBack={() => navigate(-1)}
        heroColor="from-green-500/20"
      />
      <ActionButtons
        isPlaying={!!isContextPlaying}
        onPlay={handlePlayToggle}
        showEditControls={true}
        onDelete={handleDelete}
        onEdit={handleEdit}
        isFavorite={!!playlist.isFavorite} // Ensure boolean
        onToggleFavorite={() => handleToggleFavoriteInternal(playlist.id)}
      />
      <div className="mt-8 px-4">
        {songs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 border-2 border-dashed border-white/5 rounded-[3rem] text-center bg-white/[0.02] max-w-4xl mx-auto">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 text-slate-400">
              <Music className="w-10 h-10" />
            </div>
            <p className="text-white font-bold text-2xl mb-3">It's a bit empty here</p>
            <p className="text-slate-500 text-xl">Find songs you love and add them to this playlist!</p>
          </div>
        ) : (
          <TrackList
            songs={songs}
            currentSongId={currentSongId}
            isPlaying={isPlaying}
            onPlaySong={onPlaySong}
            onToggleFavorite={handleToggleFavoriteInternal}
            isEditable={true}
            onRemoveSong={handleRemoveSong}
            onReorder={handleReorder}
            onAddToPlaylist={onAddToPlaylist}
            onNavigate={(view, id) => {
                 if (view === 'song_details') navigate(`/song/${id}`);
                 else if (view === 'artist_details') navigate(`/artist/${id}`);
                 else if (view === 'album_details') navigate(`/album/${id}`);
            }}
          />
        )}
      </div>
    </div>
  );
};
