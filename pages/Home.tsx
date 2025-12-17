
import React, { useState, useEffect, useMemo } from 'react';
import { Song } from '../types';
import { Heart, Play } from 'lucide-react';
import PlayingIndicator from '../components/PlayingIndicator';
import { HomeHeroCards } from '../components/HomeHeroCards';
import { RecentlyAddedCarousel } from '../components/RecentlyAddedCarousel';

interface HomeProps {
  recentSongs: Song[];
  recentlyAdded: Song[];
  onPlaySong: (song: Song, context?: Song[]) => void;
  currentSongId?: string;
  isPlaying: boolean;
  onToggleFavorite: (id: string) => void;
}

const Home: React.FC<HomeProps> = ({ recentSongs, recentlyAdded, onPlaySong, currentSongId, isPlaying, onToggleFavorite }) => {
  const [frozenIds, setFrozenIds] = useState<string[]>([]);

  useEffect(() => {
    if (frozenIds.length === 0 && recentSongs.length > 0) {
      setFrozenIds(recentSongs.map(s => s.id));
    }
  }, [recentSongs, frozenIds.length]);

  const displaySongs = useMemo(() => {
    if (frozenIds.length === 0) return recentSongs;
    return frozenIds
      .map(id => recentSongs.find(s => s.id === id))
      .filter((s): s is Song => !!s);
  }, [frozenIds, recentSongs]);

  return (
    <div className="p-10 pb-10">
      <div className="flex items-center justify-between mb-10 animate-fade-in-up">
        <h1 className="text-4xl font-bold text-white tracking-tight">Discover</h1>
      </div>
      
      <HomeHeroCards />

      <div className="flex flex-col gap-10 animate-fade-in-up delay-300">
        <RecentlyAddedCarousel 
          songs={recentlyAdded} 
          currentSongId={currentSongId} 
          isPlaying={isPlaying} 
          onPlaySong={onPlaySong} 
        />

        <div className="flex-1">
          <h2 className="text-3xl font-bold text-white mb-8">Recently Played</h2>
          <div className="flex flex-col gap-3">
            {displaySongs.length > 0 ? (
                displaySongs.map((song, index) => {
                const isCurrent = currentSongId === song.id;
                return (
                    <div 
                    key={song.id} 
                    onClick={() => onPlaySong(song, displaySongs)}
                    className={`group grid grid-cols-[auto_1fr_auto] md:grid-cols-[auto_2fr_1fr_auto_auto] items-center gap-6 p-4 rounded-2xl transition-all cursor-pointer hover:bg-white/5 ${isCurrent ? 'bg-white/10' : ''}`}
                    >
                    <div className="w-10 flex justify-center text-slate-500 font-medium text-base">
                        {isCurrent && isPlaying ? (
                            <PlayingIndicator />
                        ) : (
                            <span className="group-hover:hidden">{String(index + 1).padStart(2, '0')}</span>
                        )}
                        <Play className={`w-4 h-4 text-white fill-current hidden ${isCurrent && isPlaying ? '' : 'group-hover:block'}`} />
                    </div>

                    <div className="flex items-center gap-5 overflow-hidden">
                        <img src={song.coverUrl} alt={song.title} className="w-14 h-14 rounded-xl object-cover flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform" />
                        <div className="min-w-0">
                        <h4 className={`font-bold text-base truncate ${isCurrent ? 'text-[#818cf8]' : 'text-white'}`}>{song.title}</h4>
                        <p className="text-slate-500 text-sm truncate mt-0.5">{song.artist}</p>
                        </div>
                    </div>

                    <div className="hidden md:block text-slate-500 text-base font-medium truncate">
                        {song.album}
                    </div>

                    <div className="hidden md:block text-slate-500 text-base font-medium tabular-nums">
                        {song.duration}
                    </div>

                    <div className="flex items-center gap-2">
                        <button 
                        onClick={(e) => { e.stopPropagation(); onToggleFavorite(song.id); }}
                        className={`p-3 rounded-full hover:bg-white/10 ${song.isFavorite ? 'text-rose-500' : 'text-slate-500 hover:text-rose-500'}`}
                        >
                        <Heart className={`w-5 h-5 ${song.isFavorite ? 'fill-current' : ''}`} />
                        </button>
                    </div>
                    </div>
                );
                })
            ) : (
                <div className="text-slate-500 py-10 italic">Start listening to songs to see your history here!</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
