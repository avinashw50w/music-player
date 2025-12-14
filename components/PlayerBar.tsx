
import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, Repeat, Repeat1, Shuffle, Heart, Maximize2, VolumeX } from 'lucide-react';
import { Song } from '../types';
import { ProgressBar } from './ProgressBar';
import { useNavigate } from 'react-router-dom';

interface PlayerBarProps {
  currentSong: Song | null;
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onToggleFavorite: (id: string) => void;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
  onExpand?: () => void;
  onNavigate?: any; 
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
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
  currentTime,
  duration,
  onSeek,
  volume,
  onVolumeChange,
  onExpand,
  isShuffle,
  repeatMode,
  onToggleShuffle,
  onToggleRepeat
}) => {
  const navigate = useNavigate();
  
  if (!currentSong) return null;

  return (
    <div className="h-28 bg-black/40 backdrop-blur-2xl px-8 flex items-center justify-between z-[100] w-full shadow-2xl border-t border-white/5 flex-shrink-0 relative">
      
      {/* Song Info */}
      <div className="flex items-center gap-5 w-[30%] min-w-0">
        <div className="relative group flex-shrink-0">
           <img
             src={currentSong.coverUrl}
             alt={currentSong.title}
             onClick={() => navigate(`/song/${currentSong.id}`)}
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
            onClick={() => navigate(`/song/${currentSong.id}`)}
            className="text-white text-lg font-semibold truncate cursor-pointer hover:underline hover:text-indigo-400 transition-colors w-fit"
          >
            {currentSong.title}
          </h4>
          <p 
            onClick={() => navigate(`/artist/${currentSong.artistId || 'ar1'}`)} 
            className="text-slate-400 text-sm truncate hover:text-white cursor-pointer transition-colors w-fit"
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
          <button 
            onClick={onToggleShuffle}
            className={`transition-colors ${isShuffle ? 'text-indigo-500' : 'text-slate-500 hover:text-white'}`}
            title="Shuffle"
          >
            <Shuffle className="w-5 h-5" />
          </button>
          
          <button onClick={onPrev} className="text-slate-300 hover:text-white transition-colors active:scale-95 transform">
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
          
          <button onClick={onNext} className="text-slate-300 hover:text-white transition-colors active:scale-95 transform">
            <SkipForward className="w-7 h-7 fill-current" />
          </button>
          
          <button 
            onClick={onToggleRepeat}
            className={`transition-colors ${repeatMode !== 'off' ? 'text-indigo-500' : 'text-slate-500 hover:text-white'}`}
            title="Repeat"
          >
            {repeatMode === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
          </button>
        </div>
        
        <div className="w-full flex items-center gap-4 text-sm text-slate-500 font-medium select-none">
          <span className="tabular-nums w-10 text-right">{formatTime(currentTime)}</span>
          <ProgressBar 
            currentTime={currentTime} 
            duration={duration} 
            onSeek={onSeek} 
          />
          <span className="tabular-nums w-10">{formatTime(duration) || currentSong.duration}</span>
        </div>
      </div>

      {/* Volume */}
      <div className="flex items-center justify-end gap-4 w-[30%] group/vol">
        <button 
          onClick={() => onVolumeChange(volume === 0 ? 1 : 0)}
          className="text-slate-500 hover:text-white transition-colors"
        >
          {volume === 0 ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
        </button>
        
        {/* Custom Volume Slider reusing ProgressBar logic but simplified */}
        <div className="w-28 h-1.5 bg-white/10 rounded-full cursor-pointer relative group-hover/vol:h-2 transition-all">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <div 
            className="absolute h-full bg-slate-400 rounded-full group-hover/vol:bg-white transition-colors" 
            style={{ width: `${volume * 100}%` }}
          />
          <div 
             className="absolute h-3 w-3 bg-white rounded-full top-1/2 -translate-y-1/2 shadow-md opacity-0 group-hover/vol:opacity-100 transition-opacity pointer-events-none"
             style={{ left: `${volume * 100}%`, transform: 'translate(-50%, -50%)' }}
          />
        </div>
      </div>
    </div>
  );
};

export default PlayerBar;
