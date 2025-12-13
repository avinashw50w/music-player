import React from 'react';
import { Song, Playlist } from '../types';
import { DetailHeader } from '../components/DetailHeader';
import { ActionButtons } from '../components/ActionButtons';
import { TrackList } from '../components/TrackList';
import { Music } from 'lucide-react';

export const PlaylistDetails: React.FC<any> = (props) => {
  const { playlist, onDeletePlaylist, onRenamePlaylist, onRemoveSong, onReorderSongs } = props;

  if (!playlist) return null;

  const playlistSongs = playlist.songIds
    .map((id: string) => props.songs.find((s: Song) => s.id === id))
    .filter((s: Song | undefined): s is Song => !!s);

  const isContextPlaying = props.isPlaying && props.currentSongId && playlistSongs.some((s: Song) => s.id === props.currentSongId);

  const handleEdit = () => {
    const newName = window.prompt("Rename Playlist", playlist.name);
    if (newName && newName.trim() !== "") {
      onRenamePlaylist(playlist.id, newName);
    }
  };

  const handlePlayToggle = () => {
    if (isContextPlaying && props.currentSongId) {
        const song = props.songs.find((s: Song) => s.id === props.currentSongId);
        if (song) props.onPlaySong(song);
    } else {
        props.onPlayContext(playlistSongs);
    }
  };

  return (
    <div className="min-h-full">
      <DetailHeader
        title={playlist.name}
        subtitle="Public Playlist"
        meta={`${playlistSongs.length} songs`}
        image={playlist.coverUrl || 'https://picsum.photos/200/200'}
        type="Playlist"
        onBack={props.onBack}
        heroColor="from-green-500/20"
      />
      <ActionButtons
        isPlaying={!!isContextPlaying}
        onPlay={handlePlayToggle}
        showEditControls={true}
        onDelete={() => onDeletePlaylist(playlist.id)}
        onEdit={handleEdit}
        isFavorite={!!playlist.isFavorite} // Ensure boolean
        onToggleFavorite={() => props.onToggleFavorite(playlist.id)}
      />
      <div className="mt-8 px-4">
        {playlistSongs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 border-2 border-dashed border-white/5 rounded-[3rem] text-center bg-white/[0.02] max-w-4xl mx-auto">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 text-slate-400">
              <Music className="w-10 h-10" />
            </div>
            <p className="text-white font-bold text-2xl mb-3">It's a bit empty here</p>
            <p className="text-slate-500 text-xl">Find songs you love and add them to this playlist!</p>
          </div>
        ) : (
          <TrackList
            songs={playlistSongs}
            currentSongId={props.currentSongId}
            isPlaying={props.isPlaying}
            onPlaySong={props.onPlaySong}
            onToggleFavorite={props.onToggleFavorite}
            isEditable={true}
            onRemoveSong={(songId) => onRemoveSong(playlist.id, songId)}
            onReorder={(from, to) => onReorderSongs(playlist.id, from, to)}
            onAddToPlaylist={props.onAddToPlaylist}
            onNavigate={props.onNavigate}
          />
        )}
      </div>
    </div>
  );
};