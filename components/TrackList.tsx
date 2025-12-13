
import React, { useRef } from 'react';
import { Clock } from 'lucide-react';
import { Song, NavigationState } from '../types';
import { SongListItem } from './SongListItem';

interface TrackListProps {
  songs: Song[];
  currentSongId?: string;
  isPlaying: boolean;
  onPlaySong: (song: Song, context?: Song[]) => void;
  onToggleFavorite: (id: string) => void;
  onAddToPlaylist: (song: Song) => void;
  onNavigate: (view: NavigationState['view'], id?: string) => void;
  isEditable?: boolean;
  onRemoveSong?: (songId: string) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
  showHeader?: boolean;
}

export const TrackList: React.FC<TrackListProps> = ({
  songs,
  currentSongId,
  isPlaying,
  onPlaySong,
  onToggleFavorite,
  onAddToPlaylist,
  onNavigate,
  isEditable,
  onRemoveSong,
  onReorder,
  showHeader = true
}) => {
  const draggedIndexRef = useRef<number | null>(null);

  return (
    <div className="px-6 md:px-10 pb-32 max-w-7xl mx-auto">
      {showHeader && (
        <div className="grid grid-cols-[auto_1fr_auto] md:grid-cols-[auto_4fr_2fr_auto] gap-4 px-8 py-4 border-b border-white/5 text-slate-400 text-xs font-bold uppercase tracking-widest sticky top-0 bg-black/40 backdrop-blur-md z-10 mb-2 rounded-xl">
          <span className="w-10 text-center">#</span>
          <span>Title</span>
          <span className="hidden md:block">Album</span>
          <span className="w-16 text-center"><Clock className="w-4 h-4 mx-auto" /></span>
        </div>
      )}
      <div className="space-y-1">
        {songs.map((song, i) => (
          <SongListItem
            key={`${song.id}-${i}`}
            song={song}
            index={i}
            currentSongId={currentSongId}
            isPlaying={isPlaying}
            onPlay={() => onPlaySong(song, songs)}
            onNavigate={onNavigate}
            onToggleFavorite={onToggleFavorite}
            onAddToPlaylist={onAddToPlaylist}
            isEditable={isEditable}
            onRemove={() => onRemoveSong?.(song.id)}
            onDragStart={() => {
                if (isEditable) draggedIndexRef.current = i;
            }}
            onDragOver={(e) => { 
                if (isEditable) {
                    e.preventDefault(); 
                    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
                }
            }}
            onDrop={(e) => {
              e.preventDefault();
              const draggedIndex = draggedIndexRef.current;
              if (isEditable && draggedIndex !== null && draggedIndex !== i) {
                onReorder?.(draggedIndex, i);
                draggedIndexRef.current = null;
              }
            }}
          />
        ))}
      </div>
    </div>
  );
};
