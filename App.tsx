import React, { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import PlayerBar from './components/PlayerBar';
import Home from './pages/Home';
import Search from './pages/Search';
import Browse from './pages/Browse';
import Favorites from './pages/Favorites';
import { AlbumDetails, ArtistDetails, PlaylistDetails, SongDetails } from './pages/DetailViews';
import { NavigationState, Song, Playlist, Album, Artist } from './types';
import { ListMusic, Plus, Loader2 } from 'lucide-react';
import * as api from './services/api';

const App: React.FC = () => {
  // Application Data State
  const [songs, setSongs] = useState<Song[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Navigation State
  const [navState, setNavState] = useState<NavigationState>({ view: 'home' });
  const [history, setHistory] = useState<NavigationState[]>([]);

  // Player State
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  // Queue State: Tracks the current list of songs being played
  const [queue, setQueue] = useState<Song[]>([]);

  // Modal State
  const [isCreatePlaylistModalOpen, setCreatePlaylistModalOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");

  // Add to Playlist State
  const [isAddToPlaylistModalOpen, setAddToPlaylistModalOpen] = useState(false);
  const [songToAdd, setSongToAdd] = useState<Song | null>(null);

  // Load initial data from API
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const [songsData, albumsData, artistsData, playlistsData] = await Promise.all([
          api.getSongs(),
          api.getAlbums(),
          api.getArtists(),
          api.getPlaylists()
        ]);

        setSongs(songsData);
        setAlbums(albumsData);
        setArtists(artistsData);
        setPlaylists(playlistsData.map(p => ({ ...p, songIds: p.songIds || [] })));
        setQueue(songsData);

        if (songsData.length > 0) {
          setCurrentSong(songsData[0]);
        }

        setError(null);
      } catch (err) {
        console.error('Failed to load data:', err);
        setError('Failed to connect to server. Ensure the backend is running.');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // Audio Playback Logic
  useEffect(() => {
    if (currentSong && audioRef.current) {
      // Use the fileUrl directly. If it is relative (starts with /), the Vite proxy will handle it.
      // If it is absolute (starts with http), it works as is.
      const rawUrl = currentSong.fileUrl || '';
      
      // We reconstruct the absolute URL for the comparison check to prevent unnecessary reloads
      // because audioRef.current.src always returns an absolute URL.
      const url = rawUrl.startsWith('/') 
        ? `${window.location.origin}${rawUrl}` 
        : rawUrl;

      if (url && audioRef.current.src !== url) {
        audioRef.current.src = url;
        audioRef.current.load();
        
        if (isPlaying) {
          audioRef.current.play().catch(e => {
            console.error("Playback failed:", e);
            setIsPlaying(false);
          });
        }
      }
    }
  }, [currentSong]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => {
          console.error("Playback failed:", e);
          setIsPlaying(false);
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  // Sync volume state with audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleNext = useCallback(() => {
    if (!currentSong) return;
    const currentIndex = queue.findIndex(s => s.id === currentSong.id);
    if (currentIndex === -1 && queue.length > 0) {
      setCurrentSong(queue[0]);
      setIsPlaying(true);
      return;
    }
    const nextIndex = (currentIndex + 1) % queue.length;
    setCurrentSong(queue[nextIndex]);
    setIsPlaying(true);
  }, [currentSong, queue]);

  const handlePrev = useCallback(() => {
    if (!currentSong) return;
    const currentIndex = queue.findIndex(s => s.id === currentSong.id);
    if (currentIndex === -1 && queue.length > 0) {
      setCurrentSong(queue[0]);
      setIsPlaying(true);
      return;
    }
    const prevIndex = (currentIndex - 1 + queue.length) % queue.length;
    setCurrentSong(queue[prevIndex]);
    setIsPlaying(true);
  }, [currentSong, queue]);

  const handleEnded = () => {
    handleNext();
  };

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent handling if user is typing in an input
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          if (currentSong) {
            setIsPlaying(prev => !prev);
          }
          break;
        case 'ArrowLeft':
            // Seek backward 5s
            if (audioRef.current) {
                const newTime = Math.max(0, audioRef.current.currentTime - 5);
                handleSeek(newTime);
            }
          break;
        case 'ArrowRight':
             // Seek forward 5s
            if (audioRef.current) {
                const newTime = Math.min(duration, audioRef.current.currentTime + 5);
                handleSeek(newTime);
            }
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(prev => Math.min(1, prev + 0.05));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(prev => Math.max(0, prev - 0.05));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSong, duration]);


  const handleVolumeChange = (vol: number) => {
    setVolume(vol);
  };

  const handleNavigate = (view: NavigationState['view'], entityId?: string) => {
    if (navState.view === view && navState.entityId === entityId) return;

    setHistory(prev => [...prev, navState]);
    setNavState({ view, entityId });
    const mainContent = document.getElementById('main-content');
    if (mainContent) mainContent.scrollTop = 0;
  };

  const handleBack = () => {
    setHistory(prev => {
      if (prev.length === 0) {
        setNavState({ view: 'home' });
        return prev;
      }
      const newHistory = [...prev];
      const previousState = newHistory.pop();
      if (previousState) {
        setNavState(previousState);
      } else {
        setNavState({ view: 'home' });
      }
      return newHistory;
    });
  };

  const handleSongPlay = (song: Song, contextSongs?: Song[]) => {
    if (contextSongs) {
      setQueue(contextSongs);
    }

    if (currentSong?.id === song.id) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentSong(song);
      setIsPlaying(true);
    }
  };

  const handlePlayContext = (contextSongs: Song[]) => {
    if (contextSongs.length > 0) {
      setQueue(contextSongs);
      setCurrentSong(contextSongs[0]);
      setIsPlaying(true);
    }
  };

  const handleToggleFavorite = async (id: string) => {
    // Optimistic UI update
    const previousSongs = [...songs];
    const targetSong = songs.find(s => s.id === id);
    const newStatus = !targetSong?.isFavorite;

    setSongs(prevSongs =>
      prevSongs.map(song =>
        song.id === id ? { ...song, isFavorite: newStatus } : song
      )
    );
    if (currentSong?.id === id) {
      setCurrentSong(prev => prev ? { ...prev, isFavorite: newStatus } : null);
    }

    try {
      await api.toggleSongFavorite(id);
    } catch (err) {
      console.warn('Failed to toggle favorite on server:', err);
    }
  };

  // --- Entity Updates ---
  const handleUpdateSong = (updatedSong: Song) => {
    setSongs(prev => prev.map(s => s.id === updatedSong.id ? updatedSong : s));
    if (currentSong?.id === updatedSong.id) {
      setCurrentSong(updatedSong);
    }
  };

  const handleUpdateAlbum = (updatedAlbum: Album) => {
    setAlbums(prev => prev.map(a => a.id === updatedAlbum.id ? updatedAlbum : a));
  };

  const handleUpdateArtist = (updatedArtist: Artist) => {
    setArtists(prev => prev.map(a => a.id === updatedArtist.id ? updatedArtist : a));
  };


  // --- Import Music ---
  const handleImportSongs = (newSongs: Song[]) => {
    setSongs(prev => [...prev, ...newSongs]);
    setQueue(prev => [...prev, ...newSongs]);
  };

  // --- Playlist Management ---

  const handleCreatePlaylist = () => {
    setNewPlaylistName("New Playlist");
    setCreatePlaylistModalOpen(true);
  };

  const confirmCreatePlaylist = async () => {
    if (newPlaylistName.trim()) {
      // Create local temporary ID for optimistic UI
      const tempId = `temp-${Date.now()}`;
      const newPlaylist: Playlist = {
        id: tempId,
        name: newPlaylistName.trim(),
        songIds: [],
        songCount: 0
      };

      setPlaylists(prev => [...prev, newPlaylist]);
      
      try {
        const created = await api.createPlaylist(newPlaylistName.trim());
        // Replace temp playlist with real one
        setPlaylists(prev => prev.map(p => p.id === tempId ? { ...created, songIds: [] } : p));
        
        // Handle pending song addition with the real ID
        if (isAddToPlaylistModalOpen && songToAdd) {
            await api.addSongToPlaylist(created.id, songToAdd.id);
            setPlaylists(prev => prev.map(p => {
               if (p.id === created.id) {
                   // Ensure we update both IDs and count
                   const updatedIds = [...(p.songIds || []), songToAdd.id];
                   return { ...p, songIds: updatedIds, songCount: updatedIds.length };
               }
               return p;
            }));
            setAddToPlaylistModalOpen(false);
            setSongToAdd(null);
            handleNavigate('playlist_details', created.id);
        } else {
             handleNavigate('playlist_details', created.id);
        }
      } catch (err) {
        console.error('Failed to create playlist:', err);
        // Revert on failure for now as we removed fallback mode
        setPlaylists(prev => prev.filter(p => p.id !== tempId));
        alert("Failed to create playlist. Please try again.");
      }
    }
    setCreatePlaylistModalOpen(false);
  };

  const handleDeletePlaylist = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this playlist?")) {
      const prevPlaylists = [...playlists];
      setPlaylists(prev => prev.filter(p => p.id !== id));
      if (navState.view === 'playlist_details' && navState.entityId === id) {
        handleNavigate('home');
      }
      try {
        await api.deletePlaylist(id);
      } catch (err) {
        console.error('Failed to delete playlist:', err);
        setPlaylists(prevPlaylists); // Revert
      }
    }
  };

  const handleRenamePlaylist = async (id: string, newName: string) => {
    const prevPlaylists = [...playlists];
    setPlaylists(prev => prev.map(p => p.id === id ? { ...p, name: newName } : p));
    try {
      await api.renamePlaylist(id, newName);
    } catch (err) {
      console.error('Failed to rename playlist:', err);
      setPlaylists(prevPlaylists); // Revert
    }
  };

  const handleRemoveSongFromPlaylist = async (playlistId: string, songId: string) => {
    const prevPlaylists = [...playlists];
    setPlaylists(prev => prev.map(p => {
        if (p.id !== playlistId) return p;
        const updatedIds = p.songIds.filter(id => id !== songId);
        return {
          ...p,
          songIds: updatedIds,
          songCount: updatedIds.length
        };
      }));
    try {
      await api.removeSongFromPlaylist(playlistId, songId);
    } catch (err) {
      console.error('Failed to remove song from playlist:', err);
      setPlaylists(prevPlaylists); // Revert
    }
  };

  const handleReorderPlaylist = async (playlistId: string, fromIndex: number, toIndex: number) => {
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return;

    const newSongIds = [...playlist.songIds];
    const [movedItem] = newSongIds.splice(fromIndex, 1);
    newSongIds.splice(toIndex, 0, movedItem);

    // Optimistic update
    setPlaylists(prev => prev.map(p =>
      p.id === playlistId ? { ...p, songIds: newSongIds } : p
    ));

    try {
      await api.reorderPlaylistSongs(playlistId, newSongIds);
    } catch (err) {
      console.error('Failed to reorder playlist:', err);
    }
  };

  const handleAddToPlaylist = (song: Song) => {
    setSongToAdd(song);
    setAddToPlaylistModalOpen(true);
  };

  const confirmAddToPlaylist = async (playlistId: string) => {
    if (songToAdd) {
      const playlist = playlists.find(p => p.id === playlistId);
      if (playlist?.songIds.includes(songToAdd.id)) {
        setAddToPlaylistModalOpen(false);
        setSongToAdd(null);
        return;
      }

      const prevPlaylists = JSON.parse(JSON.stringify(playlists));
      
      // Optimistic update: Ensure we create a new array ref for songIds to trigger re-renders
      setPlaylists(prev => prev.map(pl => {
          if (pl.id === playlistId) {
            const updatedIds = [...(pl.songIds || []), songToAdd.id];
            return { ...pl, songIds: updatedIds, songCount: updatedIds.length };
          }
          return pl;
      }));
      setAddToPlaylistModalOpen(false);

      try {
        await api.addSongToPlaylist(playlistId, songToAdd.id);
      } catch (err) {
        console.error('Failed to add song to playlist:', err);
        setPlaylists(prevPlaylists);
      }
      setSongToAdd(null);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-black text-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
          <p className="text-lg text-slate-400">Loading your music library...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-black text-white">
        <div className="flex flex-col items-center gap-4 max-w-md text-center p-8">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold">Connection Error</h2>
          <p className="text-slate-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-full font-bold transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    const commonProps = {
      onPlaySong: handleSongPlay,
      currentSongId: currentSong?.id,
      isPlaying: isPlaying,
      onNavigate: handleNavigate,
      onToggleFavorite: handleToggleFavorite,
      onAddToPlaylist: handleAddToPlaylist,
      songs: songs,
      albums: albums,
      artists: artists,
      playlists: playlists,
      onUpdateSong: handleUpdateSong,
      onUpdateAlbum: handleUpdateAlbum,
      onUpdateArtist: handleUpdateArtist,
    };

    switch (navState.view) {
      case 'home':
        return <Home recentSongs={songs} {...commonProps} />;
      case 'search':
        return <Search {...commonProps} />;
      case 'browse':
        return (
          <Browse
            onImportSongs={handleImportSongs}
            onNavigate={handleNavigate}
            onPlaySong={handleSongPlay}
            currentSongId={currentSong?.id}
            isPlaying={isPlaying}
            albums={albums}
            artists={artists}
            songs={songs}
            playlists={playlists}
          />
        );
      case 'favorites':
        return <Favorites {...commonProps} />;
      case 'album_details':
        return (
          <AlbumDetails
            id={navState.entityId}
            onBack={handleBack}
            onPlayContext={handlePlayContext}
            {...commonProps}
          />
        );
      case 'artist_details':
        return (
          <ArtistDetails
            id={navState.entityId}
            onBack={handleBack}
            onPlayContext={handlePlayContext}
            {...commonProps}
          />
        );
      case 'playlist_details':
        const playlist = playlists.find(p => p.id === navState.entityId);
        return (
          <PlaylistDetails
            playlist={playlist}
            onBack={handleBack}
            onPlayContext={handlePlayContext}
            onDeletePlaylist={handleDeletePlaylist}
            onRenamePlaylist={handleRenamePlaylist}
            onRemoveSong={handleRemoveSongFromPlaylist}
            onReorderSongs={handleReorderPlaylist}
            {...commonProps}
          />
        );
      case 'song_details':
        return (
          <SongDetails
            id={navState.entityId}
            onBack={handleBack}
            onPlayContext={handlePlayContext}
            {...commonProps}
          />
        );
      default:
        return <Home recentSongs={songs} {...commonProps} />;
    }
  };

  return (
    <div className="h-screen w-screen text-slate-100 overflow-hidden antialiased selection:bg-indigo-500/30 font-sans">
      
      {/* Audio Element */}
      <audio 
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={(e) => console.error("Audio Error:", e)}
      />

      {/* Sidebar - Fixed on desktop, z-40 to sit below PlayerBar z-50 but above content */}
      <div className="fixed left-0 top-0 bottom-0 w-72 z-40 hidden md:block">
        <Sidebar
          currentView={navState.view}
          onNavigate={(view) => handleNavigate(view)}
          onPlaylistClick={(id) => handleNavigate('playlist_details', id)}
          onCreatePlaylist={handleCreatePlaylist}
          playlists={playlists}
        />
      </div>

      {/* Main Content Area - Fixed positioning to avoid overlap logic issues */}
      <main
        id="main-content"
        className="fixed top-0 right-0 bottom-0 left-0 md:left-72 overflow-y-auto scroll-smooth z-10"
      >
        {renderContent()}
      </main>

      {/* Player Bar - Fixed at bottom, highest Z-index */}
      <div className="fixed bottom-0 left-0 right-0 h-28 z-50">
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
            onVolumeChange={handleVolumeChange}
        />
      </div>

      {/* Create Playlist Modal */}
      {isCreatePlaylistModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#1c1c1e] border border-white/10 rounded-3xl p-8 w-full max-w-lg shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
            <h3 className="text-3xl font-bold text-white mb-3">Create Playlist</h3>
            <p className="text-slate-400 mb-8 text-lg">Give your playlist a name.</p>
            <input
              autoFocus
              type="text"
              placeholder="Playlist Name"
              value={newPlaylistName}
              onChange={e => setNewPlaylistName(e.target.value)}
              className="w-full bg-black/50 text-white border border-white/10 rounded-xl px-5 py-4 mb-8 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-xl placeholder:text-slate-600"
              onKeyDown={(e) => e.key === 'Enter' && confirmCreatePlaylist()}
            />
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setCreatePlaylistModalOpen(false)}
                className="px-6 py-3 text-slate-300 hover:text-white font-medium transition-colors text-lg"
              >
                Cancel
              </button>
              <button
                onClick={confirmCreatePlaylist}
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-95 text-lg"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add To Playlist Modal */}
      {isAddToPlaylistModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#1c1c1e] border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl scale-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
            <h3 className="text-2xl font-bold text-white mb-2">Add to Playlist</h3>
            <p className="text-slate-400 mb-6">Select a playlist to add <span className="text-white font-medium">{songToAdd?.title}</span>.</p>

            <div className="flex-1 overflow-y-auto custom-scrollbar -mx-2 px-2 space-y-2 mb-6">
              <button
                onClick={() => {
                  setNewPlaylistName("New Playlist");
                  setCreatePlaylistModalOpen(true);
                }}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group text-left border border-dashed border-white/10 hover:border-indigo-500"
              >
                <div className="w-12 h-12 bg-indigo-500/20 rounded-lg flex items-center justify-center text-indigo-400 group-hover:text-white group-hover:bg-indigo-500 transition-colors">
                  <Plus className="w-6 h-6" />
                </div>
                <span className="font-bold text-white">Create New Playlist</span>
              </button>

              {playlists.map(pl => (
                <button
                  key={pl.id}
                  onClick={() => confirmAddToPlaylist(pl.id)}
                  className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-white/10 transition-colors text-left group"
                >
                  <div className="w-12 h-12 bg-[#2c2c2e] rounded-lg flex items-center justify-center text-slate-500 group-hover:text-white transition-colors">
                    <ListMusic className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white">{pl.name}</h4>
                    <p className="text-sm text-slate-500">{pl.songIds.length} songs</p>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => { setAddToPlaylistModalOpen(false); setSongToAdd(null); }}
              className="w-full py-3 text-slate-400 hover:text-white font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;