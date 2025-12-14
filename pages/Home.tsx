
import React, { useState, useEffect, useMemo } from 'react';
import { Song } from '../types';
import { Heart, Play, Disc, Music, Mic2 } from 'lucide-react';
import PlayingIndicator from '../components/PlayingIndicator';
import { useNavigate } from 'react-router-dom';

interface HomeProps {
  recentSongs: Song[];
  onPlaySong: (song: Song, context?: Song[]) => void;
  currentSongId?: string;
  isPlaying: boolean;
  onToggleFavorite: (id: string) => void;
}

const Home: React.FC<HomeProps> = ({ recentSongs, onPlaySong, currentSongId, isPlaying, onToggleFavorite }) => {
  const navigate = useNavigate();

  // Keep a snapshot of the IDs to preserve order during the session
  const [frozenIds, setFrozenIds] = useState<string[]>([]);

  useEffect(() => {
    // Only initialize if we have no IDs and we received data
    // This handles the initial load from localStorage
    if (frozenIds.length === 0 && recentSongs.length > 0) {
      setFrozenIds(recentSongs.map(s => s.id));
    }
  }, [recentSongs, frozenIds.length]);

  const displaySongs = useMemo(() => {
    // If we haven't frozen any IDs yet, just show the incoming props
    if (frozenIds.length === 0) return recentSongs;
    
    // Map frozen IDs to current song objects to get updates (like favorites)
    // while maintaining the frozen order
    return frozenIds
      .map(id => recentSongs.find(s => s.id === id))
      .filter((s): s is Song => !!s);
  }, [frozenIds, recentSongs]);

  return (
    <div className="p-10 pb-10">
      <div className="flex items-center justify-between mb-10">
        <h1 className="text-4xl font-bold text-white tracking-tight">Discover</h1>
      </div>
      
      {/* Hero Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
        {/* Card 1: Albums */}
        <div 
          onClick={() => navigate('/library/albums')}
          className="h-64 rounded-[2.5rem] bg-gradient-to-br from-[#4f46e5] to-[#3b82f6] p-8 relative overflow-hidden group cursor-pointer transition-transform hover:scale-[1.02] shadow-xl shadow-indigo-900/20 isolate"
          style={{ WebkitMaskImage: '-webkit-radial-gradient(white, black)' }}
        >
          <div className="relative z-10 flex flex-col h-full justify-between pointer-events-none">
            <div className="bg-white/20 backdrop-blur-md w-fit px-4 py-1.5 rounded-full text-sm font-semibold text-white flex items-center gap-2">
              <Disc className="w-4 h-4" /> Library
            </div>
            <div>
              <h2 className="text-4xl font-bold text-white mb-2">Albums</h2>
              <p className="text-indigo-100 text-base font-medium opacity-80">Explore all albums</p>
            </div>
          </div>
          <img 
            src="https://images.unsplash.com/photo-1505672984986-b7c468c7a134?q=80&w=400" 
            className="absolute bottom-0 right-0 w-56 h-64 object-cover object-center opacity-60 mix-blend-overlay group-hover:scale-110 transition-transform duration-500 ease-out" 
            style={{ maskImage: 'linear-gradient(to right, transparent, black)' }}
            alt="Albums" 
          />
        </div>

        {/* Card 2: Songs */}
        <div 
          onClick={() => navigate('/library/songs')}
          className="h-64 rounded-[2.5rem] bg-gradient-to-br from-[#f59e0b] to-[#fbbf24] p-8 relative overflow-hidden group cursor-pointer transition-transform hover:scale-[1.02] shadow-xl shadow-amber-900/20 isolate"
          style={{ WebkitMaskImage: '-webkit-radial-gradient(white, black)' }}
        >
          <div className="relative z-10 flex flex-col h-full justify-between pointer-events-none">
             <div className="bg-white/20 backdrop-blur-md w-fit px-4 py-1.5 rounded-full text-sm font-semibold text-white flex items-center gap-2">
               <Music className="w-4 h-4" /> Library
             </div>
            <div>
              <h2 className="text-4xl font-bold text-white mb-2">Songs</h2>
              <p className="text-amber-100 text-base font-medium opacity-80">Discover new tracks</p>
            </div>
          </div>
           <img 
            src="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80" 
            className="absolute bottom-0 right-0 w-56 h-64 object-cover object-center opacity-60 mix-blend-overlay group-hover:scale-110 transition-transform duration-500 ease-out"
            style={{ maskImage: 'linear-gradient(to right, transparent, black)' }}
            alt="Songs" 
          />
        </div>

        {/* Card 3: Artists */}
        <div 
          onClick={() => navigate('/library/artists')}
          className="h-64 rounded-[2.5rem] bg-gradient-to-br from-[#f43f5e] to-[#fb7185] p-8 relative overflow-hidden group cursor-pointer transition-transform hover:scale-[1.02] shadow-xl shadow-rose-900/20 isolate"
          style={{ WebkitMaskImage: '-webkit-radial-gradient(white, black)' }}
        >
          <div className="relative z-10 flex flex-col h-full justify-between pointer-events-none">
             <div className="bg-white/20 backdrop-blur-md w-fit px-4 py-1.5 rounded-full text-sm font-semibold text-white flex items-center gap-2">
               <Mic2 className="w-4 h-4" /> Library
             </div>
            <div>
              <h2 className="text-4xl font-bold text-white mb-2">Artists</h2>
              <p className="text-rose-100 text-base font-medium opacity-80">Find your favorites</p>
            </div>
          </div>
           <img 
            src="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80" 
            className="absolute bottom-0 right-0 w-56 h-64 object-cover object-center opacity-60 mix-blend-overlay group-hover:scale-110 transition-transform duration-500 ease-out"
            style={{ maskImage: 'linear-gradient(to right, transparent, black)' }}
            alt="Artists" 
          />
        </div>
      </div>

      <div className="flex flex-col gap-10">
        <div className="flex-1">
          <h2 className="text-3xl font-bold text-white mb-8">Recently Played</h2>
          <div className="flex flex-col gap-3">
            {displaySongs.map((song, index) => {
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
                    <img src={song.coverUrl} alt={song.title} className="w-14 h-14 rounded-xl object-cover flex-shrink-0 shadow-sm" />
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
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
