
import { useState, useEffect, useRef, useCallback } from 'react';
import * as api from '../services/api';
import { Song, Album, Artist, Playlist, LibraryEvent } from '../types';
import { useLocation } from 'react-router-dom';

let lastScanUpdateTimestamp = 0;
const PAGE_LIMIT = 20;
const API_HOST = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3010';

// Helper to resolve URLs (duplicated from api.ts logic for SSE context)
const resolveUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')) return url;
    if (url.startsWith('/')) return `${API_HOST}${url}`;
    return `${API_HOST}/${url}`;
};

export const useLibrary = () => {
  const location = useLocation();
  const [songs, setSongs] = useState<Song[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [stats, setStats] = useState<api.LibraryStats>({ songCount: 0, albumCount: 0, artistCount: 0, playlistCount: 0 });
  
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
  
  const searchAbortControllers = useRef<{ [key: string]: AbortController }>({});
  
  const isFetching = useRef({
      playlists: false,
      songs: false,
      albums: false,
      artists: false
  });

  const [scanStatus, setScanStatus] = useState<api.ScanStatus | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  // Load recently played from local storage
  useEffect(() => {
    try {
        const storedHistory = localStorage.getItem('recentlyPlayed');
        if (storedHistory) setRecentlyPlayed(JSON.parse(storedHistory));
    } catch (e) { console.error("Failed to load history", e); }
  }, []);

  // Fetch Stats on mount
  useEffect(() => {
      api.getLibraryStats().then(setStats).catch(console.error);
  }, []);

  // Add to recently played
  const addToHistory = useCallback((song: Song) => {
      setRecentlyPlayed(prev => {
          const updated = [song, ...prev.filter(s => s.id !== song.id)].slice(0, 20);
          localStorage.setItem('recentlyPlayed', JSON.stringify(updated));
          return updated;
      });
  }, []);

  // Fetch Playlists
  useEffect(() => {
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

  // Fetch Data based on Route
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
  }, [location.pathname, songs.length, albums.length, artists.length]);

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

  // SSE Listener
  useEffect(() => {
    // Construct full URL since proxy is removed in vite config
    const eventSource = new EventSource(`${API_HOST}/api/library/events`);
    
    eventSource.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            let { type, payload } = data;
            
            // Pre-process payload to resolve URLs before any state updates
            if (payload && typeof payload === 'object') {
                payload = { ...payload }; // Clone
                
                // Resolve URLs
                if (payload.coverUrl) {
                    payload.coverUrl = resolveUrl(payload.coverUrl);
                    // Add timestamp for cache busting images
                    const sep = payload.coverUrl.includes('?') ? '&' : '?';
                    payload.coverUrl = `${payload.coverUrl}${sep}t=${Date.now()}`;
                }
                
                if (payload.fileUrl) {
                    payload.fileUrl = resolveUrl(payload.fileUrl);
                }
                
                if (payload.avatarUrl) {
                    payload.avatarUrl = resolveUrl(payload.avatarUrl);
                    // Add timestamp for cache busting avatars
                    const sep = payload.avatarUrl.includes('?') ? '&' : '?';
                    payload.avatarUrl = `${payload.avatarUrl}${sep}t=${Date.now()}`;
                }
            }

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
                         // Refresh data and stats
                         api.getSongs(PAGE_LIMIT, 0).then(setSongs);
                         api.getAlbums(PAGE_LIMIT, 0).then(setAlbums);
                         api.getArtists(PAGE_LIMIT, 0).then(setArtists);
                         api.getLibraryStats().then(setStats);
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
            } else if (type === 'song:delete') {
                setSongs(prev => prev.filter(s => s.id !== payload.id));
                setStats(prev => ({ ...prev, songCount: Math.max(0, prev.songCount - 1) }));
            } else if (type === 'album:update') {
                 setAlbums(prev => {
                    const exists = prev.find(a => a.id === payload.id);
                    if (exists) return prev.map(a => a.id === payload.id ? payload : a);
                    return [payload, ...prev];
                });
            } else if (type === 'artist:update') {
                 setArtists(prev => {
                    const exists = prev.find(a => a.id === payload.id);
                    if (exists) return prev.map(a => a.id === payload.id ? payload : a);
                    return [payload, ...prev];
                });
            } else if (type === 'playlist:create') {
                setPlaylists(prev => prev.some(p => p.id === payload.id) ? prev : [payload, ...prev]);
                setStats(prev => ({ ...prev, playlistCount: prev.playlistCount + 1 }));
            } else if (type === 'playlist:update') {
                setPlaylists(prev => prev.map(p => p.id === payload.id ? payload : p));
            } else if (type === 'playlist:delete') {
                setPlaylists(prev => prev.filter(p => p.id !== payload.id));
                setStats(prev => ({ ...prev, playlistCount: Math.max(0, prev.playlistCount - 1) }));
            }
        } catch (e) { console.error('Error parsing SSE message', e); }
    };
    
    eventSource.onerror = (e) => {
        // console.error("SSE Error", e);
    };

    return () => eventSource.close();
  }, []);

  // Update Handlers
  const onUpdateSong = useCallback((u: Song) => setSongs(prev => prev.map(s => s.id === u.id ? u : s)), []);
  const onUpdateAlbum = useCallback((u: Album) => setAlbums(prev => prev.map(a => a.id === u.id ? u : a)), []);
  const onUpdateArtist = useCallback((u: Artist) => setArtists(prev => prev.map(a => a.id === u.id ? u : a)), []);

  const handleToggleFavorite = useCallback(async (id: string, targetType?: 'song' | 'album' | 'artist' | 'playlist') => {
    // Optimistic Updates for local lists
    const isSong = !targetType || targetType === 'song';
    if (isSong) {
        setSongs(prev => prev.map(s => s.id === id ? { ...s, isFavorite: !s.isFavorite } : s));
        setRecentlyPlayed(prev => prev.map(s => s.id === id ? { ...s, isFavorite: !s.isFavorite } : s));
    } else if (targetType === 'album') {
        setAlbums(prev => prev.map(a => a.id === id ? { ...a, isFavorite: !a.isFavorite } : a));
    } else if (targetType === 'artist') {
        setArtists(prev => prev.map(a => a.id === id ? { ...a, isFavorite: !a.isFavorite } : a));
    } else if (targetType === 'playlist') {
        setPlaylists(prev => prev.map(p => p.id === id ? { ...p, isFavorite: !p.isFavorite } : p));
    }

    try {
        if (isSong) await api.toggleSongFavorite(id);
        else if (targetType === 'album') await api.toggleAlbumFavorite(id);
        else if (targetType === 'artist') await api.toggleArtistFavorite(id);
        else if (targetType === 'playlist') await api.togglePlaylistFavorite(id);
    } catch (err) { 
        console.warn("Favorite toggle failed", err);
    }
  }, []);

  const deletePlaylist = useCallback(async (id: string) => {
      // Optimistic update to remove playlist immediately from sidebar
      setPlaylists(prev => prev.filter(p => p.id !== id));
      try {
          await api.deletePlaylist(id);
      } catch (err) {
          console.error("Failed to delete playlist", err);
          api.getPlaylists().then(setPlaylists);
      }
  }, []);

  return {
    songs, setSongs,
    albums, setAlbums,
    artists, setArtists,
    playlists, setPlaylists,
    stats, setStats,
    recentlyPlayed, addToHistory,
    isLoading,
    hasMore,
    loadingMore,
    listQueries,
    lastEvent,
    scanStatus,
    isScanning, setIsScanning,
    scanError, setScanError,
    handleListSearch,
    handleLoadMoreSongs,
    handleLoadMoreAlbums,
    handleLoadMoreArtists,
    onUpdateSong,
    onUpdateAlbum,
    onUpdateArtist,
    handleToggleFavorite,
    deletePlaylist
  };
};
