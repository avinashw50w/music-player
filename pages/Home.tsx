import React from 'react';
import { Song, NavigationState } from '../types';
import { Heart, Play } from 'lucide-react';
import PlayingIndicator from '../components/PlayingIndicator';

interface HomeProps {
  recentSongs: Song[];
  onPlaySong: (song: Song) => void;
  currentSongId?: string;
  isPlaying: boolean;
  onNavigate: (view: NavigationState['view'], id?: string) => void;
  onToggleFavorite: (id: string) => void;
}

const Home: React.FC<HomeProps> = ({ recentSongs, onPlaySong, currentSongId, isPlaying, onNavigate, onToggleFavorite }) => {
  return (
    <div className="p-10 pb-10">
      <div className="flex items-center justify-between mb-10">
        <h1 className="text-4xl font-bold text-white tracking-tight">Discover</h1>
      </div>
      
      {/* Hero Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
        {/* Card 1: Jazz Holic */}
        <div 
          onClick={() => onNavigate('album_details', 'al1')}
          className="h-64 rounded-[2.5rem] bg-gradient-to-br from-[#4f46e5] to-[#3b82f6] p-8 relative overflow-hidden group cursor-pointer transition-transform hover:scale-[1.02] shadow-xl shadow-indigo-900/20"
        >
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="bg-white/20 backdrop-blur-md w-fit px-4 py-1.5 rounded-full text-sm font-semibold text-white">New Album</div>
            <div>
              <h2 className="text-4xl font-bold text-white mb-2">Jazz Holic</h2>
              <p className="text-indigo-100 text-base font-medium opacity-80">15 Tracks</p>
            </div>
          </div>
          <img 
            src="https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=400&q=80" 
            className="absolute bottom-0 right-0 w-56 h-64 object-cover object-center mask-image-linear-gradient opacity-90 grayscale-[0.2] group-hover:scale-110 transition-transform duration-500" 
            style={{ maskImage: 'linear-gradient(to right, transparent, black)' }}
            alt="Jazz" 
          />
        </div>

        {/* Card 2: Chillin Hits */}
        <div 
          onClick={() => onNavigate('album_details', 'al2')}
          className="h-64 rounded-[2.5rem] bg-gradient-to-br from-[#f59e0b] to-[#fbbf24] p-8 relative overflow-hidden group cursor-pointer transition-transform hover:scale-[1.02] shadow-xl shadow-amber-900/20"
        >
          <div className="relative z-10 flex flex-col h-full justify-between">
             <div className="bg-white/20 backdrop-blur-md w-fit px-4 py-1.5 rounded-full text-sm font-semibold text-white">Trending</div>
            <div>
              <h2 className="text-4xl font-bold text-white mb-2">Chillin Hits</h2>
              <p className="text-amber-100 text-base font-medium opacity-80">176 Tracks</p>
            </div>
          </div>
           <img 
            src="https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=400&q=80" 
            className="absolute bottom-0 right-0 w-56 h-64 object-cover object-center opacity-90 grayscale-[0.2] group-hover:scale-110 transition-transform duration-500"
            style={{ maskImage: 'linear-gradient(to right, transparent, black)' }}
            alt="Chill" 
          />
        </div>

        {/* Card 3: Good Times */}
        <div 
          onClick={() => onNavigate('album_details', 'al3')}
          className="h-64 rounded-[2.5rem] bg-gradient-to-br from-[#f43f5e] to-[#fb7185] p-8 relative overflow-hidden group cursor-pointer transition-transform hover:scale-[1.02] shadow-xl shadow-rose-900/20"
        >
          <div className="relative z-10 flex flex-col h-full justify-between">
             <div className="bg-white/20 backdrop-blur-md w-fit px-4 py-1.5 rounded-full text-sm font-semibold text-white">Editors Choice</div>
            <div>
              <h2 className="text-4xl font-bold text-white mb-2">Good Times</h2>
              <p className="text-rose-100 text-base font-medium opacity-80">98 Tracks</p>
            </div>
          </div>
           <img 
            src="https://images.unsplash.com/photo-1514525253440-b393452e8d26?w=400&q=80" 
            className="absolute bottom-0 right-0 w-56 h-64 object-cover object-center opacity-90 grayscale-[0.2] group-hover:scale-110 transition-transform duration-500"
            style={{ maskImage: 'linear-gradient(to right, transparent, black)' }}
            alt="Happy" 
          />
        </div>
      </div>

      <div className="flex flex-col gap-10">
        <div className="flex-1">
          <h2 className="text-3xl font-bold text-white mb-8">Recently Played</h2>
          <div className="flex flex-col gap-3">
            {recentSongs.map((song, index) => {
              const isCurrent = currentSongId === song.id;
              return (
                <div 
                  key={song.id} 
                  onClick={() => onPlaySong(song)}
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