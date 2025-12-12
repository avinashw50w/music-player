import React, { useState } from 'react';
import { Clock, GripVertical, Play, Pause, Heart, Trash2 } from 'lucide-react';
import { Song } from '../types';
import PlayingIndicator from './PlayingIndicator';

interface TrackListProps {
  songs: Song[];
  currentSongId?: string;
  isPlaying: boolean;
  onPlaySong: (song: Song, context?: Song[]) => void;
  onToggleFavorite: (id: string) => void;
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
  isEditable,
  onRemoveSong,
  onReorder,
  showHeader = true
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  return (
    <div className="px-6 md:px-10 pb-32 max-w-7xl mx-auto">
      {showHeader && (
        <div className="grid grid-cols-[auto_1fr_auto] md:grid-cols-[auto_1fr_1fr_auto] gap-6 px-4 py-4 border-b border-white/5 text-slate-400 text-xs font-bold uppercase tracking-widest sticky top-0 bg-black/40 backdrop-blur-md z-10 mb-2 rounded-xl">
          <span className="w-10 text-center">#</span>
          <span>Title</span>
          <span className="hidden md:block">Album</span>
          <span className="w-16 text-center"><Clock className="w-4 h-4 mx-auto" /></span>
        </div>
      )}
      <div className="space-y-1">
        {songs.map((song, i) => {
          const isCurrent = currentSongId === song.id;
          const isCurrentPlaying = isCurrent && isPlaying;

          return (
            <div
              key={`${song.id}-${i}`}
              draggable={isEditable}
              onDragStart={() => isEditable && setDraggedIndex(i)}
              onDragOver={(e) => { e.preventDefault(); }}
              onDrop={(e) => {
                e.preventDefault();
                if (isEditable && draggedIndex !== null && draggedIndex !== i) {
                  onReorder?.(draggedIndex, i);
                  setDraggedIndex(null);
                }
              }}
              className={`grid grid-cols-[auto_1fr_auto] md:grid-cols-[auto_1fr_1fr_auto] gap-6 px-4 py-3.5 rounded-xl hover:bg-white/5 group transition-all duration-200 items-center cursor-pointer ${isCurrent ? 'bg-white/10 shadow-lg shadow-black/20' : ''}`}
              onClick={() => onPlaySong(song, songs)}
            >
              <div className="w-10 h-10 flex items-center justify-center relative">
                {isEditable ? (
                  <div className="cursor-grab active:cursor-grabbing p-1 text-slate-600 hover:text-slate-300">
                    <GripVertical className="w-5 h-5" />
                  </div>
                ) : (
                  <span className={`text-base font-medium tabular-nums ${isCurrent ? 'text-indigo-400 font-bold' : 'text-slate-500'}`}>
                    {i + 1}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-5">
                <div className="relative w-12 h-12 flex-shrink-0">
                  <img src={song.coverUrl} className="w-full h-full rounded-lg object-cover shadow-sm" alt="" />
                  {isCurrentPlaying && (
                    <>
                      <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center backdrop-blur-sm group-hover:opacity-0 transition-opacity">
                        <PlayingIndicator />
                      </div>
                      <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Pause className="w-5 h-5 text-white fill-current" />
                      </div>
                    </>
                  )}
                  {!isCurrentPlaying && (
                    <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[1px]">
                      <Play className="w-5 h-5 text-white fill-current ml-0.5" />
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <div className={`font-bold text-base truncate transition-colors ${isCurrent ? 'text-[#818cf8]' : 'text-white'}`}>{song.title}</div>
                  <div className="text-slate-500 text-sm md:hidden mt-0.5 truncate">{song.artist}</div>
                </div>
              </div>

              <div className="text-slate-400 text-base font-medium hidden md:block hover:text-white transition-colors truncate pr-4">{song.album}</div>

              <div className="flex items-center justify-end gap-4">
                {isEditable ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemoveSong?.(song.id); }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-rose-500 p-2"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                ) : (
                  <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(song.id); }} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-rose-500 p-2 transform hover:scale-110 active:scale-90 transition-all">
                    <Heart className={`w-5 h-5 ${song.isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
                  </button>
                )}
                <div className="text-slate-500 text-base tabular-nums text-center w-16">{song.duration}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};