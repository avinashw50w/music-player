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
import * as api from './services/api';
import { Song, Album, Artist, Playlist, NavigationState, ViewType } from './types';

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
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchData();
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
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSong, playbackQueue]); 

  useEffect(() => {
    if (audioRef.current) {
        if (isPlaying) {
            audioRef.current.play().catch(e => console.error("Playback failed", e));
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

  const handleToggleFavorite = async (id: string) => {
    // Check Songs
    const song = songs.find(s => s.id === id);
    if (song) {
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
          const newPlaylist = await api.createPlaylist(name);
          setPlaylists([newPlaylist, ...playlists]);
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
          setPlaylists(prev => prev.map(p => {
              if (p.id === playlistId) {
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
      setSongs(prev => [...newSongs, ...prev]);
      fetchData();
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
                setPlaylists(prev => prev.filter(p => p.id !== id));
                handleBack();
            }}
            onRenamePlaylist={async (id: string, name: string) => {
                const updated = await api.renamePlaylist(id, name);
                setPlaylists(prev => prev.map(p => p.id === id ? updated : p));
            }}
            onRemoveSong={async (pid: string, sid: string) => {
                await api.removeSongFromPlaylist(pid, sid);
                 setPlaylists(prev => prev.map(p => {
                    if (p.id === pid) {
                        return { ...p, songIds: p.songIds.filter(id => id !== sid), songCount: (p.songCount || 0) - 1 };
                    }
                    return p;
                }));
            }}
            onReorderSongs={async (pid: string, from: number, to: number) => {
                 const pl = playlists.find(p => p.id === pid);
                 if (!pl) return;
                 const newOrder = [...pl.songIds];
                 const [moved] = newOrder.splice(from, 1);
                 newOrder.splice(to, 0, moved);
                 
                 setPlaylists(prev => prev.map(p => p.id === pid ? { ...p, songIds: newOrder } : p));
                 
                 await api.reorderPlaylistSongs(pid, newOrder);
            }}
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
          return <FullList type="songs" items={songs} onBack={handleBack} onNavigate={handleNavigate} onPlaySong={handlePlaySong} currentSongId={currentSong?.id} isPlaying={isPlaying} />;
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

      <div className="flex-1 flex overflow-hidden relative z-10">
        <Sidebar 
            currentView={navState.view} 
            onNavigate={(view) => handleNavigate(view)} 
            onPlaylistClick={(id) => handleNavigate('playlist_details', id)}
            onCreatePlaylist={() => setShowCreatePlaylistModal(true)}
            playlists={playlists}
        />
        
        <main className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth">
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
        />
      </div>
      
      <audio 
        ref={audioRef} 
        src={currentSong?.fileUrl} 
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleSongEnded}
      />

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