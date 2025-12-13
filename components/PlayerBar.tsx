import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, Repeat, Shuffle, Heart, Maximize2, VolumeX } from 'lucide-react';
import { Song, NavigationState } from '../types';

interface PlayerBarProps {
  currentSong: Song | null;
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onToggleFavorite: (id: string) => void;
  onNavigate: (view: NavigationState['view'], id?: string) => void;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
  onExpand?: () => void;
}

const formatTime = (seconds: number) => {
  if (!seconds || isNaN(seconds)) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const PlayerBar: React.FC<PlayerBarProps> = ({ 
  currentSong, 
  isPlaying, 
  onPlayPause, 
  onNext, 
  onPrev, 
  onToggleFavorite, 
  onNavigate,
  currentTime,
  duration,
  onSeek,
  volume,
  onVolumeChange,
  onExpand
}) => {
  
  if (!currentSong) return null;

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="h-28 bg-black/40 backdrop-blur-2xl px-8 flex items-center justify-between z-[100] w-full shadow-2xl border-t border-white/5 flex-shrink-0 relative">
      
      {/* Song Info */}
      <div className="flex items-center gap-5 w-[30%] min-w-0">
        <div className="relative group flex-shrink-0">
           <img
             src={currentSong.coverUrl}
             alt={currentSong.title}
             onClick={() => onNavigate('song_details', currentSong.id)}
             className="w-16 h-16 rounded-xl object-cover shadow-lg group-hover:opacity-80 transition-opacity cursor-pointer"
           />
           {onExpand && (
               <button 
                 onClick={(e) => { e.stopPropagation(); onExpand(); }}
                 className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-xl"
               >
                 <Maximize2 className="w-6 h-6 text-white" />
               </button>
           )}
        </div>
        <div className="overflow-hidden min-w-0">
          <h4 
            onClick={() => onNavigate('song_details', currentSong.id)}
            className="text-white text-lg font-semibold truncate cursor-pointer hover:underline hover:text-indigo-400 transition-colors"
          >
            {currentSong.title}
          </h4>
          <p 
            onClick={() => onNavigate('artist_details', currentSong.artistId || 'ar1')} 
            className="text-slate-400 text-sm truncate hover:text-white cursor-pointer transition-colors"
          >
            {currentSong.artist}
          </p>
        </div>
        <button 
          onClick={() => onToggleFavorite(currentSong.id)}
          className="ml-2 text-slate-400 hover:text-rose-500 transition-colors"
        >
          <Heart className={`w-6 h-6 ${currentSong.isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center w-[40%] max-w-xl">
        <div className="flex items-center gap-8 mb-3">
          <button className="text-slate-500 hover:text-white transition-colors">
            <Shuffle className="w-5 h-5" />
          </button>
          <button onClick={onPrev} className="text-slate-300 hover:text-white transition-colors">
            <SkipBack className="w-7 h-7 fill-current" />
          </button>
          <button
            onClick={onPlayPause}
            className="w-12 h-12 bg-white rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-xl shadow-white/10 active:scale-95"
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 text-black fill-current" />
            ) : (
              <Play className="w-6 h-6 text-black fill-current ml-1" />
            )}
          </button>
          <button onClick={onNext} className="text-slate-300 hover:text-white transition-colors">
            <SkipForward className="w-7 h-7 fill-current" />
          </button>
          <button className="text-slate-500 hover:text-white transition-colors">
            <Repeat className="w-5 h-5" />
          </button>
        </div>
        
        <div className="w-full flex items-center gap-4 text-sm text-slate-500 font-medium select-none">
          <span className="tabular-nums w-10 text-right">{formatTime(currentTime)}</span>
          <div 
            className="flex-1 h-1.5 bg-white/10 rounded-full cursor-pointer relative group"
            onClick={(e) => {
               const rect = e.currentTarget.getBoundingClientRect();
               const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
               onSeek(percent * duration);
            }}
          >
            <div 
              className="absolute h-full bg-indigo-500 rounded-full group-hover:bg-indigo-400 transition-colors pointer-events-none" 
              style={{ width: `${progressPercent}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 shadow-md transition-opacity transform scale-125"></div>
            </div>
          </div>
          <span className="tabular-nums w-10">{formatTime(duration) || currentSong.duration}</span>
        </div>
      </div>

      {/* Volume */}
      <div className="flex items-center justify-end gap-4 w-[30%]">
        <button 
          onClick={() => onVolumeChange(volume === 0 ? 1 : 0)}
          className="text-slate-500 hover:text-white transition-colors"
        >
          {volume === 0 ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
          className="w-28 h-1.5 accent-indigo-500 bg-white/10 rounded-full appearance-none cursor-pointer"
        />
      </div>
    </div>
  );
};

export default PlayerBar;