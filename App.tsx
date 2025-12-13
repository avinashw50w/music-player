import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import PlayerBar from './components/PlayerBar';
import Home from './pages/Home';
import Search from './pages/Search';
import Browse from './pages/Browse';
import Favorites from './pages/Favorites';
import { AlbumDetails } from './pages/AlbumDetails';
import { ArtistDetails } from './pages/ArtistDetails';
import { PlaylistDetails } from './pages/PlaylistDetails';
import { SongDetails } from './pages/SongDetails';
import FullList from './pages/FullList';
import { CreatePlaylistModal } from './components/CreatePlaylistModal';
import { AddToPlaylistModal } from './components/AddToPlaylistModal';
import { Visualizer } from './components/Visualizer';
import * as api from './services/api';
import { Song, Album, Artist, Playlist, NavigationState, ViewType } from './types';
import { AlertCircle, RefreshCw, X } from 'lucide-react';
import Wavis from './lib/waviz';

const App: React.FC = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const [navState, setNavState] = useState<NavigationState>({ view: 'home' });
  const [navHistory, setNavHistory] = useState<NavigationState[]>([]);
  
  const [playbackQueue, setPlaybackQueue] = useState<Song[]>([]);
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
  const [showAddToPlaylistModal, setShowAddToPlaylistModal] = useState(false);
  const [songToAdd, setSongToAdd] = useState<Song | null>(null);
  
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showVisualizer, setShowVisualizer] = useState(false);
  const [activeVisualizer, setActiveVisualizer] = useState('bars');

  // Scanning State (Lifted from Browse)
  const [scanStatus, setScanStatus] = useState<api.ScanStatus | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wavisRef = useRef<Wavis | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  // Global SSE Listener
  useEffect(() => {
    const eventSource = new EventSource('/api/library/events');

    eventSource.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            const { type, payload } = data;

            // Scanning Events
            if (type === 'scan:status' || type === 'scan:progress' || type === 'scan:start') {
                setScanStatus(payload);
                setIsScanning(payload.isScanning);
            } else if (type === 'scan:complete') {
                setScanStatus(payload);
                setIsScanning(false);
                if (payload.totalFound > 0) {
                     fetchData(); // Refresh all data when scan completes
                }
            } else if (type === 'scan:error') {
                setScanStatus(payload);
                setIsScanning(false);
                setScanError(payload.error || 'Unknown error occurred');
            }
            
            // Song Events
            else if (type === 'song:update') {
                setSongs(prev => {
                    const exists = prev.find(s => s.id === payload.id);
                    if (exists) {
                        return prev.map(s => s.id === payload.id ? payload : s);
                    }
                    return [payload, ...prev]; // Handle new song creation via update if not strictly separate
                });
                if (currentSong?.id === payload.id) {
                    setCurrentSong(payload);
                }
            } else if (type === 'song:delete') {
                setSongs(prev => prev.filter(s => s.id !== payload.id));
                if (currentSong?.id === payload.id) {
                    // Optionally stop playback or skip to next
                    setIsPlaying(false);
                    setCurrentSong(null);
                }
            }

            // Album Events
            else if (type === 'album:update') {
                 setAlbums(prev => {
                    const exists = prev.find(a => a.id === payload.id);
                    if (exists) return prev.map(a => a.id === payload.id ? payload : a);
                    return [payload, ...prev];
                });
            } else if (type === 'album:delete') {
                setAlbums(prev => prev.filter(a => a.id !== payload.id));
            }

            // Artist Events
            else if (type === 'artist:update') {
                 setArtists(prev => {
                    const exists = prev.find(a => a.id === payload.id);
                    if (exists) return prev.map(a => a.id === payload.id ? payload : a);
                    return [payload, ...prev];
                });
            }

            // Playlist Events
            else if (type === 'playlist:create') {
                setPlaylists(prev => [payload, ...prev]);
            } else if (type === 'playlist:update') {
                setPlaylists(prev => prev.map(p => p.id === payload.id ? payload : p));
            } else if (type === 'playlist:delete') {
                setPlaylists(prev => prev.filter(p => p.id !== payload.id));
            }

        } catch (e) {
            console.error('Error parsing SSE message', e);
        }
    };

    eventSource.onerror = (e) => {
         // console.debug('SSE connection error', e);
    };

    return () => {
        eventSource.close();
    };
  }, [currentSong]); // re-bind only if currentSong changes (rarely needed actually, but safe)

  // Initialize Wavis once audioRef is available
  useEffect(() => {
      if (audioRef.current && !wavisRef.current) {
          wavisRef.current = new Wavis(audioRef.current);
      }
  }, []);

  // Keyboard Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        // Don't trigger if user is typing
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) return;

        if (e.code === 'Space') {
            e.preventDefault();
            setIsPlaying(prev => !prev);
        } else if (e.code === 'ArrowRight') {
            if (e.metaKey || e.ctrlKey) {
                handleNext();
            } else if (audioRef.current) {
                audioRef.current.currentTime = Math.min(audioRef.current.duration || 0, audioRef.current.currentTime + 5);
            }
        } else if (e.code === 'ArrowLeft') {
            if (e.metaKey || e.ctrlKey) {
                 handlePrev();
            } else if (audioRef.current) {
                audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 5);
            }
        } else if (e.code === 'ArrowUp') {
            e.preventDefault();
            setVolume(prev => Math.min(1, prev + 0.1));
        } else if (e.code === 'ArrowDown') {
            e.preventDefault();
            setVolume(prev => Math.max(0, prev - 0.1));
        } else if (e.code === 'Escape') {
            if (showVisualizer) setShowVisualizer(false);
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSong, playbackQueue, showVisualizer]); 

  useEffect(() => {
    if (audioRef.current) {
        if (isPlaying) {
            // Reset error on play attempt
            setPlaybackError(null);
            audioRef.current.play().catch(e => {
                console.error("Playback failed", e);
                // Note: Standard play interruptions shouldn't trigger full UI errors usually,
                // but real load errors are handled by onError on the audio tag.
            });
        } else {
            audioRef.current.pause();
        }
    }
  }, [isPlaying, currentSong]);

  useEffect(() => {
    if (audioRef.current) {
        audioRef.current.volume = volume;
    }
  }, [volume]);

  const fetchData = async () => {
    try {
      const [s, a, ar, p] = await Promise.all([
        api.getSongs(),
        api.getAlbums(),
        api.getArtists(),
        api.getPlaylists()
      ]);
      setSongs(s);
      setAlbums(a);
      setArtists(ar);
      setPlaylists(p);
    } catch (err) {
      console.error("Failed to fetch initial data", err);
    }
  };

  const handleNavigate = (view: ViewType, entityId?: string) => {
    setNavHistory(prev => [...prev, navState]);
    setNavState({ view, entityId });
    // Close visualizer on navigation
    setShowVisualizer(false);
  };

  const handleBack = () => {
    if (navHistory.length > 0) {
        const prev = navHistory[navHistory.length - 1];
        setNavHistory(prevHist => prevHist.slice(0, -1));
        setNavState(prev);
    } else {
        setNavState({ view: 'home' });
    }
  };

  const handlePlaySong = (song: Song, context?: Song[]) => {
    if (currentSong?.id === song.id) {
        setIsPlaying(!isPlaying);
    } else {
        setCurrentSong(song);
        setIsPlaying(true);
        setPlaybackError(null); // Clear previous errors
        if (context) {
            setPlaybackQueue(context);
        } else {
            setPlaybackQueue([song]); // Fallback
        }
    }
  };

  const handlePlayContext = (context: Song[]) => {
      if (context.length > 0) {
          handlePlaySong(context[0], context);
      }
  };

  const handleNext = () => {
      if (!currentSong || playbackQueue.length === 0) return;
      const idx = playbackQueue.findIndex(s => s.id === currentSong.id);
      if (idx !== -1 && idx < playbackQueue.length - 1) {
          handlePlaySong(playbackQueue[idx + 1], playbackQueue);
      }
  };

  const handlePrev = () => {
    if (!currentSong || playbackQueue.length === 0) return;
    const idx = playbackQueue.findIndex(s => s.id === currentSong.id);
    if (idx > 0) {
        handlePlaySong(playbackQueue[idx - 1], playbackQueue);
    } else {
        if (audioRef.current) audioRef.current.currentTime = 0;
    }
  };

  const handleTimeUpdate = () => {
      if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
          setDuration(audioRef.current.duration || 0);
      }
  };

  const handleSeek = (time: number) => {
      if (audioRef.current) {
          audioRef.current.currentTime = time;
          setCurrentTime(time);
      }
  };

  const handleSongEnded = () => {
      handleNext();
  };

  const handleAudioError = () => {
      if (currentSong) {
          setIsPlaying(false);
          setPlaybackError(`File not found: "${currentSong.title}". It may have been moved.`);
      }
  };

  const handleRefreshLibrary = async () => {
      setIsRefreshing(true);
      try {
          const res = await api.refreshLibrary();
          setPlaybackError(null);
          await fetchData();
          // Optional: You could show a success toast here
      } catch (e) {
          console.error(e);
      } finally {
          setIsRefreshing(false);
      }
  };

  const handleToggleFavorite = async (id: string) => {
    // Optimistic updates are nice, but since we have SSE, 
    // we can rely on the server broadcast OR keep optimistic updates for instant feedback.
    // I'll keep optimistic updates because SSE might have a tiny delay.
    
    // Check Songs
    const song = songs.find(s => s.id === id);
    if (song) {
        // Optimistic update
        const newStatus = !song.isFavorite;
        setSongs(prevSongs => prevSongs.map(s => s.id === id ? { ...s, isFavorite: newStatus } : s));
        if (currentSong?.id === id) {
          setCurrentSong(prev => prev ? { ...prev, isFavorite: newStatus } : null);
        }
        try { await api.toggleSongFavorite(id); } catch (err) { console.warn(err); }
        return;
    }

    // Check Albums
    const album = albums.find(a => a.id === id);
    if (album) {
        const newStatus = !album.isFavorite;
        setAlbums(prev => prev.map(a => a.id === id ? { ...a, isFavorite: newStatus } : a));
        try { await api.toggleAlbumFavorite(id); } catch (err) { console.warn(err); }
        return;
    }

    // Check Artists
    const artist = artists.find(a => a.id === id);
    if (artist) {
        const newStatus = !artist.isFavorite;
        setArtists(prev => prev.map(a => a.id === id ? { ...a, isFavorite: newStatus } : a));
        try { await api.toggleArtistFavorite(id); } catch (err) { console.warn(err); }
        return;
    }
    
    // Check Playlists
    const playlist = playlists.find(p => p.id === id);
    if (playlist) {
        const newStatus = !playlist.isFavorite;
        setPlaylists(prev => prev.map(p => p.id === id ? { ...p, isFavorite: newStatus } : p));
        try { await api.togglePlaylistFavorite(id); } catch (err) { console.warn(err); }
        return;
    }
  };

  const handleCreatePlaylist = async (name: string) => {
      try {
          // SSE will update the list, but we need the ID immediately for song adding
          const newPlaylist = await api.createPlaylist(name);
          // Manually update for immediate interaction if needed, though SSE is fast
          // setPlaylists([newPlaylist, ...playlists]); 
          
          setShowCreatePlaylistModal(false);
          // If we were adding a song, add it now to the new playlist
          if (songToAdd) {
             handleConfirmAddToPlaylist(newPlaylist.id);
          }
      } catch (e) {
          console.error(e);
      }
  };

  const handleAddToPlaylist = (song: Song) => {
      if (playlists.length === 0) {
          setSongToAdd(song);
          setShowCreatePlaylistModal(true);
      } else {
          setSongToAdd(song);
          setShowAddToPlaylistModal(true);
      }
  };

  const handleConfirmAddToPlaylist = async (playlistId: string) => {
      if (!songToAdd) return;
      try {
          await api.addSongToPlaylist(playlistId, songToAdd.id);
          // SSE handles the state update for the playlist song count/Ids
          setShowAddToPlaylistModal(false);
          setSongToAdd(null);
      } catch (e) {
          console.error(e);
      }
  };

  const handleImportSongs = (newSongs: Song[]) => {
      // Logic handled by SSE mostly, but direct file upload might return songs immediately
      // We can merge them if they aren't already there
      setSongs(prev => {
          const existingIds = new Set(prev.map(s => s.id));
          const uniqueNew = newSongs.filter(s => !existingIds.has(s.id));
          return [...uniqueNew, ...prev];
      });
  };

  // State update handlers for detail views (mostly redundant now with SSE, but kept for immediate feedback if used)
  const onUpdateSong = (updated: Song) => {
      setSongs(prev => prev.map(s => s.id === updated.id ? updated : s));
      if (currentSong?.id === updated.id) setCurrentSong(updated);
  };
  
  const onUpdateAlbum = (updated: Album) => {
      setAlbums(prev => prev.map(a => a.id === updated.id ? updated : a));
  };
  
  const onUpdateArtist = (updated: Artist) => {
      setArtists(prev => prev.map(a => a.id === updated.id ? updated : a));
  };

  const renderView = () => {
    switch (navState.view) {
      case 'home':
        return <Home 
            recentSongs={songs.slice(0, 10)} 
            onPlaySong={handlePlaySong} 
            currentSongId={currentSong?.id}
            isPlaying={isPlaying}
            onNavigate={handleNavigate}
            onToggleFavorite={handleToggleFavorite}
        />;
      case 'search':
        return <Search 
            songs={songs} 
            albums={albums} 
            artists={artists} 
            onPlaySong={handlePlaySong}
            currentSongId={currentSong?.id}
            isPlaying={isPlaying}
            onNavigate={handleNavigate}
            onToggleFavorite={handleToggleFavorite}
        />;
      case 'browse':
        return <Browse 
            onImportSongs={handleImportSongs}
            onNavigate={handleNavigate}
            onPlaySong={handlePlaySong}
            currentSongId={currentSong?.id}
            isPlaying={isPlaying}
            albums={albums}
            artists={artists}
            songs={songs}
            playlists={playlists}
            // Pass scan state
            scanStatus={scanStatus}
            isScanning={isScanning}
            scanError={scanError}
            setScanError={setScanError}
            setIsScanning={setIsScanning}
        />;
      case 'favorites':
        return <Favorites 
            songs={songs} 
            albums={albums} 
            artists={artists} 
            playlists={playlists}
            onPlaySong={handlePlaySong}
            currentSongId={currentSong?.id}
            isPlaying={isPlaying}
            onNavigate={handleNavigate}
            onToggleFavorite={handleToggleFavorite}
            onAddToPlaylist={handleAddToPlaylist}
        />;
      case 'album_details':
        return <AlbumDetails 
            id={navState.entityId} 
            onBack={handleBack} 
            songs={songs} 
            albums={albums}
            currentSongId={currentSong?.id}
            isPlaying={isPlaying}
            onPlaySong={handlePlaySong}
            onPlayContext={handlePlayContext}
            onToggleFavorite={handleToggleFavorite}
            onAddToPlaylist={handleAddToPlaylist}
            onUpdateAlbum={onUpdateAlbum}
            onNavigate={handleNavigate}
        />;
      case 'artist_details':
        return <ArtistDetails 
            id={navState.entityId} 
            onBack={handleBack} 
            songs={songs} 
            albums={albums}
            artists={artists}
            currentSongId={currentSong?.id}
            isPlaying={isPlaying}
            onPlaySong={handlePlaySong}
            onPlayContext={handlePlayContext}
            onToggleFavorite={handleToggleFavorite}
            onAddToPlaylist={handleAddToPlaylist}
            onUpdateArtist={onUpdateArtist}
            onNavigate={handleNavigate}
        />;
      case 'playlist_details':
        const playlist = playlists.find(p => p.id === navState.entityId);
        return <PlaylistDetails 
            playlist={playlist}
            songs={songs}
            onBack={handleBack}
            currentSongId={currentSong?.id}
            isPlaying={isPlaying}
            onPlaySong={handlePlaySong}
            onPlayContext={handlePlayContext}
            onToggleFavorite={handleToggleFavorite}
            onDeletePlaylist={async (id: string) => {
                await api.deletePlaylist(id);
                // SSE handles state update
                handleBack();
            }}
            onRenamePlaylist={async (id: string, name: string) => {
                await api.renamePlaylist(id, name);
                // SSE handles state update
            }}
            onRemoveSong={async (pid: string, sid: string) => {
                await api.removeSongFromPlaylist(pid, sid);
                // SSE handles state update
            }}
            onReorderSongs={async (pid: string, from: number, to: number) => {
                 // Optimistic update for UI smoothness (reordering feels laggy otherwise)
                 const pl = playlists.find(p => p.id === pid);
                 if (pl) {
                     const newOrder = [...pl.songIds];
                     const [moved] = newOrder.splice(from, 1);
                     newOrder.splice(to, 0, moved);
                     setPlaylists(prev => prev.map(p => p.id === pid ? { ...p, songIds: newOrder } : p));
                     
                     await api.reorderPlaylistSongs(pid, newOrder);
                 }
            }}
            onNavigate={handleNavigate}
            onAddToPlaylist={handleAddToPlaylist}
        />;
      case 'song_details':
         return <SongDetails
            id={navState.entityId}
            onBack={handleBack}
            songs={songs}
            currentSongId={currentSong?.id}
            isPlaying={isPlaying}
            onPlaySong={handlePlaySong}
            onPlayContext={handlePlayContext}
            onToggleFavorite={handleToggleFavorite}
            onAddToPlaylist={handleAddToPlaylist}
            onUpdateSong={onUpdateSong}
            onNavigate={handleNavigate}
         />;
       case 'all_songs':
          return <FullList type="songs" items={songs} onBack={handleBack} onNavigate={handleNavigate} onPlaySong={handlePlaySong} currentSongId={currentSong?.id} isPlaying={isPlaying} onToggleFavorite={handleToggleFavorite} onAddToPlaylist={handleAddToPlaylist} />;
       case 'all_albums':
          return <FullList type="albums" items={albums} onBack={handleBack} onNavigate={handleNavigate} />;
       case 'all_artists':
          return <FullList type="artists" items={artists} onBack={handleBack} onNavigate={handleNavigate} />;
       case 'all_playlists':
          return <FullList type="playlists" items={playlists} onBack={handleBack} onNavigate={handleNavigate} />;
      default:
        return <div>View not found</div>;
    }
  };

  return (
    <div className="flex h-screen flex-col text-white font-sans overflow-hidden">
      {/* Background Ambience */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-900/20 blur-[150px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-900/20 blur-[150px]"></div>
      </div>

      {/* Error Toast */}
      {playbackError && (
          <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-bottom-2 fade-in">
              <div className="bg-rose-500/10 backdrop-blur-md border border-rose-500/20 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4">
                  <div className="p-2 bg-rose-500 rounded-full">
                      <AlertCircle className="w-5 h-5 fill-current" />
                  </div>
                  <div className="flex flex-col">
                      <span className="font-bold text-sm">Playback Failed</span>
                      <span className="text-xs text-rose-200">{playbackError}</span>
                  </div>
                  <div className="h-8 w-[1px] bg-white/10 mx-2"></div>
                  <button 
                      onClick={handleRefreshLibrary}
                      disabled={isRefreshing}
                      className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-wait"
                  >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                      {isRefreshing ? 'Refreshing...' : 'Refresh Library'}
                  </button>
                  <button 
                      onClick={() => setPlaybackError(null)}
                      className="p-2 hover:bg-white/10 rounded-full transition-colors ml-1"
                  >
                      <X className="w-4 h-4" />
                  </button>
              </div>
          </div>
      )}

      <div className="flex-1 flex overflow-hidden relative z-10">
        <Sidebar 
            currentView={navState.view} 
            onNavigate={(view) => handleNavigate(view)} 
            onPlaylistClick={(id) => handleNavigate('playlist_details', id)}
            onCreatePlaylist={() => setShowCreatePlaylistModal(true)}
            playlists={playlists}
        />
        
        <main className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar scroll-smooth">
            {renderView()}
        </main>
      </div>

      <div className="z-[100] w-full flex-shrink-0">
        <PlayerBar 
            currentSong={currentSong}
            isPlaying={isPlaying}
            onPlayPause={() => setIsPlaying(!isPlaying)}
            onNext={handleNext}
            onPrev={handlePrev}
            onToggleFavorite={handleToggleFavorite}
            onNavigate={handleNavigate}
            currentTime={currentTime}
            duration={duration}
            onSeek={handleSeek}
            volume={volume}
            onVolumeChange={setVolume}
            onExpand={() => setShowVisualizer(true)}
        />
      </div>
      
      <audio 
        ref={audioRef} 
        src={currentSong?.fileUrl} 
        crossOrigin="anonymous"
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleSongEnded}
        onError={handleAudioError}
      />

      {showVisualizer && currentSong && wavisRef.current && (
          <Visualizer 
              currentSong={currentSong}
              isPlaying={isPlaying}
              onClose={() => setShowVisualizer(false)}
              wavis={wavisRef.current}
              onPlayPause={() => setIsPlaying(!isPlaying)}
              onNext={handleNext}
              onPrev={handlePrev}
              currentTime={currentTime}
              duration={duration}
              onSeek={handleSeek}
              activeVisualizer={activeVisualizer}
              onVisualizerChange={setActiveVisualizer}
          />
      )}

      {showCreatePlaylistModal && (
        <CreatePlaylistModal 
            onClose={() => setShowCreatePlaylistModal(false)}
            onCreate={handleCreatePlaylist}
        />
      )}

      {showAddToPlaylistModal && songToAdd && (
        <AddToPlaylistModal
            song={songToAdd}
            playlists={playlists}
            onClose={() => { setShowAddToPlaylistModal(false); setSongToAdd(null); }}
            onSelect={handleConfirmAddToPlaylist}
            onCreateNew={() => { setShowAddToPlaylistModal(false); setShowCreatePlaylistModal(true); }}
        />
      )}
    </div>
  );
};

export default App;