
import React from 'react';
import { Song, NavigationState } from '../types';
import { Play, Pause, Heart, ListPlus, GripVertical, Trash2 } from 'lucide-react';
import PlayingIndicator from './PlayingIndicator';
import { useNavigate } from 'react-router-dom';

interface SongListItemProps {
  song: Song;
  index: number;
  currentSongId?: string;
  isPlaying: boolean;
  onPlay: () => void;
  onToggleFavorite: (id: string) => void;
  onAddToPlaylist: (song: Song) => void;
  isEditable?: boolean;
  onRemove?: () => void;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  showAlbum?: boolean;
  onNavigate?: (view: NavigationState['view'], id?: string) => void;
}

const SongListItemComponent: React.FC<SongListItemProps> = ({
  song,
  index,
  currentSongId,
  isPlaying,
  onPlay,
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
  const navigate = useNavigate();

  const renderArtists = () => {
      if (song.artists && song.artists.length > 0) {
          return song.artists.map((artist, i) => (
              <React.Fragment key={artist.id}>
                  {i > 0 && <span className="text-slate-500 cursor-default">, </span>}
                  <span 
                      className="hover:text-white hover:underline cursor-pointer transition-colors truncate"
                      onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/artist/${artist.id}`);
                      }}
                  >
                      {artist.name}
                  </span>
              </React.Fragment>
          ));
      }
      return (
          <span 
              className="hover:text-white hover:underline cursor-pointer transition-colors truncate max-w-full"
              onClick={(e) => {
                  e.stopPropagation();
                  if (song.artistId) navigate(`/artist/${song.artistId}`);
              }}
          >
              {song.artist}
          </span>
      );
  };

  return (
    <div
      draggable={isEditable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={onPlay}
      className={`group grid gap-4 px-4 py-3 rounded-xl transition-colors cursor-pointer items-center border border-transparent
        ${isEditable 
            ? 'grid-cols-[auto_auto_1fr_auto] md:grid-cols-[auto_auto_4fr_2fr_auto]' 
            : 'grid-cols-[auto_1fr_auto] md:grid-cols-[auto_4fr_2fr_auto]'}
        ${isCurrent ? 'bg-white/10 border-white/5 shadow-lg' : 'hover:bg-white/5 hover:border-white/5'}
      `}
    >
      {/* 0. Drag Handle (Only if Editable) */}
      {isEditable && (
         <button 
            className="cursor-grab active:cursor-grabbing p-1 text-slate-600 hover:text-slate-300 flex-shrink-0" 
            onMouseDown={(e) => e.stopPropagation()} 
         >
            <GripVertical className="w-5 h-5" />
         </button>
      )}

      {/* 1. Index / Play / Pause / Visualizer */}
      <div className="w-8 md:w-10 flex justify-center items-center text-slate-500 font-medium text-base relative flex-shrink-0">
        {/* Number: Hidden if playing or hovering */}
        <span className={`tabular-nums w-6 text-center ${isCurrent && isPlaying ? 'hidden' : 'group-hover:hidden'} ${isCurrent ? 'text-indigo-400' : ''}`}>
            {displayIndex}
        </span>
        
        {/* Play Button: Shown on hover if NOT playing this song */}
        <button 
            className={`hidden group-hover:flex ${isCurrent && isPlaying ? '!hidden' : ''} items-center justify-center w-6`}
        >
            <Play className="w-4 h-4 text-white fill-current" />
        </button>

        {/* Pause Button: Shown on hover if IS playing this song */}
        <button 
            className={`hidden ${isCurrent && isPlaying ? 'group-hover:flex' : ''} items-center justify-center w-6`}
        >
            <Pause className="w-4 h-4 text-white fill-current" />
        </button>

        {/* Visualizer: Shown if playing this song AND NOT hovering */}
        {isCurrent && isPlaying && (
            <div className="group-hover:hidden">
                <PlayingIndicator />
            </div>
        )}
      </div>

      {/* 2. Cover + Title + Artist */}
      <div className="flex items-center gap-4 min-w-0 w-full overflow-hidden">
         <div className="relative w-12 h-12 flex-shrink-0 group/cover">
             <img 
                src={song.coverUrl} 
                alt={song.title} 
                className={`w-full h-full rounded-lg object-cover shadow-sm transition-opacity ${isCurrent ? 'opacity-80' : ''}`} 
             />
         </div>
         <div className="flex-1 flex flex-col items-start min-w-0 overflow-hidden">
            <span 
                className={`font-semibold text-base truncate max-w-full hover:underline cursor-pointer ${isCurrent ? 'text-indigo-400' : 'text-white'}`}
                title={song.title}
                onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/song/${song.id}`);
                }}
            >
                {song.title}
            </span>
            <div className="flex items-center text-sm text-slate-500 w-full mt-0.5 truncate">
                {renderArtists()}
            </div>
         </div>
      </div>

      {/* 3. Album */}
      <div className="hidden md:flex items-center min-w-0 w-full overflow-hidden">
         {showAlbum && (
             <span 
                className="text-slate-400 text-sm font-medium truncate max-w-full hover:text-white hover:underline cursor-pointer transition-colors"
                onClick={(e) => {
                    e.stopPropagation();
                    if (song.albumId) navigate(`/album/${song.albumId}`);
                }}
             >
                {song.album}
             </span>
         )}
      </div>

      {/* 4. Actions + Duration */}
      <div className="flex items-center justify-end gap-1 md:gap-3 flex-shrink-0 ml-auto">
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

export const SongListItem = React.memo(SongListItemComponent, (prev, next) => {
    // Custom comparison to avoid re-renders when function props change
    return (
        prev.song.id === next.song.id &&
        prev.song.title === next.song.title &&
        prev.song.isFavorite === next.song.isFavorite &&
        prev.index === next.index &&
        prev.currentSongId === next.currentSongId &&
        prev.isPlaying === next.isPlaying &&
        prev.isEditable === next.isEditable
    );
});
