
import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Play, ListMusic, Search, X } from 'lucide-react';
import { Song, Album, Artist, Playlist } from '../types';
import { SongListItem } from '../components/SongListItem';
import { BackButton } from '../components/BackButton';
import { useNavigate, useParams } from 'react-router-dom';

interface FullListProps {
  onPlaySong?: (song: Song, context?: Song[]) => void;
  currentSongId?: string;
  isPlaying?: boolean;
  onToggleFavorite?: (id: string) => void;
  onAddToPlaylist?: (song: Song) => void;
  
  // Handlers for dynamic types
  onLoadMoreSongs?: () => void;
  onLoadMoreAlbums?: () => void;
  onLoadMoreArtists?: () => void;
  hasMoreMap?: { songs: boolean; albums: boolean; artists: boolean };
  onSearchGlobal?: (type: 'songs' | 'albums' | 'artists', query: string) => void;

  // Data
  songs: Song[];
  albums: Album[];
  artists: Artist[];
  playlists: Playlist[];
  isLoadingMap: { songs: boolean; albums: boolean; artists: boolean; playlists: boolean };
  initialSearchQuery?: string;
}

const SkeletonRow = () => (
  <div className="flex items-center gap-4 px-4 py-3 rounded-xl border border-transparent">
     <div className="w-10 h-6 bg-white/5 rounded animate-pulse" />
     <div className="w-12 h-12 rounded-lg bg-white/10 animate-pulse flex-shrink-0" />
     <div className="flex-1 space-y-2">
        <div className="h-4 w-48 bg-white/10 rounded animate-pulse" />
        <div className="h-3 w-32 bg-white/5 rounded animate-pulse" />
     </div>
     <div className="w-12 h-4 bg-white/5 rounded animate-pulse" />
  </div>
);

const SkeletonCard = () => (
  <div className="bg-white/5 p-5 rounded-[2rem] border border-white/5">
    <div className="w-full aspect-square rounded-2xl bg-white/10 mb-4 animate-pulse" />
    <div className="h-5 w-3/4 bg-white/10 rounded mb-2 animate-pulse" />
    <div className="h-4 w-1/2 bg-white/5 rounded animate-pulse" />
  </div>
);

