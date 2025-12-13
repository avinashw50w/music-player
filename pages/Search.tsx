import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, X, TrendingUp, Clock, Disc, Mic2, Music } from 'lucide-react';
import { Song, Album, Artist, NavigationState } from '../types';

interface SearchProps {
  songs: Song[];
  albums: Album[];
  artists: Artist[];
  onPlaySong: (song: Song) => void;
  currentSongId?: string;
  isPlaying: boolean;
  onNavigate: (view: NavigationState['view'], id?: string) => void;
  onToggleFavorite: (id: string) => void;
}

const Search: React.FC<SearchProps> = ({ songs, albums, artists, onPlaySong, onNavigate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('recentSearches');
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse recent searches");
      }
    } else {
        // Default initial searches
        setRecentSearches(['Lagu Untuk Matahari', 'Save Your Tears', 'Tulus', 'Monokrom']);
    }
  }, []);

  const addToRecent = (term: string) => {
    const updated = [term, ...recentSearches.filter(t => t !== term)].slice(0, 10);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const removeRecent = (e: React.MouseEvent, term: string) => {
    e.stopPropagation();
    const updated = recentSearches.filter(t => t !== term);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };
  
  // Search Logic
  const filteredSongs = songs.filter(s => 
    s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.genre.some(g => g.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredAlbums = albums.filter(a => 
    a.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.artist.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredArtists = artists.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const categories = [
    { title: 'Pop', color: 'from-pink-500 to-rose-500', img: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300' },
    { title: 'R&B', color: 'from-purple-500 to-indigo-500', img: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=300' },
    { title: 'Jazz', color: 'from-blue-500 to-cyan-500', img: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=300' },
    { title: 'Rock', color: 'from-red-500 to-orange-500', img: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=300' },
    { title: 'Indie', color: 'from-emerald-500 to-teal-500', img: 'https://images.unsplash.com/photo-1759415548138-4754287fb43f?w=300' },
    { title: 'Hip Hop', color: 'from-amber-500 to-yellow-500', img: 'https://images.unsplash.com/photo-1602306022553-2bd3c9928f0d?w=300' },
  ];

  return (
    <div className="p-10 pb-10">
      <div className="max-w-6xl mx-auto">
        {/* Search Bar */}
        <div className="relative mb-12">
          <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 w-6 h-6 z-10" />
          <input
            type="text"
            placeholder="Search songs, albums, artists, genres..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 backdrop-blur-md text-white rounded-full py-5 pl-16 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-500 text-xl font-medium shadow-xl border border-white/10"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-6 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        {searchTerm ? (
          /* Search Results */
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2">
            
            {/* Artists Results */}
            {filteredArtists.length > 0 && (
               <div>
                  <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><Mic2 className="w-6 h-6 text-indigo-400"/> Artists</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {filteredArtists.map(artist => (
                      <div 
                        key={artist.id}
                        onClick={() => { addToRecent(artist.name); onNavigate('artist_details', artist.id); }}
                        className="bg-white/5 hover:bg-white/10 p-5 rounded-3xl flex flex-col items-center text-center cursor-pointer transition-colors border border-white/5"
                      >
                         <img src={artist.avatarUrl} alt={artist.name} className="w-32 h-32 rounded-full object-cover mb-4 shadow-lg" />
                         <h4 className="text-white font-bold text-lg truncate w-full">{artist.name}</h4>
                         <p className="text-slate-500 text-sm">Artist</p>
                      </div>
                    ))}
                  </div>
               </div>
            )}

            {/* Albums Results */}
            {filteredAlbums.length > 0 && (
               <div>
                  <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><Disc className="w-6 h-6 text-indigo-400"/> Albums</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {filteredAlbums.map(album => (
                      <div 
                        key={album.id}
                        onClick={() => { addToRecent(album.title); onNavigate('album_details', album.id); }}
                        className="bg-white/5 hover:bg-white/10 p-5 rounded-3xl cursor-pointer transition-colors border border-white/5 group"
                      >
                         <img src={album.coverUrl} alt={album.title} className="w-full aspect-square rounded-2xl object-cover mb-4 shadow-lg group-hover:scale-105 transition-transform" />
                         <h4 className="text-white font-bold text-lg truncate">{album.title}</h4>
                         <p className="text-slate-500 text-sm truncate">{album.artist}</p>
                      </div>
                    ))}
                  </div>
               </div>
            )}

            {/* Songs Results */}
            {filteredSongs.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><Music className="w-6 h-6 text-indigo-400"/> Songs</h2>
                <div className="bg-white/5 rounded-3xl overflow-hidden border border-white/5">
                  {filteredSongs.map(song => (
                    <div 
                      key={song.id}
                      onClick={() => { addToRecent(song.title); onPlaySong(song); }}
                      className="flex items-center gap-5 p-4 hover:bg-white/10 cursor-pointer border-b border-white/5 last:border-0 transition-colors"
                    >
                      <img src={song.coverUrl} className="w-14 h-14 rounded-xl object-cover" alt={song.title} />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-bold text-lg truncate">{song.title}</h4>
                        <p className="text-slate-400 text-base truncate">{song.artist}</p>
                      </div>
                      <div className="hidden md:block text-slate-500 text-sm font-medium">{song.album}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {filteredSongs.length === 0 && filteredAlbums.length === 0 && filteredArtists.length === 0 && (
              <div className="text-center text-slate-500 py-20 text-xl">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                  <SearchIcon className="w-8 h-8 opacity-50" />
                </div>
                No results found for "{searchTerm}"
              </div>
            )}
          </div>
        ) : (
          /* Default State */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Recent Searches */}
            <div className="lg:col-span-4 space-y-6">
               <h3 className="text-xl font-bold text-white flex items-center gap-3">
                 <Clock className="w-5 h-5 text-slate-400" /> Recent Searches
               </h3>
               <div className="space-y-2">
                 {recentSearches.length > 0 ? recentSearches.map((term, i) => (
                   <div 
                    key={i} 
                    onClick={() => setSearchTerm(term)}
                    className="flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 cursor-pointer text-slate-300 hover:text-white transition-colors group"
                   >
                     <span className="text-lg">{term}</span>
                     <button onClick={(e) => removeRecent(e, term)}>
                        <X className="w-5 h-5 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-white" />
                     </button>
                   </div>
                 )) : (
                    <div className="text-slate-500 p-2">No recent searches</div>
                 )}
               </div>
            </div>

            {/* Trending Categories */}
            <div className="lg:col-span-8 space-y-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-indigo-400" /> Trending Categories
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                {categories.map((cat, i) => (
                  <div key={i} onClick={() => setSearchTerm(cat.title)} className="relative h-40 rounded-3xl overflow-hidden cursor-pointer group shadow-lg">
                    <div className={`absolute inset-0 bg-gradient-to-br ${cat.color} opacity-80 group-hover:opacity-90 transition-opacity z-10`}></div>
                    <img src={cat.img} className="absolute inset-0 w-full h-full object-cover grayscale mix-blend-overlay" alt={cat.title} />
                    <span className="absolute bottom-4 left-5 text-white font-bold text-xl z-20">{cat.title}</span>
                    <img src={cat.img} className="absolute -bottom-5 -right-5 w-20 h-20 rounded-xl rotate-12 shadow-lg z-20 group-hover:scale-110 group-hover:-translate-y-1 transition-transform duration-300" alt={cat.title} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;