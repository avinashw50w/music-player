
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
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
import { Song, Album, Artist, Playlist } from './types';
import { AlertCircle, RefreshCw, X } from 'lucide-react';
import Wavis from './lib/waviz';

const App: React.FC = () => {
  const location = useLocation();
  const [songs, setSongs] = useState<Song[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  
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

    // Force instant scroll to avoid any smooth scrolling animations
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
    // Load Recently Played from LocalStorage
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

    // Fetch songs for Home, Browse, Library or Detail pages
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

    // Fetch albums for Browse, Library or Detail pages (for suggestions)
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

    // Fetch artists for Browse, Library or Detail pages (for suggestions)
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
  }, [location.pathname]); // Re-run when path changes

  const handleListSearch = async (type: 'songs' | 'albums' | 'artists', query: string) => {
      setListQueries(prev => ({ ...prev, [type]: query }));
      // Reset hasMore when searching
      setHasMore(prev => ({ ...prev, [type]: true }));
      
      // Cancel previous request if exists
      if (searchAbortControllers.current[type]) {
          searchAbortControllers.current[type].abort();
      }
      
      // Create new controller
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
  };

  const handleLoadMoreSongs = async () => {
      if (loadingMore.songs || !hasMore.songs || isFetching.current.songs) return;
      setLoadingMore(prev => ({ ...prev, songs: true }));
      try {
          const newSongs = await api.getSongs(PAGE_LIMIT, songs.length, listQueries.songs);
          if (newSongs.length < PAGE_LIMIT) setHasMore(prev => ({ ...prev, songs: false }));
          setSongs(prev => [...prev, ...newSongs]);
      } catch (e) { console.error(e); }
      setLoadingMore(prev => ({ ...prev, songs: false }));
  };

  const handleLoadMoreAlbums = async () => {
      if (loadingMore.albums || !hasMore.albums || isFetching.current.albums) return;
      setLoadingMore(prev => ({ ...prev, albums: true }));
      try {
          const newAlbums = await api.getAlbums(PAGE_LIMIT, albums.length, listQueries.albums);
          if (newAlbums.length < PAGE_LIMIT) setHasMore(prev => ({ ...prev, albums: false }));
          setAlbums(prev => [...prev, ...newAlbums]);
      } catch (e) { console.error(e); }
      setLoadingMore(prev => ({ ...prev, albums: false }));
  };

  const handleLoadMoreArtists = async () => {
      if (loadingMore.artists || !hasMore.artists || isFetching.current.artists) return;
      setLoadingMore(prev => ({ ...prev, artists: true }));
      try {
          const newArtists = await api.getArtists(PAGE_LIMIT, artists.length, listQueries.artists);
          if (newArtists.length < PAGE_LIMIT) setHasMore(prev => ({ ...prev, artists: false }));
          setArtists(prev => [...prev, ...newArtists]);
      } catch (e) { console.error(e); }
      setLoadingMore(prev => ({ ...prev, artists: false }));
  };

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
                     // Refresh relevant data
                     api.getSongs(PAGE_LIMIT, 0).then(setSongs);
                     api.getAlbums(PAGE_LIMIT, 0).then(setAlbums);
                     api.getArtists(PAGE_LIMIT, 0).then(setArtists);
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
                
                // Update currentSong if it matches using functional update
                setCurrentSong(prev => prev?.id === payload.id ? payload : prev);
            } else if (type === 'song:delete') {
                setSongs(prev => prev.filter(s => s.id !== payload.id));
                setCurrentSong(prev => {
                    if (prev?.id === payload.id) {
                        setIsPlaying(false);
                        return null;
                    }
                    return prev;
                });
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
  }, []); // Removed currentSong dependency to prevent reconnection loops

  // Initialize Wavis once audioRef is available
  useEffect(() => {
      if (audioRef.current && !wavisRef.current) {
          // Instantiate original Wavis class
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
  }, [currentSong, playbackQueue, showVisualizer, isShuffle, repeatMode]); 

  const playAudio = async () => {
    if (!audioRef.current || !currentSong) return;
    try {
        await audioRef.current.play();
    } catch (err: any) {
        if (err.name !== 'AbortError') {
             console.error("Playback failed", err);
             // Optionally set error toast here if needed
        }
    }
  };

  useEffect(() => {
    if (audioRef.current) {
        if (isPlaying) {
            setPlaybackError(null);
            playAudio();
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

  const handlePlaySong = (song: Song, context?: Song[]) => {
    // Add to Recently Played (History)
    setRecentlyPlayed(prev => {
        const newHistory = [song, ...prev.filter(s => s.id !== song.id)].slice(0, 20);
        localStorage.setItem('recentlyPlayed', JSON.stringify(newHistory));
        return newHistory;
    });

    // If playing the exact same song, toggle play/pause
    if (currentSong?.id === song.id) {
        setIsPlaying(!isPlaying);
    } else {
        // If it's a different song, or context implies a change
        // We force reset current time before changing source to ensure clean slate
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
        }
        setCurrentTime(0);
        setCurrentSong(song);
        setIsPlaying(true);
        setPlaybackError(null); 
        
        if (context) {
            setPlaybackQueue(context);
        } else if (playbackQueue.length === 0 || !playbackQueue.find(s => s.id === song.id)) {
            setPlaybackQueue([song]); 
        }
    }
  };

  const handlePlayContext = (context: Song[]) => {
      if (context.length > 0) {
          handlePlaySong(context[0], context);
      }
  };

  const toggleShuffle = () => setIsShuffle(!isShuffle);
  const toggleRepeat = () => {
    const modes: ('off' | 'all' | 'one')[] = ['off', 'all', 'one'];
    const nextIndex = (modes.indexOf(repeatMode) + 1) % modes.length;
    setRepeatMode(modes[nextIndex]);
  };

  const handleNext = () => {
      if (!currentSong || playbackQueue.length === 0) return;
      
      const currentIndex = playbackQueue.findIndex(s => s.id === currentSong.id);
      let nextIndex = -1;

      if (isShuffle) {
         // Simple random shuffle: Pick any song except current (if possible)
         if (playbackQueue.length > 1) {
             do {
                 nextIndex = Math.floor(Math.random() * playbackQueue.length);
             } while (nextIndex === currentIndex);
         } else {
             nextIndex = 0;
         }
      } else {
         nextIndex = currentIndex + 1;
      }

      // Boundary / Repeat logic
      if (nextIndex >= playbackQueue.length) {
          if (repeatMode === 'all') {
              nextIndex = 0;
          } else {
              // End of queue and no repeat
              setIsPlaying(false);
              return;
          }
      }

      handlePlaySong(playbackQueue[nextIndex], playbackQueue);
  };

  const handlePrev = () => {
    if (!currentSong || playbackQueue.length === 0) return;
    
    // If playing for more than 3s, restart song
    if (audioRef.current && audioRef.current.currentTime > 3) {
        audioRef.current.currentTime = 0;
        return;
    }

    // If repeat one is on, restart song
    if (repeatMode === 'one') {
        if (audioRef.current) audioRef.current.currentTime = 0;
        return;
    }

    const currentIndex = playbackQueue.findIndex(s => s.id === currentSong.id);
    let prevIndex = currentIndex - 1;

    if (prevIndex < 0) {
        if (repeatMode === 'all' || isShuffle) { 
            // Wrap around for shuffle or repeat all
            prevIndex = playbackQueue.length - 1;
        } else {
            // Stop at start
            if (audioRef.current) audioRef.current.currentTime = 0;
            return;
        }
    }

    handlePlaySong(playbackQueue[prevIndex], playbackQueue);
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

  const handleRefreshLibrary = async () => {
      setIsRefreshing(true);
      try {
          await api.refreshLibrary();
          setPlaybackError(null);
          // Refetch what we need based on current path
          const path = location.pathname;
          if (path === '/') api.getSongs(PAGE_LIMIT, 0).then(setSongs);
      } catch (e) {
          console.error(e);
      } finally {
          setIsRefreshing(false);
      }
  };

  const handleToggleFavorite = async (id: string) => {
    let isSong = false;

    // 1. Check if it is the currently playing song
    if (currentSong?.id === id) {
        isSong = true;
        const newStatus = !currentSong.isFavorite;
        setCurrentSong(prev => prev ? { ...prev, isFavorite: newStatus } : null);
    }

    // 2. Check global list
    const songIndex = songs.findIndex(s => s.id === id);
    if (songIndex !== -1) {
        isSong = true;
        setSongs(prev => prev.map((s, i) => i === songIndex ? { ...s, isFavorite: !s.isFavorite } : s));
    }

    // 3. Check Recently Played
    if (recentlyPlayed.some(s => s.id === id)) {
        setRecentlyPlayed(prev => {
            const updated = prev.map(s => s.id === id ? { ...s, isFavorite: !s.isFavorite } : s);
            localStorage.setItem('recentlyPlayed', JSON.stringify(updated));
            return updated;
        });
    }

    if (isSong) {
        try { await api.toggleSongFavorite(id); } catch (err) { console.warn(err); }
        return;
    }

    // 4. Check Albums
    const albumIndex = albums.findIndex(a => a.id === id);
    if (albumIndex !== -1) {
        setAlbums(prev => prev.map((a, i) => i === albumIndex ? { ...a, isFavorite: !a.isFavorite } : a));
        try { await api.toggleAlbumFavorite(id); } catch (err) { console.warn(err); }
        return;
    }

    // 5. Check Artists
    const artistIndex = artists.findIndex(a => a.id === id);
    if (artistIndex !== -1) {
        setArtists(prev => prev.map((a, i) => i === artistIndex ? { ...a, isFavorite: !a.isFavorite } : a));
        try { await api.toggleArtistFavorite(id); } catch (err) { console.warn(err); }
        return;
    }
    
    // 6. Check Playlists
    const playlistIndex = playlists.findIndex(p => p.id === id);
    if (playlistIndex !== -1) {
        setPlaylists(prev => prev.map((p, i) => i === playlistIndex ? { ...p, isFavorite: !p.isFavorite } : p));
        try { await api.togglePlaylistFavorite(id); } catch (err) { console.warn(err); }
        return;
    }
  };

  const handleCreatePlaylist = async (name: string) => {
      try {
          const newPlaylist = await api.createPlaylist(name);
          setPlaylists(prev => [newPlaylist, ...prev]);
          setShowCreatePlaylistModal(false);
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
          setPlaylists(prev => prev.map(p => {
              if (p.id === playlistId && !p.songIds.includes(songToAdd.id)) {
                  return { ...p, songIds: [...p.songIds, songToAdd.id], songCount: (p.songCount || 0) + 1 };
              }
              return p;
          }));
          setShowAddToPlaylistModal(false);
          setSongToAdd(null);
      } catch (e) {
          console.error(e);
      }
  };

  const handleImportSongs = (newSongs: Song[]) => {
      setSongs(prev => {
          const existingIds = new Set(prev.map(s => s.id));
          const uniqueNew = newSongs.filter(s => !existingIds.has(s.id));
          return [...uniqueNew, ...prev];
      });
  };

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

  return (
    <div className="flex min-h-screen text-white font-sans relative">
      {/* ... (rest of render code unchanged) ... */}
      
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

      {/* Sidebar - Sticky */}
      <div className="w-72 h-screen sticky top-0 z-30 flex-shrink-0 hidden lg:block">
        <Sidebar 
            onCreatePlaylist={() => setShowCreatePlaylistModal(true)}
            playlists={playlists}
        />
      </div>
        
      {/* Main Content - Scrolls with Window */}
      <main className="flex-1 min-w-0 pb-32">
            <Routes>
                <Route path="/" element={
                    <Home 
                        recentSongs={recentlyPlayed} 
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
                    />
                } />
                <Route path="/playlist/:id" element={
                    <PlaylistDetails 
                        currentSongId={currentSong?.id}
                        isPlaying={isPlaying}
                        onPlaySong={handlePlaySong}
                        onPlayContext={handlePlayContext}
                        onToggleFavorite={handleToggleFavorite}
                        onDeletePlaylist={async (id: string) => {
                            await api.deletePlaylist(id);
                            setPlaylists(prev => prev.filter(p => p.id !== id));
                        }}
                        onRenamePlaylist={async (id: string, name: string) => {
                            await api.renamePlaylist(id, name);
                            setPlaylists(prev => prev.map(p => p.id === id ? { ...p, name } : p));
                        }}
                        onRemoveSong={async (pid: string, sid: string) => {
                            await api.removeSongFromPlaylist(pid, sid);
                            setPlaylists(prev => prev.map(p => {
                                if (p.id === pid) {
                                    return { ...p, songIds: p.songIds.filter(id => id !== sid), songCount: (p.songCount || 1) - 1 };
                                }
                                return p;
                            }));
                        }}
                        onReorderSongs={async (pid: string, from: number, to: number) => {
                            const pl = playlists.find(p => p.id === pid);
                            if (pl) {
                                const newOrder = [...pl.songIds];
                                const [moved] = newOrder.splice(from, 1);
                                newOrder.splice(to, 0, moved);
                                setPlaylists(prev => prev.map(p => p.id === pid ? { ...p, songIds: newOrder } : p));
                                await api.reorderPlaylistSongs(pid, newOrder);
                            }
                        }}
                        onAddToPlaylist={handleAddToPlaylist}
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
                        initialSearchQuery={(() => {
                           if (location.pathname.includes('songs')) return listQueries.songs;
                           if (location.pathname.includes('albums')) return listQueries.albums;
                           if (location.pathname.includes('artists')) return listQueries.artists;
                           return '';
                        })()}
                        onLoadMore={() => {
                           const path = window.location.pathname;
                           if (path.includes('songs')) handleLoadMoreSongs();
                           if (path.includes('albums')) handleLoadMoreAlbums();
                           if (path.includes('artists')) handleLoadMoreArtists();
                        }}
                        hasMore={true}
                        onSearch={(q) => {
                           const path = window.location.pathname;
                           if (path.includes('songs')) handleListSearch('songs', q);
                           if (path.includes('albums')) handleListSearch('albums', q);
                           if (path.includes('artists')) handleListSearch('artists', q);
                        }}
                    />
                } />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </main>

      {/* Player Bar - Fixed */}
      <div className="z-[100] w-full fixed bottom-0 left-0">
        <PlayerBar 
            currentSong={currentSong}
            isPlaying={isPlaying}
            onPlayPause={() => setIsPlaying(!isPlaying)}
            onNext={handleNext}
            onPrev={handlePrev}
            onToggleFavorite={handleToggleFavorite}
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
