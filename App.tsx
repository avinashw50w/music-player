
import React, { useState, useEffect, useRef, useLayoutEffect, useCallback, useMemo } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import { Song, Album, Artist, Playlist, LibraryEvent } from './types';
import { AlertCircle, RefreshCw, X } from 'lucide-react';
import Wavis from './lib/waviz';
import { getCookie, setCookie } from './lib/cookies';

// Throttle helper variable outside component scope
let lastScanUpdateTimestamp = 0;

const App: React.FC = () => {
  const location = useLocation();
  const [songs, setSongs] = useState<Song[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  
  const [lastEvent, setLastEvent] = useState<LibraryEvent | null>(null);
  
  const [isLoading, setIsLoading] = useState({
      songs: false,
      albums: false,
      artists: false,
      playlists: false
  });

  const [recentlyPlayed, setRecentlyPlayed] = useState<Song[]>([]);

  const [hasMore, setHasMore] = useState({ songs: true, albums: true, artists: true });
  const [loadingMore, setLoadingMore] = useState({ songs: false, albums: false, artists: false });
  const [listQueries, setListQueries] = useState({ songs: '', albums: '', artists: '' });
  const PAGE_LIMIT = 20;
  
  const searchAbortControllers = useRef<{ [key: string]: AbortController }>({});
  
  const isFetching = useRef({
      playlists: false,
      songs: false,
      albums: false,
      artists: false
  });
  
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Persistent Preferences loaded from cookies
  const [volume, setVolume] = useState(() => {
    const saved = getCookie('myousic_volume');
    return saved !== '' ? parseFloat(saved) : 1;
  });
  
  const [isShuffle, setIsShuffle] = useState(() => {
    return getCookie('myousic_shuffle') === 'true';
  });

  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>(() => {
    const saved = getCookie('myousic_repeat');
    return (saved as any) || 'off';
  });

  const [activeVisualizer, setActiveVisualizer] = useState(() => {
    return getCookie('myousic_visualizer') || 'bars';
  });

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const [playbackQueue, setPlaybackQueue] = useState<Song[]>([]);
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
  const [showAddToPlaylistModal, setShowAddToPlaylistModal] = useState(false);
  const [songToAdd, setSongToAdd] = useState<Song | null>(null);
  
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showVisualizer, setShowVisualizer] = useState(false);

  const [scanStatus, setScanStatus] = useState<api.ScanStatus | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wavisRef = useRef<any>(null);

  const scrollPositions = useRef<Record<string, number>>({});

  // Sync Preferences to Cookies
  useEffect(() => { setCookie('myousic_volume', volume.toString()); }, [volume]);
  useEffect(() => { setCookie('myousic_visualizer', activeVisualizer); }, [activeVisualizer]);
  useEffect(() => { setCookie('myousic_shuffle', isShuffle.toString()); }, [isShuffle]);
  useEffect(() => { setCookie('myousic_repeat', repeatMode); }, [repeatMode]);

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

  useEffect(() => {
    try {
        const storedHistory = localStorage.getItem('recentlyPlayed');
        if (storedHistory) setRecentlyPlayed(JSON.parse(storedHistory));
    } catch (e) { console.error("Failed to load history", e); }

    if (playlists.length === 0 && !isFetching.current.playlists) {
        isFetching.current.playlists = true;
        setIsLoading(prev => ({ ...prev, playlists: true }));
        api.getPlaylists()
            .then(setPlaylists)
            .catch(err => console.error("Failed to fetch playlists", err))
            .finally(() => { 
                isFetching.current.playlists = false; 
                setIsLoading(prev => ({ ...prev, playlists: false }));
            });
    }
  }, []);

  useEffect(() => {
    const path = location.pathname;
    const isSongDetails = path.startsWith('/song/');
    const isAlbumDetails = path.startsWith('/album/');
    const isArtistDetails = path.startsWith('/artist/');

    if ((path === '/' || path === '/browse' || path === '/library/songs' || isSongDetails) && songs.length === 0 && !isFetching.current.songs) {
        isFetching.current.songs = true;
        setIsLoading(prev => ({ ...prev, songs: true }));
        api.getSongs(PAGE_LIMIT, 0).then(data => {
            setSongs(data);
            setHasMore(prev => ({ ...prev, songs: data.length === PAGE_LIMIT }));
        }).catch(err => console.error("Failed to fetch songs", err))
          .finally(() => { 
              isFetching.current.songs = false; 
              setIsLoading(prev => ({ ...prev, songs: false }));
          });
    }

    if ((path === '/browse' || path === '/library/albums' || isSongDetails || isAlbumDetails) && albums.length === 0 && !isFetching.current.albums) {
        isFetching.current.albums = true;
        setIsLoading(prev => ({ ...prev, albums: true }));
        api.getAlbums(PAGE_LIMIT, 0).then(data => {
            setAlbums(data);
            setHasMore(prev => ({ ...prev, albums: data.length === PAGE_LIMIT }));
        }).catch(err => console.error("Failed to fetch albums", err))
          .finally(() => { 
              isFetching.current.albums = false; 
              setIsLoading(prev => ({ ...prev, albums: false }));
          });
    }

    if ((path === '/browse' || path === '/library/artists' || isSongDetails || isArtistDetails) && artists.length === 0 && !isFetching.current.artists) {
        isFetching.current.artists = true;
        setIsLoading(prev => ({ ...prev, artists: true }));
        api.getArtists(PAGE_LIMIT, 0).then(data => {
            setArtists(data);
            setHasMore(prev => ({ ...prev, artists: data.length === PAGE_LIMIT }));
        }).catch(err => console.error("Failed to fetch artists", err))
          .finally(() => { 
              isFetching.current.artists = false; 
              setIsLoading(prev => ({ ...prev, artists: false }));
          });
    }
  }, [location.pathname]);

  const handleListSearch = useCallback(async (type: 'songs' | 'albums' | 'artists', query: string) => {
      setListQueries(prev => ({ ...prev, [type]: query }));
      setHasMore(prev => ({ ...prev, [type]: true }));
      
      if (searchAbortControllers.current[type]) {
          searchAbortControllers.current[type].abort();
      }
      
      const controller = new AbortController();
      searchAbortControllers.current[type] = controller;
      
      try {
          if (type === 'songs') {
              const res = await api.getSongs(PAGE_LIMIT, 0, query, controller.signal);
              setSongs(res);
              setHasMore(prev => ({ ...prev, songs: res.length === PAGE_LIMIT }));
          } else if (type === 'albums') {
              const res = await api.getAlbums(PAGE_LIMIT, 0, query, controller.signal);
              setAlbums(res);
              setHasMore(prev => ({ ...prev, albums: res.length === PAGE_LIMIT }));
          } else if (type === 'artists') {
              const res = await api.getArtists(PAGE_LIMIT, 0, query, controller.signal);
              setArtists(res);
              setHasMore(prev => ({ ...prev, artists: res.length === PAGE_LIMIT }));
          }
      } catch (e: any) {
          if (e.name !== 'AbortError') console.error(`Error searching ${type}:`, e);
      }
  }, []);

  const handleLoadMoreSongs = useCallback(async () => {
      if (loadingMore.songs || !hasMore.songs) return;
      setLoadingMore(prev => ({ ...prev, songs: true }));
      try {
          const newSongs = await api.getSongs(PAGE_LIMIT, songs.length, listQueries.songs);
          if (newSongs.length < PAGE_LIMIT) setHasMore(prev => ({ ...prev, songs: false }));
          setSongs(prev => [...prev, ...newSongs]);
      } catch (e) { console.error(e); }
      setLoadingMore(prev => ({ ...prev, songs: false }));
  }, [loadingMore.songs, hasMore.songs, songs.length, listQueries.songs]);

  const handleLoadMoreAlbums = useCallback(async () => {
      if (loadingMore.albums || !hasMore.albums) return;
      setLoadingMore(prev => ({ ...prev, albums: true }));
      try {
          const newAlbums = await api.getAlbums(PAGE_LIMIT, albums.length, listQueries.albums);
          if (newAlbums.length < PAGE_LIMIT) setHasMore(prev => ({ ...prev, albums: false }));
          setAlbums(prev => [...prev, ...newAlbums]);
      } catch (e) { console.error(e); }
      setLoadingMore(prev => ({ ...prev, albums: false }));
  }, [loadingMore.albums, hasMore.albums, albums.length, listQueries.albums]);

  const handleLoadMoreArtists = useCallback(async () => {
      if (loadingMore.artists || !hasMore.artists) return;
      setLoadingMore(prev => ({ ...prev, artists: true }));
      try {
          const newArtists = await api.getArtists(PAGE_LIMIT, artists.length, listQueries.artists);
          if (newArtists.length < PAGE_LIMIT) setHasMore(prev => ({ ...prev, artists: false }));
          setArtists(prev => [...prev, ...newArtists]);
      } catch (e) { console.error(e); }
      setLoadingMore(prev => ({ ...prev, artists: false }));
  }, [loadingMore.artists, hasMore.artists, artists.length, listQueries.artists]);

  useEffect(() => {
    const eventSource = new EventSource('/api/library/events');
    eventSource.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            const { type, payload } = data;
            
            if (['song:', 'album:', 'artist:', 'playlist:'].some(p => type.startsWith(p))) {
                setLastEvent({ type, payload, timestamp: Date.now() });
            }

            if (type.startsWith('scan:')) {
                if (type === 'scan:progress') {
                    const now = Date.now();
                    if (now - lastScanUpdateTimestamp > 100) {
                        setScanStatus(payload);
                        lastScanUpdateTimestamp = now;
                    }
                } else if (type === 'scan:status' || type === 'scan:start') {
                    setScanStatus(payload);
                    setIsScanning(payload.isScanning);
                } else if (type === 'scan:complete') {
                    setScanStatus(payload);
                    setIsScanning(false);
                    if (payload.totalFound > 0) {
                         api.getSongs(PAGE_LIMIT, 0).then(setSongs);
                         api.getAlbums(PAGE_LIMIT, 0).then(setAlbums);
                         api.getArtists(PAGE_LIMIT, 0).then(setArtists);
                    }
                } else if (type === 'scan:error') {
                    setScanStatus(payload);
                    setIsScanning(false);
                    setScanError(payload.error || 'Unknown error occurred');
                }
            }
            else if (type === 'song:update') {
                const updatedPayload = { ...payload };
                if (updatedPayload.coverUrl) updatedPayload.coverUrl = `${updatedPayload.coverUrl.split('?')[0]}?t=${Date.now()}`;
                setSongs(prev => {
                    const exists = prev.find(s => s.id === updatedPayload.id);
                    if (exists) return prev.map(s => s.id === updatedPayload.id ? updatedPayload : s);
                    return [updatedPayload, ...prev];
                });
                setCurrentSong(prev => prev?.id === updatedPayload.id ? updatedPayload : prev);
            } else if (type === 'song:delete') {
                setSongs(prev => prev.filter(s => s.id !== payload.id));
            } else if (type === 'album:update') {
                 const updatedPayload = { ...payload };
                 if (updatedPayload.coverUrl) updatedPayload.coverUrl = `${updatedPayload.coverUrl.split('?')[0]}?t=${Date.now()}`;
                 setAlbums(prev => {
                    const exists = prev.find(a => a.id === updatedPayload.id);
                    if (exists) return prev.map(a => a.id === updatedPayload.id ? updatedPayload : a);
                    return [updatedPayload, ...prev];
                });
            } else if (type === 'playlist:create') {
                setPlaylists(prev => prev.some(p => p.id === payload.id) ? prev : [payload, ...prev]);
            } else if (type === 'playlist:update') {
                setPlaylists(prev => prev.map(p => p.id === payload.id ? payload : p));
            } else if (type === 'playlist:delete') {
                setPlaylists(prev => prev.filter(p => p.id !== payload.id));
            }
        } catch (e) { console.error('Error parsing SSE message', e); }
    };
    return () => eventSource.close();
  }, []);

  useEffect(() => {
      if (audioRef.current && !wavisRef.current) wavisRef.current = new Wavis(audioRef.current);
  }, []);

  const playAudio = useCallback(async () => {
    if (!audioRef.current || !currentSong) return;
    try { await audioRef.current.play(); } catch (err: any) { if (err.name !== 'AbortError') console.error("Playback failed", err); }
  }, [currentSong]);

  useEffect(() => {
    if (audioRef.current) {
        audioRef.current.volume = volume;
        if (isPlaying) playAudio();
        else audioRef.current.pause();
    }
  }, [isPlaying, currentSong, playAudio, volume]);

  const handlePlaySong = useCallback((song: Song, context?: Song[]) => {
    setRecentlyPlayed(prev => [song, ...prev.filter(s => s.id !== song.id)].slice(0, 20));
    if (currentSong?.id === song.id) {
        setIsPlaying(prev => !prev);
    } else {
        if (audioRef.current) audioRef.current.currentTime = 0;
        setCurrentTime(0);
        setCurrentSong(song);
        setIsPlaying(true);
        if (context) setPlaybackQueue(context);
        else setPlaybackQueue(prev => prev.length === 0 || !prev.find(s => s.id === song.id) ? [song] : prev); 
    }
  }, [currentSong]);

  const handlePlayContext = useCallback((context: Song[]) => {
    if (context.length > 0) {
      handlePlaySong(context[0], context);
    }
  }, [handlePlaySong]);

  const handleSeek = useCallback((time: number) => {
    if (audioRef.current) {
        audioRef.current.currentTime = time;
        setCurrentTime(time);
    }
  }, []);

  const handleNext = useCallback(() => {
      if (!currentSong || playbackQueue.length === 0) return;
      const currentIndex = playbackQueue.findIndex(s => s.id === currentSong.id);
      let nextIndex = isShuffle ? Math.floor(Math.random() * playbackQueue.length) : currentIndex + 1;
      if (nextIndex >= playbackQueue.length) {
          if (repeatMode === 'all') nextIndex = 0;
          else { setIsPlaying(false); return; }
      }
      handlePlaySong(playbackQueue[nextIndex], playbackQueue);
  }, [currentSong, playbackQueue, isShuffle, repeatMode, handlePlaySong]);

  const handlePrev = useCallback(() => {
    if (!currentSong || playbackQueue.length === 0) return;
    if (audioRef.current && audioRef.current.currentTime > 3) { audioRef.current.currentTime = 0; return; }
    const currentIndex = playbackQueue.findIndex(s => s.id === currentSong.id);
    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) {
        if (repeatMode === 'all' || isShuffle) prevIndex = playbackQueue.length - 1;
        else { if (audioRef.current) audioRef.current.currentTime = 0; return; }
    }
    handlePlaySong(playbackQueue[prevIndex], playbackQueue);
  }, [currentSong, playbackQueue, repeatMode, isShuffle, handlePlaySong]);

  const handleToggleFavorite = useCallback(async (id: string, targetType?: 'song' | 'album' | 'artist' | 'playlist') => {
    try {
        if (!targetType || targetType === 'song') await api.toggleSongFavorite(id);
        else if (targetType === 'album') await api.toggleAlbumFavorite(id);
        else if (targetType === 'artist') await api.toggleArtistFavorite(id);
        else if (targetType === 'playlist') await api.togglePlaylistFavorite(id);
    } catch (err) { console.warn("Favorite toggle failed", err); }
  }, []);

  const onUpdateSong = useCallback((u: Song) => setSongs(prev => prev.map(s => s.id === u.id ? u : s)), []);
  const onUpdateAlbum = useCallback((u: Album) => setAlbums(prev => prev.map(a => a.id === u.id ? u : a)), []);
  const onUpdateArtist = useCallback((u: Artist) => setArtists(prev => prev.map(a => a.id === u.id ? u : a)), []);

  const handleToggleRepeat = useCallback(() => {
    setRepeatMode(prev => {
        if (prev === 'off') return 'all';
        if (prev === 'all') return 'one';
        return 'off';
    });
  }, []);

  // Update time and duration handlers
  const handleTimeUpdate = useCallback(() => {
      if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
          if (audioRef.current.duration && !isNaN(audioRef.current.duration) && audioRef.current.duration !== duration) {
              setDuration(audioRef.current.duration);
          }
      }
  }, [duration]);

  const handleLoadedMetadata = useCallback(() => {
      if (audioRef.current && !isNaN(audioRef.current.duration)) {
          setDuration(audioRef.current.duration);
      }
  }, []);

  // Keyboard Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          setIsPlaying(prev => !prev);
          break;
        case 'ArrowLeft':
          if (e.metaKey || e.ctrlKey) {
             handlePrev();
          } else {
             if (audioRef.current) {
                 audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 5);
                 setCurrentTime(audioRef.current.currentTime);
             }
          }
          break;
        case 'ArrowRight':
          if (e.metaKey || e.ctrlKey) {
             handleNext();
          } else {
             if (audioRef.current) {
                 audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 5);
                 setCurrentTime(audioRef.current.currentTime);
             }
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, duration]);

  // Media Session API
  useEffect(() => {
    if ('mediaSession' in navigator && currentSong) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title,
        artist: currentSong.artist,
        album: currentSong.album,
        artwork: [
          { src: currentSong.coverUrl, sizes: '512x512', type: 'image/jpeg' }
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => setIsPlaying(true));
      navigator.mediaSession.setActionHandler('pause', () => setIsPlaying(false));
      navigator.mediaSession.setActionHandler('previoustrack', handlePrev);
      navigator.mediaSession.setActionHandler('nexttrack', handleNext);
      navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (details.seekTime && audioRef.current) {
              audioRef.current.currentTime = details.seekTime;
              setCurrentTime(details.seekTime);
          }
      });
    }
  }, [currentSong, handleNext, handlePrev]);

  const MainContent = useMemo(() => (
    <>
      <div className="w-72 h-screen sticky top-0 z-30 flex-shrink-0 hidden lg:block">
        <Sidebar onCreatePlaylist={() => setShowCreatePlaylistModal(true)} playlists={playlists} />
      </div>
      <main className="flex-1 min-w-0 pb-32">
            <Routes>
                <Route path="/" element={<Home recentSongs={recentlyPlayed} recentlyAdded={songs} onPlaySong={handlePlaySong} currentSongId={currentSong?.id} isPlaying={isPlaying} onToggleFavorite={handleToggleFavorite} />} />
                <Route path="/search" element={<Search songs={songs} albums={albums} artists={artists} onPlaySong={handlePlaySong} currentSongId={currentSong?.id} isPlaying={isPlaying} onToggleFavorite={handleToggleFavorite} />} />
                <Route path="/browse" element={<Browse onImportSongs={setSongs} onPlaySong={handlePlaySong} currentSongId={currentSong?.id} isPlaying={isPlaying} albums={albums} artists={artists} songs={songs} playlists={playlists} scanStatus={scanStatus} isScanning={isScanning} scanError={scanError} setScanError={setScanError} setIsScanning={setIsScanning} />} />
                <Route path="/favorites" element={<Favorites onPlaySong={handlePlaySong} currentSongId={currentSong?.id} isPlaying={isPlaying} onToggleFavorite={handleToggleFavorite} onAddToPlaylist={setSongToAdd} />} />
                <Route path="/album/:id" element={<AlbumDetails currentSongId={currentSong?.id} isPlaying={isPlaying} onPlaySong={handlePlaySong} onPlayContext={handlePlayContext} onToggleFavorite={handleToggleFavorite} onAddToPlaylist={setSongToAdd} onUpdateAlbum={onUpdateAlbum} lastEvent={lastEvent} />} />
                <Route path="/artist/:id" element={<ArtistDetails currentSongId={currentSong?.id} isPlaying={isPlaying} onPlaySong={handlePlaySong} onPlayContext={handlePlayContext} onToggleFavorite={handleToggleFavorite} onAddToPlaylist={setSongToAdd} onUpdateArtist={onUpdateArtist} lastEvent={lastEvent} />} />
                <Route path="/playlist/:id" element={<PlaylistDetails currentSongId={currentSong?.id} isPlaying={isPlaying} onPlaySong={handlePlaySong} onPlayContext={handlePlayContext} onToggleFavorite={handleToggleFavorite} onAddToPlaylist={setSongToAdd} onDeletePlaylist={api.deletePlaylist} onRenamePlaylist={api.renamePlaylist} onRemoveSong={api.removeSongFromPlaylist} onReorderSongs={api.reorderPlaylistSongs} lastEvent={lastEvent} />} />
                <Route path="/song/:id" element={<SongDetails songs={songs} albums={albums} artists={artists} currentSongId={currentSong?.id} isPlaying={isPlaying} onPlaySong={handlePlaySong} onPlayContext={handlePlayContext} onToggleFavorite={handleToggleFavorite} onAddToPlaylist={setSongToAdd} onUpdateSong={onUpdateSong} />} />
                <Route path="/library/:type" element={
                    <FullList 
                        songs={songs} albums={albums} artists={artists} playlists={playlists}
                        isLoadingMap={isLoading} onPlaySong={handlePlaySong} 
                        currentSongId={currentSong?.id} isPlaying={isPlaying} 
                        onToggleFavorite={handleToggleFavorite} onAddToPlaylist={setSongToAdd}
                        initialSearchQuery={listQueries.songs || listQueries.albums || listQueries.artists}
                        hasMoreMap={hasMore}
                        onLoadMoreSongs={handleLoadMoreSongs}
                        onLoadMoreAlbums={handleLoadMoreAlbums}
                        onLoadMoreArtists={handleLoadMoreArtists}
                        onSearchGlobal={handleListSearch}
                    />
                } />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
      </main>
    </>
  ), [
    songs, albums, artists, playlists, recentlyPlayed, lastEvent,
    isLoading, listQueries, hasMore, loadingMore,
    currentSong, isPlaying, scanStatus, isScanning, scanError,
    handlePlaySong, handlePlayContext, handleToggleFavorite, handleLoadMoreSongs, handleLoadMoreAlbums, handleLoadMoreArtists, handleListSearch, onUpdateAlbum, onUpdateArtist, onUpdateSong
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
            currentSong={currentSong} isPlaying={isPlaying} onPlayPause={() => setIsPlaying(!isPlaying)}
            onNext={handleNext} onPrev={handlePrev} onToggleFavorite={handleToggleFavorite}
            onAddToPlaylist={setSongToAdd} currentTime={currentTime} duration={duration} onSeek={handleSeek}
            volume={volume} onVolumeChange={setVolume} onExpand={() => setShowVisualizer(true)}
            isShuffle={isShuffle} repeatMode={repeatMode} onToggleShuffle={() => setIsShuffle(!isShuffle)} onToggleRepeat={handleToggleRepeat}
        />
      </div>
      <audio 
        ref={audioRef} 
        src={currentSong?.fileUrl} 
        crossOrigin="anonymous" 
        onTimeUpdate={handleTimeUpdate} 
        onLoadedMetadata={handleLoadedMetadata}
        onDurationChange={handleLoadedMetadata}
        onEnded={handleNext} 
      />
      {showVisualizer && currentSong && wavisRef.current && (
          <Visualizer currentSong={currentSong} isPlaying={isPlaying} onClose={() => setShowVisualizer(false)} wavis={wavisRef.current} onPlayPause={() => setIsPlaying(!isPlaying)} onNext={handleNext} onPrev={handlePrev} currentTime={currentTime} duration={duration} onSeek={handleSeek} activeVisualizer={activeVisualizer} onVisualizerChange={setActiveVisualizer} onUpdateSong={onUpdateSong} />
      )}
      {showCreatePlaylistModal && <CreatePlaylistModal onClose={() => setShowCreatePlaylistModal(false)} onCreate={async (n) => { const p = await api.createPlaylist(n); setPlaylists(prev => [p, ...prev]); setShowCreatePlaylistModal(false); }} />}
      {showAddToPlaylistModal && songToAdd && <AddToPlaylistModal song={songToAdd} playlists={playlists} onClose={() => { setShowAddToPlaylistModal(false); setSongToAdd(null); }} onSelect={async (pid) => { await api.addSongToPlaylist(pid, songToAdd.id); setShowAddToPlaylistModal(false); }} onCreateNew={() => { setShowAddToPlaylistModal(false); setShowCreatePlaylistModal(true); }} />}
    </div>
  );
};

export default App;
