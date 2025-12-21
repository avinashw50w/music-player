
import React, { useState, useMemo } from 'react';
import { ArrowRight, Music, Play, Pause, ListMusic, RefreshCw, Mic2, Disc, Tags } from 'lucide-react';
import { Song, Album, Artist, Playlist } from '../types';
import PlayingIndicator from '../components/PlayingIndicator';
import { refreshLibrary, ScanStatus } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { LibraryScanner } from '../components/LibraryScanner';

interface BrowseProps {
  onImportSongs: (songs: Song[]) => void;
  onPlaySong: (song: Song) => void;
  currentSongId?: string;
  isPlaying?: boolean;
  albums: Album[];
  artists: Artist[];
  songs: Song[];
  playlists: Playlist[];
  scanStatus: ScanStatus | null;
  isScanning: boolean;
  scanError: string | null;
  setScanError: (err: string | null) => void;
  setIsScanning: (scanning: boolean) => void;
}

const Browse: React.FC<BrowseProps> = (props) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleRefreshLibrary = async () => {
      try {
          setIsRefreshing(true);
          const result = await refreshLibrary();
          setRefreshMessage(result.message);
          setTimeout(() => setRefreshMessage(null), 5000);
          props.onImportSongs([]); 
      } catch (e: any) {
          setRefreshMessage(`Failed: ${e.message}`);
      } finally {
          setIsRefreshing(false);
      }
  };

  const isAlbumActive = (albumTitle: string) => {
    const song = props.songs.find(s => s.id === props.currentSongId);
    return song?.album === albumTitle;
  };

  // Derive Top Genres from Songs
  const genres = useMemo(() => {
    const genreCounts: Record<string, number> = {};
    props.songs.forEach(s => {
      s.genre?.forEach(g => {
        if (g && g !== 'Unknown') genreCounts[g] = (genreCounts[g] || 0) + 1;
      });
    });
    return Object.entries(genreCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8) // Top 8
      .map(([name]) => name);
  }, [props.songs]);

  const genreColors = [
    'from-pink-500 to-rose-500',
    'from-purple-500 to-indigo-500',
    'from-blue-500 to-cyan-500',
    'from-red-500 to-orange-500',
    'from-emerald-500 to-teal-500',
    'from-amber-500 to-yellow-500',
    'from-fuchsia-500 to-purple-600',
    'from-sky-500 to-blue-600'
  ];

  return (
    <div className="p-10 pb-10">
      <div className="flex justify-between items-center mb-10 animate-fade-in-up">
          <h1 className="text-4xl font-bold text-white">Browse</h1>
          <button 
            onClick={handleRefreshLibrary}
            disabled={isRefreshing || props.isScanning}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full font-bold text-sm text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Library
          </button>
      </div>
      
      {refreshMessage && (
          <div className="mb-6 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 px-6 py-4 rounded-2xl animate-in fade-in slide-in-from-top-2">
              {refreshMessage}
          </div>
      )}

      <LibraryScanner 
        scanStatus={props.scanStatus}
        isScanning={props.isScanning}
        scanError={props.scanError}
        onScanStart={props.setIsScanning}
        onScanError={props.setScanError}
      />

      {/* Top Songs */}
      {props.songs.length > 0 && (
        <div className="mb-14 animate-fade-in-up delay-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <Music className="w-6 h-6 text-indigo-400" /> Top Songs
            </h2>
            <button onClick={() => navigate('/library/songs')} className="text-slate-400 text-base font-bold hover:text-white flex items-center gap-1">
                See all <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {props.songs.slice(0, 4).map(song => {
              const isCurrent = props.currentSongId === song.id;
              return (
                <div key={song.id} onClick={() => props.onPlaySong(song)} className={`p-4 rounded-2xl hover:bg-white/10 transition-all group cursor-pointer border ${isCurrent ? 'bg-white/10 border-indigo-500/50' : 'bg-white/5 border-white/5'}`}>
                  <div className="relative mb-4 overflow-hidden rounded-xl">
                    <img src={song.coverUrl} className="w-full aspect-square object-cover" alt="" />
                    <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                      {isCurrent && props.isPlaying ? <PlayingIndicator /> : <Play className="w-12 h-12 text-white fill-current" />}
                    </div>
                  </div>
                  <h4 className={`font-bold text-lg truncate ${isCurrent ? 'text-indigo-400' : 'text-white'}`}>{song.title}</h4>
                  <p className="text-slate-500 text-sm truncate">{song.artist}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Albums */}
      {props.albums.length > 0 && (
        <div className="mb-14 animate-fade-in-up delay-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <Disc className="w-6 h-6 text-emerald-400" /> Albums
            </h2>
            <button onClick={() => navigate('/library/albums')} className="text-slate-400 text-base font-bold hover:text-white flex items-center gap-1">
                See all <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {props.albums.slice(0, 4).map(album => {
              const active = isAlbumActive(album.title);
              return (
                <div key={album.id} onClick={() => navigate(`/album/${album.id}`)} className={`p-4 rounded-2xl hover:bg-white/10 transition-all group cursor-pointer border ${active ? 'bg-white/10 border-indigo-500/50' : 'bg-white/5 border-white/5'}`}>
                  <div className="relative mb-4 overflow-hidden rounded-xl">
                    <img src={album.coverUrl} className="w-full aspect-square object-cover" alt="" />
                    <div className={`absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100`}>
                      <Play className="w-12 h-12 text-white fill-current" />
                    </div>
                  </div>
                  <h4 className={`font-bold text-lg truncate ${active ? 'text-indigo-400' : 'text-white'}`}>{album.title}</h4>
                  <p className="text-slate-500 text-sm truncate">{album.artist}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

       {/* Artists */}
      {props.artists.length > 0 && (
        <div className="mb-14 animate-fade-in-up delay-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <Mic2 className="w-6 h-6 text-rose-400" /> Artists
            </h2>
            <button onClick={() => navigate('/library/artists')} className="text-slate-400 text-base font-bold hover:text-white flex items-center gap-1">
                See all <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {props.artists.slice(0, 6).map((artist, idx) => (
                <div 
                    key={artist.id} 
                    onClick={() => navigate(`/artist/${artist.id}`)}
                    className="flex flex-col items-center group cursor-pointer"
                >
                    <div className="w-32 h-32 rounded-full overflow-hidden mb-3 shadow-lg group-hover:scale-105 transition-transform border-2 border-transparent group-hover:border-white/20">
                        <img src={artist.avatarUrl} alt={artist.name} className="w-full h-full object-cover" />
                    </div>
                    <h4 className="text-white font-bold text-center truncate w-full group-hover:text-rose-400 transition-colors">{artist.name}</h4>
                    <p className="text-slate-500 text-xs font-medium">{artist.followers} Followers</p>
                </div>
            ))}
          </div>
        </div>
      )}

      {/* Genres */}
      {genres.length > 0 && (
        <div className="mb-14 animate-fade-in-up delay-300">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Tags className="w-6 h-6 text-amber-400" /> Genres
                </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
                {genres.map((genre, i) => (
                    <div 
                        key={genre} 
                        className={`h-24 rounded-2xl bg-gradient-to-r ${genreColors[i % genreColors.length]} relative overflow-hidden group cursor-pointer shadow-lg hover:scale-[1.02] transition-transform`}
                    >
                        <div className="absolute inset-0 flex items-center justify-start p-6">
                            <span className="text-white font-bold text-xl drop-shadow-md z-10">{genre}</span>
                        </div>
                        {/* Decorative circle */}
                        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/20 rounded-full blur-xl group-hover:scale-125 transition-transform duration-500"></div>
                    </div>
                ))}
            </div>
        </div>
      )}
    </div>
  );
};

export default Browse;
