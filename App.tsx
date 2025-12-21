
import React, { useState, useLayoutEffect, useMemo, useRef, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import PlayerBar from './components/PlayerBar';
import Home from './pages/Home';
import Search from './pages/Search';
import Browse from './pages/Browse';
import Favorites from './pages/Favorites';
import Settings from './pages/Settings';
import { AlbumDetails } from './pages/AlbumDetails';
import { ArtistDetails } from './pages/ArtistDetails';
import { PlaylistDetails } from './pages/PlaylistDetails';
import { SongDetails } from './pages/SongDetails';
import FullList from './pages/FullList';
import { CreatePlaylistModal } from './components/CreatePlaylistModal';
import { AddToPlaylistModal } from './components/AddToPlaylistModal';
import { Visualizer } from './components/Visualizer';
import * as api from './services/api';
import { Song } from './types';
import { useLibrary } from './hooks/useLibrary';
import { useAudioPlayer } from './hooks/useAudioPlayer';

const App: React.FC = () => {
  const location = useLocation();
  const scrollPositions = useRef<Record<string, number>>({});

  // --- Data & Logic Hooks ---
  const library = useLibrary();
  const player = useAudioPlayer(library.addToHistory);

  // --- UI State ---
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
  const [showAddToPlaylistModal, setShowAddToPlaylistModal] = useState(false);
  const [songToAdd, setSongToAdd] = useState<Song | null>(null);
  const [showVisualizer, setShowVisualizer] = useState(false);

  // --- Scroll Restoration ---
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useLayoutEffect(() => {
    const key = location.key;
    const savedPosition = scrollPositions.current[key];

    if (savedPosition !== undefined) {
      window.scrollTo({ top: savedPosition, behavior: 'instant' });
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }

    const saveScrollPosition = () => {
      scrollPositions.current[key] = window.scrollY;
    };

    window.addEventListener('scroll', saveScrollPosition, { passive: true });
    return () => {
        window.removeEventListener('scroll', saveScrollPosition);
    };
  }, [location.key]);

  // --- Wrapper Handler for Song Updates ---
  // Ensures that updates propagate to both the Library list AND the current Player state (including Queue)
  const handleUpdateSong = useCallback((updatedSong: Song) => {
      library.onUpdateSong(updatedSong);
      player.updateQueueSong(updatedSong);
  }, [library, player]);

  // --- Handle Add To Playlist (Open Modal) ---
  const handleAddToPlaylist = useCallback((song: Song) => {
      setSongToAdd(song);
      setShowAddToPlaylistModal(true);
  }, []);

  // --- Handle Favorite Toggle (Wrapper with Optimistic Update) ---
  const handleToggleFavorite = useCallback((id: string, targetType?: 'song' | 'album' | 'artist' | 'playlist') => {
      // Optimistic update for player queue
      if (!targetType || targetType === 'song') {
          player.toggleQueueFavorite(id);
      }
      library.handleToggleFavorite(id, targetType);
  }, [player, library]); // Depend on player object directly to ensure fresh state

  // --- Sync Player State with Real-time Library Events (e.g. Favorites toggle) ---
  useEffect(() => {
      if (library.lastEvent?.type === 'song:update') {
          const updated = library.lastEvent.payload as Song;
          // Sync update to playback queue so next/prev has fresh data
          player.updateQueueSong(updated);
      }
  }, [library.lastEvent, player]);

  // --- Layout ---
  const MainContent = useMemo(() => (
    <>
      <div className="w-72 h-screen sticky top-0 z-30 flex-shrink-0 hidden lg:block">
        <Sidebar onCreatePlaylist={() => setShowCreatePlaylistModal(true)} playlists={library.playlists} />
      </div>
      <main className="flex-1 min-w-0 pb-32">
            <Routes>
                <Route path="/" element={<Home recentSongs={library.recentlyPlayed} recentlyAdded={library.songs} onPlaySong={player.handlePlaySong} currentSongId={player.currentSong?.id} isPlaying={player.isPlaying} onToggleFavorite={handleToggleFavorite} />} />
                <Route path="/search" element={<Search songs={library.songs} albums={library.albums} artists={library.artists} onPlaySong={player.handlePlaySong} currentSongId={player.currentSong?.id} isPlaying={player.isPlaying} onToggleFavorite={handleToggleFavorite} />} />
                <Route path="/browse" element={<Browse onImportSongs={library.setSongs} onPlaySong={player.handlePlaySong} currentSongId={player.currentSong?.id} isPlaying={player.isPlaying} albums={library.albums} artists={library.artists} songs={library.songs} playlists={library.playlists} scanStatus={library.scanStatus} isScanning={library.isScanning} scanError={library.scanError} setScanError={library.setScanError} setIsScanning={library.setIsScanning} />} />
                <Route path="/favorites" element={<Favorites onPlaySong={player.handlePlaySong} currentSongId={player.currentSong?.id} isPlaying={player.isPlaying} onToggleFavorite={handleToggleFavorite} onAddToPlaylist={handleAddToPlaylist} />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/album/:id" element={<AlbumDetails currentSongId={player.currentSong?.id} isPlaying={player.isPlaying} onPlaySong={player.handlePlaySong} onPlayContext={player.handlePlayContext} onToggleFavorite={handleToggleFavorite} onAddToPlaylist={handleAddToPlaylist} onUpdateAlbum={library.onUpdateAlbum} lastEvent={library.lastEvent} />} />
                <Route path="/artist/:id" element={<ArtistDetails currentSongId={player.currentSong?.id} isPlaying={player.isPlaying} onPlaySong={player.handlePlaySong} onPlayContext={player.handlePlayContext} onToggleFavorite={handleToggleFavorite} onAddToPlaylist={handleAddToPlaylist} onUpdateArtist={library.onUpdateArtist} lastEvent={library.lastEvent} />} />
                <Route path="/playlist/:id" element={<PlaylistDetails currentSongId={player.currentSong?.id} isPlaying={player.isPlaying} onPlaySong={player.handlePlaySong} onPlayContext={player.handlePlayContext} onToggleFavorite={handleToggleFavorite} onAddToPlaylist={handleAddToPlaylist} onDeletePlaylist={library.deletePlaylist} onRenamePlaylist={api.renamePlaylist} onRemoveSong={api.removeSongFromPlaylist} onReorderSongs={api.reorderPlaylistSongs} lastEvent={library.lastEvent} />} />
                <Route path="/song/:id" element={<SongDetails songs={library.songs} albums={library.albums} artists={library.artists} currentSongId={player.currentSong?.id} isPlaying={player.isPlaying} onPlaySong={player.handlePlaySong} onPlayContext={player.handlePlayContext} onToggleFavorite={handleToggleFavorite} onAddToPlaylist={handleAddToPlaylist} onUpdateSong={handleUpdateSong} />} />
                <Route path="/library/:type" element={
                    <FullList 
                        songs={library.songs} albums={library.albums} artists={library.artists} playlists={library.playlists}
                        isLoadingMap={library.isLoading} onPlaySong={player.handlePlaySong} 
                        currentSongId={player.currentSong?.id} isPlaying={player.isPlaying} 
                        onToggleFavorite={handleToggleFavorite} onAddToPlaylist={handleAddToPlaylist}
                        initialSearchQuery={library.listQueries.songs || library.listQueries.albums || library.listQueries.artists}
                        hasMoreMap={library.hasMore}
                        onLoadMoreSongs={library.handleLoadMoreSongs}
                        onLoadMoreAlbums={library.handleLoadMoreAlbums}
                        onLoadMoreArtists={library.handleLoadMoreArtists}
                        onSearchGlobal={library.handleListSearch}
                    />
                } />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
      </main>
    </>
  ), [
    library, player, handleUpdateSong, handleAddToPlaylist, handleToggleFavorite
  ]);

  return (
    <div className="flex min-h-screen text-white font-sans relative">
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-900/20 blur-[150px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-900/20 blur-[150px]"></div>
      </div>
      {MainContent}
      <div className="z-[100] w-full fixed bottom-0 left-0">
        <PlayerBar 
            currentSong={player.currentSong} isPlaying={player.isPlaying} onPlayPause={() => player.setIsPlaying(!player.isPlaying)}
            onNext={player.handleNext} onPrev={player.handlePrev} onToggleFavorite={handleToggleFavorite}
            onAddToPlaylist={handleAddToPlaylist} currentTime={player.currentTime} duration={player.duration} onSeek={player.handleSeek}
            volume={player.volume} onVolumeChange={player.setVolume} onExpand={() => setShowVisualizer(true)}
            isShuffle={player.isShuffle} repeatMode={player.repeatMode} onToggleShuffle={() => player.setIsShuffle(!player.isShuffle)} onToggleRepeat={player.handleToggleRepeat}
        />
      </div>
      <audio 
        ref={player.audioRef} 
        src={player.currentSong?.fileUrl} 
        crossOrigin="anonymous" 
        onTimeUpdate={player.handleTimeUpdate} 
        onLoadedMetadata={player.handleLoadedMetadata}
        onDurationChange={player.handleLoadedMetadata}
        onEnded={player.handleNext} 
      />
      {showVisualizer && player.currentSong && player.wavisRef.current && (
          <Visualizer 
            currentSong={player.currentSong} isPlaying={player.isPlaying} onClose={() => setShowVisualizer(false)} 
            wavis={player.wavisRef.current} onPlayPause={() => player.setIsPlaying(!player.isPlaying)} 
            onNext={player.handleNext} onPrev={player.handlePrev} currentTime={player.currentTime} 
            duration={player.duration} onSeek={player.handleSeek} activeVisualizer={player.activeVisualizer} 
            onVisualizerChange={player.setActiveVisualizer} onUpdateSong={handleUpdateSong} 
          />
      )}
      {showCreatePlaylistModal && (
        <CreatePlaylistModal 
            onClose={() => setShowCreatePlaylistModal(false)} 
            onCreate={async (n) => { 
                const p = await api.createPlaylist(n); 
                // Check if already added by SSE to avoid duplication
                library.setPlaylists(prev => prev.some(pl => pl.id === p.id) ? prev : [p, ...prev]); 
                setShowCreatePlaylistModal(false); 
            }} 
        />
      )}
      {showAddToPlaylistModal && songToAdd && <AddToPlaylistModal song={songToAdd} playlists={library.playlists} onClose={() => { setShowAddToPlaylistModal(false); setSongToAdd(null); }} onSelect={async (pid) => { await api.addSongToPlaylist(pid, songToAdd.id); setShowAddToPlaylistModal(false); }} onCreateNew={() => { setShowAddToPlaylistModal(false); setShowCreatePlaylistModal(true); }} />}
    </div>
  );
};

export default App;