const FullList: React.FC<FullListProps> = ({ 
    onPlaySong, currentSongId, isPlaying, onToggleFavorite, onAddToPlaylist,
    onLoadMoreSongs, onLoadMoreAlbums, onLoadMoreArtists, hasMoreMap, onSearchGlobal,
    songs, albums, artists, playlists, isLoadingMap, initialSearchQuery = ''
}) => {
  const { type } = useParams<{ type: string }>(); // 'songs', 'albums', 'artists', 'playlists'
  const navigate = useNavigate();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const previousQueryRef = useRef(initialSearchQuery);
  
  const [isObserverActive, setIsObserverActive] = useState(false);
  useEffect(() => {
      const timer = setTimeout(() => setIsObserverActive(true), 800);
      return () => clearTimeout(timer);
  }, []);

  // Resolve items and loading state based on type
  let items: any[] = [];
  let isLoading = false;
  let activeHasMore = false;

  if (type === 'songs') { 
    items = songs; 
    isLoading = isLoadingMap.songs; 
    activeHasMore = hasMoreMap?.songs || false;
  }
  else if (type === 'albums') { 
    items = albums; 
    isLoading = isLoadingMap.albums; 
    activeHasMore = hasMoreMap?.albums || false;
  }
  else if (type === 'artists') { 
    items = artists; 
    isLoading = isLoadingMap.artists; 
    activeHasMore = hasMoreMap?.artists || false;
  }
  else if (type === 'playlists') { 
    items = playlists; 
    isLoading = isLoadingMap.playlists; 
    activeHasMore = false; // No pagination for local playlists usually
  }

  // Debounce Search
  useEffect(() => {
    if (searchQuery === previousQueryRef.current) return;
    previousQueryRef.current = searchQuery;

    if (onSearchGlobal && type && type !== 'playlists') {
        const timer = setTimeout(() => {
            onSearchGlobal(type as any, searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }
  }, [searchQuery, type, onSearchGlobal]); 

  // Stable Load More Wrapper
  const handleLoadMoreInternal = useCallback(() => {
    if (type === 'songs') onLoadMoreSongs?.();
    else if (type === 'albums') onLoadMoreAlbums?.();
    else if (type === 'artists') onLoadMoreArtists?.();
  }, [type, onLoadMoreSongs, onLoadMoreAlbums, onLoadMoreArtists]);

  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
      const target = entries[0];
      if (target.isIntersecting && activeHasMore && !isLoading) {
          const scrollBottom = window.innerHeight + window.scrollY;
          const docHeight = document.documentElement.scrollHeight;
          if (scrollBottom >= docHeight - 1200) {
              handleLoadMoreInternal();
          }
      }
  }, [activeHasMore, isLoading, handleLoadMoreInternal]); 

  useEffect(() => {
      if (!isObserverActive) return;

      const option = {
          root: null,
          rootMargin: "200px",
          threshold: 0
      };
      observerRef.current = new IntersectionObserver(handleObserver, option);
      if (loadMoreRef.current) observerRef.current.observe(loadMoreRef.current);
      
      return () => {
          if (observerRef.current) observerRef.current.disconnect();
      }
  }, [handleObserver, isObserverActive, items.length]); 

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
    if (isLoading && items.length === 0) {
        if (type === 'songs') {
            return (
                <div className="space-y-1">
                    {[...Array(12)].map((_, i) => <SkeletonRow key={i} />)}
                </div>
            );
        } else {
            return (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {[...Array(10)].map((_, i) => <SkeletonCard key={i} />)}
                </div>
            );
        }
    }

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
                onClick={() => navigate(`/album/${album.id}`)}
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
                onClick={() => navigate(`/artist/${artist.id}`)}
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
                    onClick={() => navigate(`/playlist/${playlist.id}`)}
                    className="bg-white/5 hover:bg-white/10 p-5 rounded-[2rem] cursor-pointer transition-colors border border-white/5 group"
                >
                    <div className="relative mb-4 overflow-hidden rounded-2xl bg-[#2c2c2e] aspect-square flex items-center justify-center shadow-md">
                        {playlist.coverUrl ? (
                            <img src={playlist.coverUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={playlist.name} />
                        ) : (
                            <ListMusic className="w-20 h-20 text-slate-500 group-hover:scale-105 transition-transform duration-500" />
                        )}
                    </div>
                    <h4 className="text-white font-bold text-lg truncate">{playlist.name}</h4>
                    <p className="text-slate-500 text-sm truncate">{playlist.songIds.length} Songs</p>
                </div>
            ))}
            </div>
        );

      default:
        return <div>Invalid list type</div>;
    }
  };

  return (
    <div className="min-h-screen pb-10">
        <div className="sticky top-0 z-40 backdrop-blur-xl border-b border-white/5 px-10 py-6 mb-8 shadow-xl shadow-black/20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <BackButton />
                    <h1 className="text-4xl font-bold text-white tracking-tight">{getTitle()}</h1>
                </div>
                
                {onSearchGlobal && type !== 'playlists' && (
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input 
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={`Search ${type}...`}
                            className="w-full bg-white/10 border border-white/10 rounded-full py-3 pl-12 pr-10 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:bg-white/10 transition-all shadow-inner"
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
        </div>

        <div className="px-10">
            {renderContent()}
            
            <div ref={loadMoreRef} className="h-40 w-full flex items-center justify-center">
                {activeHasMore && items.length > 0 && (
                    <div className="flex flex-col items-center gap-4">
                         <div className="flex gap-1">
                            <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce"></div>
                         </div>
                         <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Loading more {type}</span>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default FullList;
