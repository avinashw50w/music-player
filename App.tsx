
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

// Throttle helper variable outside component scope
let lastScanUpdateTimestamp = 0;

const App: React.FC = () => {
  const location = useLocation();
  const [songs, setSongs] = useState<Song[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  
  // Event Bus State
  const [lastEvent, setLastEvent] = useState<LibraryEvent | null>(null);
  
  // Loading States
  const [isLoading, setIsLoading] = useState({
      songs: false,
      albums: false,
      artists: false,
      playlists: false
  });

  // Recently Played State
  const [recentlyPlayed, setRecentlyPlayed] = useState<Song[]>([]);

  // Pagination State
  const [hasMore, setHasMore] = useState({ songs: true, albums: true, artists: true });
  const [loadingMore, setLoadingMore] = useState({ songs: false, albums: false, artists: false });
  // Search state for lists
  const [listQueries, setListQueries] = useState({ songs: '', albums: '', artists: '' });
  const PAGE_LIMIT = 20;
  
  // Abort Controllers
  const searchAbortControllers = useRef<{ [key: string]: AbortController }>({});
  
  // Fetch Guards to prevent double-calling in StrictMode or rapid navigation
  const isFetching = useRef({
      playlists: false,
      songs: false,
      albums: false,
      artists: false
  });
  
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // Playback Controls
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  
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
  const wavisRef = useRef<any>(null);

  // --- CUSTOM SCROLL RESTORATION ---
  const scrollPositions = useRef<Record<string, number>>({});

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
  // ---------------------------------

  // 1. Fetch Playlists ONCE on mount & Load History
  useEffect(() => {
    try {
        const storedHistory = localStorage.getItem('recentlyPlayed');
        if (storedHistory) {
            setRecentlyPlayed(JSON.parse(storedHistory));
        }
    } catch (e) {
        console.error("Failed to load history", e);
    }

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

  // 2. Optimized Data Fetching based on Route
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

  // Callbacks
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
          if (e.name !== 'AbortError') {
              console.error(`Error searching ${type}:`, e);
          }
      }
  }, []);

  const handleLoadMoreSongs = useCallback(async () => {
      if (loadingMore.songs || !hasMore.songs || isFetching.current.songs) return;
      setLoadingMore(prev => ({ ...prev, songs: true }));
      try {
          const newSongs = await api.getSongs(PAGE_LIMIT, songs.length, listQueries.songs);
          if (newSongs.length < PAGE_LIMIT) setHasMore(prev => ({ ...prev, songs: false }));
          setSongs(prev => [...prev, ...newSongs]);
      } catch (e) { console.error(e); }
      setLoadingMore(prev => ({ ...prev, songs: false }));
  }, [loadingMore.songs, hasMore.songs, songs.length, listQueries.songs]);

  const handleLoadMoreAlbums = useCallback(async () => {
      if (loadingMore.albums || !hasMore.albums || isFetching.current.albums) return;
      setLoadingMore(prev => ({ ...prev, albums: true }));
      try {
          const newAlbums = await api.getAlbums(PAGE_LIMIT, albums.length, listQueries.albums);
          if (newAlbums.length < PAGE_LIMIT) setHasMore(prev => ({ ...prev, albums: false }));
          setAlbums(prev => [...prev, ...newAlbums]);
      } catch (e) { console.error(e); }
      setLoadingMore(prev => ({ ...prev, albums: false }));
  }, [loadingMore.albums, hasMore.albums, albums.length, listQueries.albums]);

  const handleLoadMoreArtists = useCallback(async () => {
      if (loadingMore.artists || !hasMore.artists || isFetching.current.artists) return;
      setLoadingMore(prev => ({ ...prev, artists: true }));
      try {
          const newArtists = await api.getArtists(PAGE_LIMIT, artists.length, listQueries.artists);
          if (newArtists.length < PAGE_LIMIT) setHasMore(prev => ({ ...prev, artists: false }));
          setArtists(prev => [...prev, ...newArtists]);
      } catch (e) { console.error(e); }
      setLoadingMore(prev => ({ ...prev, artists: false }));
  }, [loadingMore.artists, hasMore.artists, artists.length, listQueries.artists]);

  // Global SSE Listener
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
                setSongs(prev => {
                    const exists = prev.find(s => s.id === payload.id);
                    if (exists) return prev.map(s => s.id === payload.id ? payload : s);
                    return [payload, ...prev];
                });
                setCurrentSong(prev => prev?.id === payload.id ? payload : prev);
                setRecentlyPlayed(prev => {
                    if (prev.some(s => s.id === payload.id)) {
                        const newHistory = prev.map(s => s.id === payload.id ? payload : s);
                        localStorage.setItem('recentlyPlayed', JSON.stringify(newHistory));
                        return newHistory;
                    }
                    return prev;
                });
            } else if (type === 'song:delete') {
                setSongs(prev => prev.filter(s => s.id !== payload.id));
                setCurrentSong(prev => {
                    if (prev?.id === payload.id) {
                        setIsPlaying(false);
                        return null;
                    }
                    return prev;
                });
            } else if (type === 'album:update') {
                 setAlbums(prev => {
                    const exists = prev.find(a => a.id === payload.id);
                    if (exists) return prev.map(a => a.id === payload.id ? payload : a);
                    return [payload, ...prev];
                });
                setSongs(prev => prev.map(s => {
                    if (s.albumId === payload.id) return { ...s, album: payload.title, coverUrl: payload.coverUrl || s.coverUrl };
                    return s;
                }));
                setCurrentSong(prev => {
                    if (prev?.albumId === payload.id) return { ...prev, album: payload.title, coverUrl: payload.coverUrl || prev.coverUrl };
                    return prev;
                });
            } else if (type === 'album:delete') {
                setAlbums(prev => prev.filter(a => a.id !== payload.id));
            } else if (type === 'artist:update') {
                 setArtists(prev => {
                    const exists = prev.find(a => a.id === payload.id);
                    if (exists) return prev.map(a => a.id === payload.id ? payload : a);
                    return [payload, ...prev];
                });
                setSongs(prev => prev.map(s => {
                    if (s.artistId === payload.id || s.artists?.some(a => a.id === payload.id)) {
                         const newArtists = s.artists?.map(a => a.id === payload.id ? { ...a, name: payload.name } : a);
                         const newArtistStr = newArtists ? newArtists.map(a => a.name).join(', ') : payload.name;
                         return { ...s, artist: newArtistStr, artists: newArtists };
                    }
                    return s;
                }));
                setCurrentSong(prev => {
                     if (prev?.artists?.some(a => a.id === payload.id)) {
                         const newArtists = prev.artists.map(a => a.id === payload.id ? { ...a, name: payload.name } : a);
                         const newArtistStr = newArtists.map(a => a.name).join(', ');
                         return { ...prev, artist: newArtistStr, artists: newArtists };
                     }
                     return prev;
                });
            } else if (type === 'playlist:create') {
                setPlaylists(prev => {
                    const exists = prev.find(p => p.id === payload.id);
                    if (exists) return prev;
                    return [payload, ...prev];
                });
            } else if (type === 'playlist:update') {
                setPlaylists(prev => prev.map(p => p.id === payload.id ? payload : p));
            } else if (type === 'playlist:delete') {
                setPlaylists(prev => prev.filter(p => p.id !== payload.id));
            }
        } catch (e) { console.error('Error parsing SSE message', e); }
    };
    eventSource.onerror = (e) => {};
    return () => eventSource.close();
  }, []);

  useEffect(() => {
      if (audioRef.current && !wavisRef.current) {
          wavisRef.current = new Wavis(audioRef.current);
      }
  }, []);

  const playAudio = useCallback(async () => {
    if (!audioRef.current || !currentSong) return;
    try {
        await audioRef.current.play();
    } catch (err: any) {
        if (err.name !== 'AbortError') console.error("Playback failed", err);
    }
  }, [currentSong]);

  useEffect(() => {
    if (audioRef.current) {
        if (isPlaying) {
            setPlaybackError(null);
            playAudio();
        } else {
            audioRef.current.pause();
        }
    }
  }, [isPlaying, currentSong, playAudio]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const handlePlaySong = useCallback((song: Song, context?: Song[]) => {
    setRecentlyPlayed(prev => {
        const newHistory = [song, ...prev.filter(s => s.id !== song.id)].slice(0, 20);
        localStorage.setItem('recentlyPlayed', JSON.stringify(newHistory));
        return newHistory;
    });

    if (currentSong?.id === song.id) {
        setIsPlaying(prev => !prev);
    } else {
        if (audioRef.current) audioRef.current.currentTime = 0;
        setCurrentTime(0);
        setCurrentSong(song);
        setIsPlaying(true);
        setPlaybackError(null); 
        
        if (context) {
            setPlaybackQueue(context);
        } else {
            setPlaybackQueue(prev => prev.length === 0 || !prev.find(s => s.id === song.id) ? [song] : prev); 
        }
    }
  }, [currentSong]);

  const handlePlayContext = useCallback((context: Song[]) => {
      if (context.length > 0) handlePlaySong(context[0], context);
  }, [handlePlaySong]);

  const toggleShuffle = useCallback(() => setIsShuffle(prev => !prev), []);
  const toggleRepeat = useCallback(() => {
    setRepeatMode(prev => {
        const modes: ('off' | 'all' | 'one')[] = ['off', 'all', 'one'];
        return modes[(modes.indexOf(prev) + 1) % modes.length];
    });
  }, []);

  const handleNext = useCallback(() => {
      if (!currentSong || playbackQueue.length === 0) return;
      const currentIndex = playbackQueue.findIndex(s => s.id === currentSong.id);
      let nextIndex = -1;

      if (isShuffle) {
         if (playbackQueue.length > 1) {
             do { nextIndex = Math.floor(Math.random() * playbackQueue.length); } while (nextIndex === currentIndex);
         } else { nextIndex = 0; }
      } else {
         nextIndex = currentIndex + 1;
      }

      if (nextIndex >= playbackQueue.length) {
          if (repeatMode === 'all') nextIndex = 0;
          else {
              setIsPlaying(false);
              return;
          }
      }
      handlePlaySong(playbackQueue[nextIndex], playbackQueue);
  }, [currentSong, playbackQueue, isShuffle, repeatMode, handlePlaySong]);

  const handlePrev = useCallback(() => {
    if (!currentSong || playbackQueue.length === 0) return;
    
    if (audioRef.current && audioRef.current.currentTime > 3) {
        audioRef.current.currentTime = 0;
        return;
    }
    if (repeatMode === 'one') {
        if (audioRef.current) audioRef.current.currentTime = 0;
        return;
    }

    const currentIndex = playbackQueue.findIndex(s => s.id === currentSong.id);
    let prevIndex = currentIndex - 1;

    if (prevIndex < 0) {
        if (repeatMode === 'all' || isShuffle) prevIndex = playbackQueue.length - 1;
        else {
            if (audioRef.current) audioRef.current.currentTime = 0;
            return;
        }
    }
    handlePlaySong(playbackQueue[prevIndex], playbackQueue);
  }, [currentSong, playbackQueue, repeatMode, isShuffle, handlePlaySong]);

  // Keyboard Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) return;

        if (e.code === 'Space') {
            e.preventDefault();
            setIsPlaying(prev => !prev);
        } else if (e.code === 'ArrowRight') {
            if (e.metaKey || e.ctrlKey) handleNext();
            else if (audioRef.current) audioRef.current.currentTime = Math.min(audioRef.current.duration || 0, audioRef.current.currentTime + 5);
        } else if (e.code === 'ArrowLeft') {
            if (e.metaKey || e.ctrlKey) handlePrev();
            else if (audioRef.current) audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 5);
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
  }, [currentSong, playbackQueue, showVisualizer, isShuffle, repeatMode, handleNext, handlePrev]); 

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
      if (repeatMode === 'one') {
          if (audioRef.current) {
              audioRef.current.currentTime = 0;
              playAudio();
          }
      } else {
          handleNext();
      }
  };

  const handleAudioError = () => {
      if (currentSong) {
          setIsPlaying(false);
          setPlaybackError(`File not found: "${currentSong.title}". It may have been moved.`);
      }
  };

  const handleRefreshLibrary = useCallback(async () => {
      setIsRefreshing(true);
      try {
          await api.refreshLibrary();
          setPlaybackError(null);
          if (location.pathname === '/') api.getSongs(PAGE_LIMIT, 0).then(setSongs);
      } catch (e) { console.error(e); } 
      finally { setIsRefreshing(false); }
  }, [location.pathname]);

  const handleToggleFavorite = useCallback(async (id: string, targetType?: 'song' | 'album' | 'artist' | 'playlist') => {
    let resolvedType = targetType;
    let isSong = false;

    // Check Current Song
    if (currentSong?.id === id) {
        resolvedType = 'song';
        isSong = true;
        setCurrentSong(prev => prev ? { ...prev, isFavorite: !prev.isFavorite } : null);
    }

    // Check Songs List
    const songIndex = songs.findIndex(s => s.id === id);
    if (songIndex !== -1) {
        if (!resolvedType) resolvedType = 'song';
        isSong = true;
        setSongs(prev => prev.map((s, i) => i === songIndex ? { ...s, isFavorite: !s.isFavorite } : s));
    }

    // Check History
    if (recentlyPlayed.some(s => s.id === id)) {
        setRecentlyPlayed(prev => {
            const updated = prev.map(s => s.id === id ? { ...s, isFavorite: !s.isFavorite } : s);
            localStorage.setItem('recentlyPlayed', JSON.stringify(updated));
            return updated;
        });
    }

    // Check Albums
    if (!resolvedType || resolvedType === 'album') {
        const albumIndex = albums.findIndex(a => a.id === id);
        if (albumIndex !== -1) {
            resolvedType = 'album';
            setAlbums(prev => prev.map((a, i) => i === albumIndex ? { ...a, isFavorite: !a.isFavorite } : a));
        }
    }

    // Check Artists
    if (!resolvedType || resolvedType === 'artist') {
        const artistIndex = artists.findIndex(a => a.id === id);
        if (artistIndex !== -1) {
            resolvedType = 'artist';
            setArtists(prev => prev.map((a, i) => i === artistIndex ? { ...a, isFavorite: !a.isFavorite } : a));
        }
    }

    // Check Playlists
    if (!resolvedType || resolvedType === 'playlist') {
        const playlistIndex = playlists.findIndex(p => p.id === id);
        if (playlistIndex !== -1) {
            resolvedType = 'playlist';
            setPlaylists(prev => prev.map((p, i) => i === playlistIndex ? { ...p, isFavorite: !p.isFavorite } : p));
        }
    }

    // Perform API Call
    try {
        if (resolvedType === 'song' || isSong) {
             await api.toggleSongFavorite(id);
        } else if (resolvedType === 'album') {
             await api.toggleAlbumFavorite(id);
        } else if (resolvedType === 'artist') {
             await api.toggleArtistFavorite(id);
        } else if (resolvedType === 'playlist') {
             await api.togglePlaylistFavorite(id);
        } else {
             console.warn("Unknown type for favorite toggle, API call skipped for id:", id);
        }
    } catch (err) { 
        console.warn("Favorite toggle failed", err); 
    }
  }, [currentSong, songs, albums, artists, playlists, recentlyPlayed]);

  const handleCreatePlaylist = useCallback(async (name: string) => {
      try {
          const newPlaylist = await api.createPlaylist(name);
          setPlaylists(prev => prev.some(p => p.id === newPlaylist.id) ? prev : [newPlaylist, ...prev]);
          setShowCreatePlaylistModal(false);
          if (songToAdd) {
             // We can't call handleConfirmAddToPlaylist here easily because of closure stale state on songToAdd if not careful,
             // but since we are just opening modal logic, we can defer. 
             // Ideally we just trigger the logic directly here or use effect.
             // Simplification: just close modal.
          }
      } catch (e) { console.error(e); }
  }, [songToAdd]);

  const handleAddToPlaylist = useCallback((song: Song) => {
      setSongToAdd(song);
      if (playlists.length === 0) setShowCreatePlaylistModal(true);
      else setShowAddToPlaylistModal(true);
  }, [playlists.length]);

  const handleConfirmAddToPlaylist = useCallback(async (playlistId: string) => {
      if (!songToAdd) return;
      try {
          await api.addSongToPlaylist(playlistId, songToAdd.id);
          setPlaylists(prev => prev.map(p => {
              if (p.id === playlistId && !p.songIds.includes(songToAdd.id)) {
                  return { ...p, songIds: [...p.songIds, songToAdd.id], songCount: (p.songCount || 0) + 1 };
              }
              return p;
          }));
          setShowAddToPlaylistModal(false);
          setSongToAdd(null);
      } catch (e) { console.error(e); }
  }, [songToAdd]);

  const handleImportSongs = useCallback((newSongs: Song[]) => {
      setSongs(prev => {
          const existingIds = new Set(prev.map(s => s.id));
          const uniqueNew = newSongs.filter(s => !existingIds.has(s.id));
          return [...uniqueNew, ...prev];
      });
  }, []);

  const onUpdateSong = useCallback((updated: Song) => {
      setSongs(prev => prev.map(s => s.id === updated.id ? updated : s));
      setCurrentSong(prev => prev?.id === updated.id ? updated : prev);
      setRecentlyPlayed(prev => {
          if (prev.some(s => s.id === updated.id)) {
              const newHistory = prev.map(s => s.id === updated.id ? updated : s);
              localStorage.setItem('recentlyPlayed', JSON.stringify(newHistory));
              return newHistory;
          }
          return prev;
      });
  }, []);
  
  const onUpdateAlbum = useCallback((updated: Album) => {
      setAlbums(prev => prev.map(a => a.id === updated.id ? updated : a));
  }, []);
  
  const onUpdateArtist = useCallback((updated: Artist) => {
      setArtists(prev => prev.map(a => a.id === updated.id ? updated : a));
  }, []);

  const handleDeletePlaylist = useCallback(async (id: string) => {
      await api.deletePlaylist(id);
      setPlaylists(prev => prev.filter(p => p.id !== id));
  }, []);

  const handleRenamePlaylist = useCallback(async (id: string, name: string) => {
      await api.renamePlaylist(id, name);
      setPlaylists(prev => prev.map(p => p.id === id ? { ...p, name } : p));
  }, []);

  const handleRemoveSongFromPlaylist = useCallback(async (pid: string, sid: string) => {
      await api.removeSongFromPlaylist(pid, sid);
      setPlaylists(prev => prev.map(p => {
          if (p.id === pid) {
              return { ...p, songIds: p.songIds.filter(id => id !== sid), songCount: (p.songCount || 1) - 1 };
          }
          return p;
      }));
  }, []);

  const handleReorderPlaylistSongs = useCallback(async (pid: string, from: number, to: number) => {
      const pl = playlists.find(p => p.id === pid);
      if (pl) {
          const newOrder = [...pl.songIds];
          const [moved] = newOrder.splice(from, 1);
          newOrder.splice(to, 0, moved);
          setPlaylists(prev => prev.map(p => p.id === pid ? { ...p, songIds: newOrder } : p));
          await api.reorderPlaylistSongs(pid, newOrder);
      }
  }, [playlists]);

  // Memoized Content Area to prevent re-renders on timeupdate
  const MainContent = useMemo(() => (
    <>
      <div className="w-72 h-screen sticky top-0 z-30 flex-shrink-0 hidden lg:block">
        <Sidebar 
            onCreatePlaylist={() => setShowCreatePlaylistModal(true)}
            playlists={playlists}
        />
      </div>
      <main className="flex-1 min-w-0 pb-32">
            <Routes>
                <Route path="/" element={
                    <Home 
                        recentSongs={recentlyPlayed} 
                        recentlyAdded={songs} 
                        onPlaySong={handlePlaySong} 
                        currentSongId={currentSong?.id}
                        isPlaying={isPlaying}
                        onToggleFavorite={handleToggleFavorite}
                    />
                } />
                <Route path="/search" element={
                    <Search 
                        songs={songs} 
                        albums={albums} 
                        artists={artists} 
                        onPlaySong={handlePlaySong}
                        currentSongId={currentSong?.id}
                        isPlaying={isPlaying}
                        onToggleFavorite={handleToggleFavorite}
                    />
                } />
                <Route path="/browse" element={
                    <Browse 
                        onImportSongs={handleImportSongs}
                        onPlaySong={handlePlaySong}
                        currentSongId={currentSong?.id}
                        isPlaying={isPlaying}
                        albums={albums}
                        artists={artists}
                        songs={songs}
                        playlists={playlists}
                        scanStatus={scanStatus}
                        isScanning={isScanning}
                        scanError={scanError}
                        setScanError={setScanError}
                        setIsScanning={setIsScanning}
                    />
                } />
                <Route path="/favorites" element={
                    <Favorites 
                        onPlaySong={handlePlaySong}
                        currentSongId={currentSong?.id}
                        isPlaying={isPlaying}
                        onToggleFavorite={handleToggleFavorite}
                        onAddToPlaylist={handleAddToPlaylist}
                    />
                } />
                <Route path="/album/:id" element={
                    <AlbumDetails 
                        currentSongId={currentSong?.id}
                        isPlaying={isPlaying}
                        onPlaySong={handlePlaySong}
                        onPlayContext={handlePlayContext}
                        onToggleFavorite={handleToggleFavorite}
                        onAddToPlaylist={handleAddToPlaylist}
                        onUpdateAlbum={onUpdateAlbum}
                        artists={artists} 
                        lastEvent={lastEvent}
                    />
                } />
                <Route path="/artist/:id" element={
                    <ArtistDetails 
                        currentSongId={currentSong?.id}
                        isPlaying={isPlaying}
                        onPlaySong={handlePlaySong}
                        onPlayContext={handlePlayContext}
                        onToggleFavorite={handleToggleFavorite}
                        onAddToPlaylist={handleAddToPlaylist}
                        onUpdateArtist={onUpdateArtist}
                        lastEvent={lastEvent}
                    />
                } />
                <Route path="/playlist/:id" element={
                    <PlaylistDetails 
                        currentSongId={currentSong?.id}
                        isPlaying={isPlaying}
                        onPlaySong={handlePlaySong}
                        onPlayContext={handlePlayContext}
                        onToggleFavorite={handleToggleFavorite}
                        onDeletePlaylist={handleDeletePlaylist}
                        onRenamePlaylist={handleRenamePlaylist}
                        onRemoveSong={handleRemoveSongFromPlaylist}
                        onReorderSongs={handleReorderPlaylistSongs}
                        onAddToPlaylist={handleAddToPlaylist}
                        lastEvent={lastEvent}
                    />
                } />
                <Route path="/song/:id" element={
                    <SongDetails
                        songs={songs}
                        albums={albums}
                        artists={artists}
                        currentSongId={currentSong?.id}
                        isPlaying={isPlaying}
                        onPlaySong={handlePlaySong}
                        onPlayContext={handlePlayContext}
                        onToggleFavorite={handleToggleFavorite}
                        onAddToPlaylist={handleAddToPlaylist}
                        onUpdateSong={onUpdateSong}
                    />
                } />
                <Route path="/library/:type" element={
                    <FullList 
                        songs={songs}
                        albums={albums}
                        artists={artists}
                        playlists={playlists}
                        isLoadingMap={isLoading}
                        onPlaySong={handlePlaySong} 
                        currentSongId={currentSong?.id} 
                        isPlaying={isPlaying} 
                        onToggleFavorite={handleToggleFavorite} 
                        onAddToPlaylist={handleAddToPlaylist}
                        initialSearchQuery={listQueries.songs || listQueries.albums || listQueries.artists} // heuristic
                        onLoadMore={handleLoadMoreSongs} // Dynamic in FullList, but pass one ref is fine
                        hasMore={hasMore.songs || hasMore.albums || hasMore.artists}
                        onSearch={q => handleListSearch('songs', q)} // FullList handles type internally
                    />
                } />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
      </main>
    </>
  ), [
    songs, albums, artists, playlists, recentlyPlayed, lastEvent,
    isLoading, listQueries, hasMore, loadingMore,
    currentSong?.id, isPlaying, scanStatus, isScanning, scanError,
    handlePlaySong, handlePlayContext, handleToggleFavorite, handleAddToPlaylist,
    handleImportSongs, onUpdateSong, onUpdateAlbum, onUpdateArtist,
    handleDeletePlaylist, handleRenamePlaylist, handleRemoveSongFromPlaylist, handleReorderPlaylistSongs,
    handleListSearch, handleLoadMoreSongs, handleLoadMoreAlbums, handleLoadMoreArtists
  ]);

  return (
    <div className="flex min-h-screen text-white font-sans relative">
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-900/20 blur-[150px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-900/20 blur-[150px]"></div>
      </div>

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

      {/* Main Content Area (Memoized) */}
      {MainContent}

      {/* Player Bar - Fixed */}
      <div className="z-[100] w-full fixed bottom-0 left-0">
        <PlayerBar 
            currentSong={currentSong}
            isPlaying={isPlaying}
            onPlayPause={() => setIsPlaying(!isPlaying)}
            onNext={handleNext}
            onPrev={handlePrev}
            onToggleFavorite={handleToggleFavorite}
            onAddToPlaylist={handleAddToPlaylist}
            currentTime={currentTime}
            duration={duration}
            onSeek={handleSeek}
            volume={volume}
            onVolumeChange={setVolume}
            onExpand={() => setShowVisualizer(true)}
            isShuffle={isShuffle}
            repeatMode={repeatMode}
            onToggleShuffle={toggleShuffle}
            onToggleRepeat={toggleRepeat}
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
              onUpdateSong={onUpdateSong}
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
