
import React, { useState, useEffect, useRef } from 'react';
import { Song, Album, Artist, Playlist } from '../types';
import { Heart, ListMusic, MoreHorizontal } from 'lucide-react';
import { SongListItem } from '../components/SongListItem';
import { useNavigate } from 'react-router-dom';
import * as api from '../services/api';

interface FavoritesProps {
  onPlaySong: (song: Song) => void;
  currentSongId?: string;
  isPlaying: boolean;
  onToggleFavorite: (id: string, type?: 'song' | 'album' | 'artist' | 'playlist') => void;
  onAddToPlaylist: (song: Song) => void;
}

type Tab = 'Playlists' | 'Artists' | 'Albums' | 'Songs';

const Favorites: React.FC<FavoritesProps> = ({ onPlaySong, currentSongId, isPlaying, onToggleFavorite, onAddToPlaylist }) => {
  const [activeTab, setActiveTab] = useState<Tab>('Songs');
  const navigate = useNavigate();
  
  const [favoriteSongs, setFavoriteSongs] = useState<Song[]>([]);
  const [favoriteAlbums, setFavoriteAlbums] = useState<Album[]>([]);
  const [favoriteArtists, setFavoriteArtists] = useState<Artist[]>([]);
  const [favoritePlaylists, setFavoritePlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Ref to prevent double fetching in React Strict Mode
  const dataFetchedRef = useRef(false);

  // Fetch data on mount
  useEffect(() => {
      // Prevent double call in strict mode
      if (dataFetchedRef.current) return;
      dataFetchedRef.current = true;

      const fetchData = async () => {
          setLoading(true);
          try {
              // Fetch all types in parallel
              const [songs, albums, artists, playlists] = await Promise.all([
                  api.getSongs(100, 0, '', undefined, true),
                  api.getAlbums(100, 0, '', undefined, true),
                  api.getArtists(100, 0, '', undefined, true),
                  api.getPlaylists(true)
              ]);
              setFavoriteSongs(songs);
              setFavoriteAlbums(albums);
              setFavoriteArtists(artists);
              setFavoritePlaylists(playlists);
          } catch (e) {
              console.error("Failed to fetch favorites", e);
          } finally {
              setLoading(false);
          }
      };
      fetchData();
  }, []);

  const handleToggleFavoriteLocal = (id: string, type: 'song' | 'album' | 'artist' | 'playlist') => {
      onToggleFavorite(id, type);
      // Optimistically remove from list
      if (type === 'song') setFavoriteSongs(prev => prev.filter(s => s.id !== id));
      if (type === 'album') setFavoriteAlbums(prev => prev.filter(a => a.id !== id));
      if (type === 'artist') setFavoriteArtists(prev => prev.filter(a => a.id !== id));
      if (type === 'playlist') setFavoritePlaylists(prev => prev.filter(p => p.id !== id));
  };

  const renderContent = () => {
    if (loading) {
        return (
            <div className="flex justify-center pt-20">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (activeTab === 'Songs') {
      if (favoriteSongs.length === 0) return <div className="text-slate-500 mt-10 text-left">No favorite songs yet.</div>;
      return (
        <div className="space-y-1">
          {favoriteSongs.map((song, i) => (
             <SongListItem
                key={song.id}
                song={song}
                index={i}
                currentSongId={currentSongId}
                isPlaying={isPlaying}
                onPlay={() => onPlaySong(song)}
                onToggleFavorite={() => handleToggleFavoriteLocal(song.id, 'song')}
                onAddToPlaylist={onAddToPlaylist}
             />
          ))}
        </div>
      );
    }
    
    if (activeTab === 'Albums') {
        if (favoriteAlbums.length === 0) return <div className="text-slate-500 mt-10 text-left">No favorite albums yet.</div>;
        return (
            <div className="space-y-1">
            {favoriteAlbums.map((album) => (
              <div 
                key={album.id} 
                onClick={() => navigate(`/album/${album.id}`)}
                className="group flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-5">
                  <img src={album.coverUrl} alt={album.title} className="w-14 h-14 rounded-2xl object-cover shadow-lg" />
                  <div>
                    <h4 className="font-bold text-lg text-white mb-1">{album.title}</h4>
                    <p className="text-slate-500 text-sm font-medium">{album.artist}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 pr-4">
                   <button 
                    onClick={(e) => { e.stopPropagation(); handleToggleFavoriteLocal(album.id, 'album'); }}
                    className="p-2 text-rose-500 hover:scale-110 transition-transform cursor-pointer"
                   >
                    <Heart className="w-6 h-6 fill-current" />
                  </button>
                  <button className="p-2 text-slate-600 hover:text-white transition-colors cursor-pointer">
                    <MoreHorizontal className="w-6 h-6" />
                  </button>
                </div>
              </div>
            ))}
            </div>
        );
    }

    if (activeTab === 'Artists') {
        if (favoriteArtists.length === 0) return <div className="text-slate-500 mt-10 text-left">No favorite artists yet.</div>;
        return (
            <div className="space-y-1">
            {favoriteArtists.map((artist) => (
              <div 
                key={artist.id} 
                onClick={() => navigate(`/artist/${artist.id}`)}
                className="group flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-5">
                  <img src={artist.avatarUrl} alt={artist.name} className="w-14 h-14 rounded-full object-cover shadow-lg" />
                  <div>
                    <h4 className="font-bold text-lg text-white mb-1">{artist.name}</h4>
                    <p className="text-slate-500 text-sm font-medium">{artist.followers} Followers</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 pr-4">
                   <button 
                     onClick={(e) => { e.stopPropagation(); handleToggleFavoriteLocal(artist.id, 'artist'); }}
                     className="p-2 text-rose-500 hover:scale-110 transition-transform cursor-pointer"
                   >
                    <Heart className="w-6 h-6 fill-current" />
                  </button>
                  <button className="p-2 text-slate-600 hover:text-white transition-colors cursor-pointer">
                    <MoreHorizontal className="w-6 h-6" />
                  </button>
                </div>
              </div>
            ))}
            </div>
        );
    }
    
    if (activeTab === 'Playlists') {
         if (favoritePlaylists.length === 0) return <div className="text-slate-500 mt-10 text-left">No favorite playlists yet.</div>;
         return (
            <div className="space-y-1">
            {favoritePlaylists.map((pl) => (
              <div 
                key={pl.id} 
                onClick={() => navigate(`/playlist/${pl.id}`)}
                className="group flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-[#2c2c2e] flex items-center justify-center text-slate-400 shadow-lg">
                    {pl.coverUrl ? (
                         <img src={pl.coverUrl} className="w-full h-full object-cover rounded-2xl" alt={pl.name} />
                     ) : (
                        <ListMusic className="w-7 h-7" />
                     )}
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-white mb-1">{pl.name}</h4>
                    <p className="text-slate-500 text-sm font-medium">{pl.songIds.length} Songs</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 pr-4">
                   <button 
                     onClick={(e) => { e.stopPropagation(); handleToggleFavoriteLocal(pl.id, 'playlist'); }}
                     className="p-2 text-rose-500 hover:scale-110 transition-transform cursor-pointer"
                   >
                    <Heart className="w-6 h-6 fill-current" />
                  </button>
                  <button className="p-2 text-slate-600 hover:text-white transition-colors cursor-pointer">
                    <MoreHorizontal className="w-6 h-6" />
                  </button>
                </div>
              </div>
            ))}
            </div>
        );
    }
  };

  return (
    <div className="p-10 pb-10 w-full">
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-white mb-8 tracking-tight">Favorite</h1>
        
        {/* Tabs */}
        <div className="flex items-center justify-start gap-3">
          {(['Playlists', 'Artists', 'Albums', 'Songs'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-8 py-3 rounded-full text-sm font-bold transition-all cursor-pointer ${
                activeTab === tab
                  ? 'bg-[#2c2c2e] text-white shadow-lg shadow-black/20 scale-105'
                  : 'text-slate-500 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="min-h-[400px] animate-in slide-in-from-bottom-4 fade-in duration-500 max-w-5xl">
        {renderContent()}
      </div>
    </div>
  );
};

export default Favorites;
