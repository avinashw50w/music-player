
import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, X, TrendingUp, Clock, Disc, Mic2, Music } from 'lucide-react';
import { Song, Album, Artist } from '../types';
import * as api from '../services/api';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface SearchProps {
  songs: Song[];
  albums: Album[];
  artists: Artist[];
  onPlaySong: (song: Song, context?: Song[]) => void;
  currentSongId?: string;
  isPlaying: boolean;
  onToggleFavorite: (id: string) => void;
}

const Search: React.FC<SearchProps> = ({ onPlaySong }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  
  const [searchTerm, setSearchTerm] = useState(query);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const navigate = useNavigate();
  
  // Local state for search results
  const [results, setResults] = useState<{ songs: Song[], albums: Album[], artists: Artist[] }>({
      songs: [],
      albums: [],
      artists: []
  });
  const [isSearching, setIsSearching] = useState(false);

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
        setRecentSearches([]);
    }
  }, []);

  // Update URL when searchTerm changes (optional, but good for linking)
  // If we update URL on every keystroke it might be too much, but keeping it in sync is good for reload.
  // Instead, we just use the local state for searching and only set URL if needed or initial load.
  // Actually, standard pattern is input -> local state -> debounce -> search.
  
  // Update local state if URL changes
  useEffect(() => {
      setSearchTerm(query);
  }, [query]);

  // Server-side search debounce
  useEffect(() => {
      const delayDebounceFn = setTimeout(async () => {
          if (searchTerm.trim()) {
              setIsSearching(true);
              // Update URL without reloading to reflect current search
              setSearchParams({ q: searchTerm }, { replace: true });
              
              try {
                  const data = await api.search(searchTerm);
                  setResults(data);
              } catch (e) {
                  console.error("Search failed", e);
              } finally {
                  setIsSearching(false);
              }
          } else {
              setResults({ songs: [], albums: [], artists: [] });
              setSearchParams({}, { replace: true });
          }
      }, 500);

      return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, setSearchParams]);

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
            
            {isSearching && (
                <div className="flex justify-center py-10">
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}

            {!isSearching && (
                <>
                {/* Artists Results */}
                {results.artists.length > 0 && (
                <div>
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><Mic2 className="w-6 h-6 text-indigo-400"/> Artists</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {results.artists.map(artist => (
                        <div 
                            key={artist.id}
                            onClick={() => { addToRecent(artist.name); navigate(`/artist/${artist.id}`); }}
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
                {results.albums.length > 0 && (
                <div>
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><Disc className="w-6 h-6 text-indigo-400"/> Albums</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {results.albums.map(album => (
                        <div 
                            key={album.id}
                            onClick={() => { addToRecent(album.title); navigate(`/album/${album.id}`); }}
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
                {results.songs.length > 0 && (
                <div>
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><Music className="w-6 h-6 text-indigo-400"/> Songs</h2>
                    <div className="bg-white/5 rounded-3xl overflow-hidden border border-white/5">
                    {results.songs.map(song => (
                        <div 
                        key={song.id}
                        onClick={() => { addToRecent(song.title); onPlaySong(song, results.songs); }}
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

                {results.songs.length === 0 && results.albums.length === 0 && results.artists.length === 0 && (
                <div className="text-center text-slate-500 py-20 text-xl">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                    <SearchIcon className="w-8 h-8 opacity-50" />
                    </div>
                    No results found for "{searchTerm}"
                </div>
                )}
                </>
            )}
          </div>
        ) : (
          /* Default State */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Recent Searches */}
            <div className="lg:col-span-12 space-y-6">
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
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;
