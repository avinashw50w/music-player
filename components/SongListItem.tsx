import React from 'react';
import { Song, NavigationState } from '../types';
import { Play, Heart, ListPlus, GripVertical, Trash2 } from 'lucide-react';
import PlayingIndicator from './PlayingIndicator';

interface SongListItemProps {
  song: Song;
  index: number;
  currentSongId?: string;
  isPlaying: boolean;
  onPlay: () => void;
  onNavigate: (view: NavigationState['view'], id?: string) => void;
  onToggleFavorite: (id: string) => void;
  onAddToPlaylist: (song: Song) => void;
  isEditable?: boolean;
  onRemove?: () => void;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  showAlbum?: boolean;
}

export const SongListItem: React.FC<SongListItemProps> = ({
  song,
  index,
  currentSongId,
  isPlaying,
  onPlay,
  onNavigate,
  onToggleFavorite,
  onAddToPlaylist,
  isEditable,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
  showAlbum = true
}) => {
  const isCurrent = currentSongId === song.id;
  const displayIndex = String(index + 1).padStart(2, '0');

  return (
    <div
      draggable={isEditable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={onPlay}
      className={`group grid grid-cols-[auto_1fr_auto] md:grid-cols-[auto_4fr_2fr_auto] gap-4 px-4 py-3 rounded-xl transition-colors cursor-pointer items-center border border-transparent
        ${isCurrent ? 'bg-white/10 border-white/5 shadow-lg' : 'hover:bg-white/5 hover:border-white/5'}
      `}
    >
      {/* 1. Index / Play / Visualizer */}
      <div className="w-8 md:w-10 flex justify-center items-center text-slate-500 font-medium text-base relative">
         {isEditable ? (
             <button 
                className="cursor-grab active:cursor-grabbing p-2 text-slate-600 hover:text-slate-300 -ml-2" 
                onMouseDown={(e) => e.stopPropagation()} // Prevent click propagation
             >
                <GripVertical className="w-5 h-5" />
             </button>
         ) : (
             <>
                <span className={`tabular-nums w-6 text-center ${isCurrent && isPlaying ? 'hidden' : 'group-hover:hidden'} ${isCurrent ? 'text-indigo-400' : ''}`}>
                    {displayIndex}
                </span>
                <button 
                    className={`hidden group-hover:flex ${isCurrent && isPlaying ? '!hidden' : ''} items-center justify-center w-6`}
                >
                    <Play className="w-4 h-4 text-white fill-current" />
                </button>
                {isCurrent && isPlaying && <PlayingIndicator />}
             </>
         )}
      </div>

      {/* 2. Cover + Title + Artist */}
      <div className="flex items-center gap-4 min-w-0">
         <div className="relative w-12 h-12 flex-shrink-0 group/cover">
             <img 
                src={song.coverUrl} 
                alt={song.title} 
                className={`w-full h-full rounded-lg object-cover shadow-sm transition-opacity ${isCurrent ? 'opacity-80' : ''}`} 
             />
         </div>
         <div className="min-w-0 flex-1">
            <h4 
                className={`font-semibold text-base truncate hover:underline cursor-pointer ${isCurrent ? 'text-indigo-400' : 'text-white'}`}
                onClick={(e) => {
                    e.stopPropagation();
                    onNavigate('song_details', song.id);
                }}
            >
                {song.title}
            </h4>
            <div className="flex items-center text-sm text-slate-500 truncate mt-0.5">
                <span 
                    className="hover:text-white hover:underline cursor-pointer transition-colors"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (song.artistId) onNavigate('artist_details', song.artistId);
                    }}
                >
                    {song.artist}
                </span>
            </div>
         </div>
      </div>

      {/* 3. Album */}
      <div className="hidden md:flex items-center min-w-0">
         {showAlbum && (
             <span 
                className="text-slate-400 text-sm font-medium truncate hover:text-white hover:underline cursor-pointer transition-colors"
                onClick={(e) => {
                    e.stopPropagation();
                    if (song.albumId) onNavigate('album_details', song.albumId);
                }}
             >
                {song.album}
             </span>
         )}
      </div>

      {/* 4. Actions + Duration */}
      <div className="flex items-center justify-end gap-1 md:gap-3">
         {/* Heart */}
         {!isEditable && (
             <button 
                onClick={(e) => { e.stopPropagation(); onToggleFavorite(song.id); }}
                className={`p-2 rounded-full hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all ${song.isFavorite ? 'opacity-100 text-rose-500' : 'text-slate-500 hover:text-rose-500'}`}
             >
                <Heart className={`w-5 h-5 ${song.isFavorite ? 'fill-current' : ''}`} />
             </button>
         )}

         {/* Add Playlist */}
         {!isEditable && (
             <button 
                onClick={(e) => { e.stopPropagation(); onAddToPlaylist(song); }}
                className="p-2 rounded-full hover:bg-white/10 text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                title="Add to Playlist"
             >
                <ListPlus className="w-5 h-5" />
             </button>
         )}

         {/* Remove (Editable mode) */}
         {isEditable && onRemove && (
             <button
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                className="p-2 rounded-full hover:bg-white/10 text-slate-500 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
             >
                <Trash2 className="w-5 h-5" />
             </button>
         )}

         <span className="text-slate-500 text-sm tabular-nums w-12 text-right">
            {song.duration}
         </span>
      </div>
    </div>
  );
};