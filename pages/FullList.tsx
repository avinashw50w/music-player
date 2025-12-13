
import React, { useRef, useEffect, useCallback, useState } from 'react';
import { ArrowLeft, Play, ListMusic, Search, X } from 'lucide-react';
import { Song, Album, Artist, Playlist, NavigationState } from '../types';
import { SongListItem } from '../components/SongListItem';

interface FullListProps {
  type: 'songs' | 'albums' | 'artists' | 'playlists';
  items: Song[] | Album[] | Artist[] | Playlist[];
  onBack: () => void;
  onNavigate: (view: NavigationState['view'], id?: string) => void;
  onPlaySong?: (song: Song, context?: Song[]) => void;
  currentSongId?: string;
  isPlaying?: boolean;
  onToggleFavorite?: (id: string) => void;
  onAddToPlaylist?: (song: Song) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  onSearch?: (query: string) => void;
}

const BackButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <button
      onClick={onClick}
      className="p-3 text-slate-400 hover:text-white transition-colors hover:bg-white/10 rounded-full backdrop-blur-md"
    >
      <ArrowLeft className="w-6 h-6" />
    </button>
  );

const FullList: React.FC<FullListProps> = ({ type, items, onBack, onNavigate, onPlaySong, currentSongId, isPlaying, onToggleFavorite, onAddToPlaylist, onLoadMore, hasMore, onSearch }) => {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Use a ref for onSearch to avoid effect re-triggering when the function prop changes
  const onSearchRef = useRef(onSearch);
  
  useEffect(() => {
      onSearchRef.current = onSearch;
  }, [onSearch]);

  // Debounce Search
  useEffect(() => {
    // Only set up debounce if onSearch is provided
    if (onSearchRef.current) {
        const timer = setTimeout(() => {
            if (onSearchRef.current) onSearchRef.current(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }
  }, [searchQuery]); // Depend ONLY on searchQuery to avoid loops

  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
      const target = entries[0];
      if (target.isIntersecting && hasMore && onLoadMore) {
          onLoadMore();
      }
  }, [hasMore, onLoadMore]);

  useEffect(() => {
      const option = {
          root: null,
          rootMargin: "20px",
          threshold: 0
      };
      observerRef.current = new IntersectionObserver(handleObserver, option);
      if (loadMoreRef.current) observerRef.current.observe(loadMoreRef.current);
      
      return () => {
          if (observerRef.current) observerRef.current.disconnect();
      }
  }, [handleObserver, items.length]); 

  const getTitle = () => {
    switch(type) {
      case 'songs': return 'All Songs';
      case 'albums': return 'All Albums';
      case 'artists': return 'All Artists';
      case 'playlists': return 'All Playlists';
      default: return 'List';
    }
  };

  const renderContent = () => {
    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                <Search className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-lg">No items found</p>
            </div>
        );
    }

    switch (type) {
      case 'songs':
        const songItems = items as Song[];
        return (
          <div className="space-y-1">
            {songItems.map((song, i) => (
               <SongListItem 
                  key={`${song.id}-${i}`}
                  song={song}
                  index={i}
                  currentSongId={currentSongId}
                  isPlaying={!!isPlaying}
                  onPlay={() => onPlaySong?.(song, songItems)}
                  onNavigate={onNavigate}
                  onToggleFavorite={onToggleFavorite || (() => {})}
                  onAddToPlaylist={onAddToPlaylist || (() => {})}
               />
            ))}
          </div>
        );
      
      case 'albums':
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {(items as Album[]).map((album, i) => (
              <div 
                key={`${album.id}-${i}`}
                onClick={() => onNavigate('album_details', album.id)}
                className="bg-white/5 hover:bg-white/10 p-5 rounded-[2rem] cursor-pointer transition-colors border border-white/5 group"
              >
                <div className="overflow-hidden rounded-2xl mb-4 shadow-lg">
                   <img src={album.coverUrl} alt={album.title} className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <h4 className="text-white font-bold text-lg truncate">{album.title}</h4>
                <p className="text-slate-500 text-sm truncate">{album.artist}</p>
              </div>
            ))}
          </div>
        );

      case 'artists':
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {(items as Artist[]).map((artist, i) => (
                <div 
                key={`${artist.id}-${i}`}
                onClick={() => onNavigate('artist_details', artist.id)}
                className="bg-white/5 hover:bg-white/10 p-5 rounded-[2rem] flex flex-col items-center text-center cursor-pointer transition-colors border border-white/5 group"
                >
                    <img src={artist.avatarUrl} alt={artist.name} className="w-32 h-32 rounded-full object-cover mb-4 shadow-lg group-hover:scale-105 transition-transform" />
                    <h4 className="text-white font-bold text-lg truncate w-full">{artist.name}</h4>
                    <p className="text-slate-500 text-sm">{artist.followers} Followers</p>
                </div>
            ))}
            </div>
        );

      case 'playlists':
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {(items as Playlist[]).map((playlist) => (
                <div 
                    key={playlist.id} 
                    onClick={() => onNavigate('playlist_details', playlist.id)}
                    className="bg-white/5 hover:bg-white/10 p-5 rounded-[2rem] cursor-pointer transition-colors border border-white/5 group"
                >
                    <div className="relative mb-4 overflow-hidden rounded-2xl bg-[#2c2c2e] aspect-square flex items-center justify-center shadow-md">
                        {playlist.coverUrl ? (
                            <img src={playlist.coverUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={playlist.name} />
                        ) : (
                            <ListMusic className="w-20 h-20 text-slate-500 group-hover:scale-110 transition-transform duration-500" />
                        )}
                    </div>
                    <h4 className="text-white font-bold text-lg truncate">{playlist.name}</h4>
                    <p className="text-slate-500 text-sm truncate">{playlist.songIds.length} Songs</p>
                </div>
            ))}
            </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-10 pb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <div className="flex items-center gap-4">
                <BackButton onClick={onBack} />
                <h1 className="text-4xl font-bold text-white tracking-tight">{getTitle()}</h1>
            </div>
            
            {/* Search Input */}
            {onSearch && (
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input 
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={`Search ${type}...`}
                        className="w-full bg-white/5 border border-white/10 rounded-full py-3 pl-12 pr-10 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:bg-white/10 transition-all"
                    />
                    {searchQuery && (
                        <button 
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            )}
        </div>

        {renderContent()}
        
        <div ref={loadMoreRef} className="h-20 w-full flex items-center justify-center">
            {hasMore && items.length > 0 && (
                <div className="flex gap-1">
                    <div className="w-2 h-2 bg-slate-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-slate-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-slate-600 rounded-full animate-bounce"></div>
                </div>
            )}
        </div>
    </div>
  );
};

export default FullList;
