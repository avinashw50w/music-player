
import React, { useState } from 'react';
import { FolderOpen, ArrowRight, Music, Play, Pause, ListMusic, RefreshCw, FolderSearch } from 'lucide-react';
import { Song, Album, Artist, Playlist } from '../types';
import PlayingIndicator from '../components/PlayingIndicator';
import { scanLibrary, refreshLibrary, ScanStatus } from '../services/api';
import { useNavigate } from 'react-router-dom';

interface BrowseProps {
  onImportSongs: (songs: Song[]) => void;
  onPlaySong: (song: Song) => void;
  currentSongId?: string;
  isPlaying?: boolean;
  albums: Album[];
  artists: Artist[];
  songs: Song[];
  playlists: Playlist[];
  // Scan props from App
  scanStatus: ScanStatus | null;
  isScanning: boolean;
  scanError: string | null;
  setScanError: (err: string | null) => void;
  setIsScanning: (scanning: boolean) => void;
}

const Browse: React.FC<BrowseProps> = ({
  onImportSongs,
  onPlaySong,
  currentSongId,
  isPlaying,
  albums,
  artists,
  songs,
  playlists,
  scanStatus,
  isScanning,
  scanError,
  setScanError,
  setIsScanning
}) => {
  const [scanPath, setScanPath] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleScan = async () => {
    if (!scanPath.trim()) return;
    try {
      setIsScanning(true);
      setScanError(null);
      await scanLibrary(scanPath);
    } catch (e: any) {
      setScanError(e.message || 'Failed to start scan');
      setIsScanning(false);
    }
  };

  const handleRefreshLibrary = async () => {
      try {
          setIsRefreshing(true);
          const result = await refreshLibrary();
          setRefreshMessage(result.message);
          setTimeout(() => setRefreshMessage(null), 5000);
          onImportSongs([]); // Trigger re-fetch
      } catch (e: any) {
          setRefreshMessage(`Failed: ${e.message}`);
      } finally {
          setIsRefreshing(false);
      }
  };

  // Helper to check if an album is active (contains the current song)
  const isAlbumActive = (albumTitle: string) => {
    const currentSong = songs.find(s => s.id === currentSongId);
    return currentSong?.album === albumTitle;
  };

  const genres = [
    { title: 'Pop', color: 'bg-purple-600' },
    { title: 'Rock', color: 'bg-red-600' },
    { title: 'Jazz', color: 'bg-blue-600' },
    { title: 'Hip Hop', color: 'bg-orange-600' },
    { title: 'Classical', color: 'bg-slate-600' },
    { title: 'Electronic', color: 'bg-emerald-600' },
  ];

  const moods = [
    { title: 'Chill', img: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300' },
    { title: 'Focus', img: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=300' },
    { title: 'Party', img: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=300' },
    { title: 'Workout', img: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=300' },
  ];

  return (
    <div className="p-10 pb-10">
      <div className="flex justify-between items-center mb-10 animate-fade-in-up">
          <h1 className="text-4xl font-bold text-white">Browse</h1>
          <button 
            onClick={handleRefreshLibrary}
            disabled={isRefreshing || isScanning}
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

      {/* Library Scanner Section */}
      <div className="mb-14 bg-gradient-to-br from-[#1e1e24] to-[#151518] rounded-[2rem] p-8 border border-white/5 shadow-2xl relative overflow-hidden animate-fade-in-up delay-100">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
        
        <div className="relative z-10">
             <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                    <FolderSearch className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white">Scan Local Library</h2>
                    <p className="text-slate-400">Add music from a folder on your computer</p>
                </div>
             </div>

             {/* Input Area */}
             {!isScanning ? (
                 <div className="flex gap-4">
                    <div className="flex-1 relative">
                        <input 
                            type="text" 
                            value={scanPath}
                            onChange={(e) => setScanPath(e.target.value)}
                            placeholder="Enter full folder path (e.g. C:\Music or /Users/Name/Music)"
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono text-sm"
                        />
                    </div>
                    <button 
                        onClick={handleScan}
                        disabled={!scanPath.trim()}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-lg hover:shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                        Start Scan
                    </button>
                 </div>
             ) : (
                 <div className="bg-black/40 rounded-xl p-6 border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                         <span className="text-indigo-300 font-bold text-sm uppercase tracking-wider animate-pulse">Scanning...</span>
                         <span className="text-white font-bold">{scanStatus?.progress || 0}%</span>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-4">
                        <div 
                            className="h-full bg-indigo-500 transition-all duration-300"
                            style={{ width: `${scanStatus?.progress || 0}%` }}
                        ></div>
                    </div>
                    <p className="text-slate-400 text-sm font-mono truncate">
                        {scanStatus?.currentFile || 'Initializing...'}
                    </p>
                 </div>
             )}

             {scanError && (
                 <div className="mt-4 text-rose-400 text-sm font-medium bg-rose-500/10 px-4 py-3 rounded-xl border border-rose-500/20">
                     Error: {scanError}
                 </div>
             )}
        </div>
      </div>


      {/* Top Songs Section */}
      {songs.length > 0 && (
        <div className="mb-14 animate-fade-in-up delay-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Top Songs</h2>
            <button 
                onClick={() => navigate('/library/songs')}
                className="text-slate-400 text-base font-bold hover:text-white flex items-center gap-1"
            >
                See all <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {songs.slice(0, 4).map(song => {
              const isCurrent = currentSongId === song.id;
              const isCurrentPlaying = isCurrent && isPlaying;

              return (
                <div
                  key={song.id}
                  onClick={() => onPlaySong(song)}
                  className={`p-4 rounded-2xl hover:bg-white/10 transition-all group cursor-pointer border ${isCurrent ? 'bg-white/10 border-indigo-500/50 shadow-lg shadow-indigo-900/20' : 'bg-white/5 border-white/5'}`}
                >
                  <div className="relative mb-4 overflow-hidden rounded-xl">
                    <img src={song.coverUrl} className="w-full aspect-square object-cover shadow-md transition-transform duration-500 group-hover:scale-105" alt={song.title} />

                    {/* Hover Overlay & Play Controls */}
                    <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300 ${isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                      {isCurrentPlaying ? (
                        <>
                          {/* Visualizer when playing, hidden on hover to show pause */}
                          <div className="absolute inset-0 flex items-center justify-center group-hover:opacity-0 transition-opacity">
                            <div className="w-12 h-12 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center">
                              <PlayingIndicator />
                            </div>
                          </div>
                          {/* Pause button shown on hover */}
                          <button className="w-12 h-12 bg-indigo-500 text-white rounded-full flex items-center justify-center hover:scale-110 transition-all opacity-0 group-hover:opacity-100 shadow-lg transform translate-y-2 group-hover:translate-y-0">
                            <Pause className="w-5 h-5 fill-current" />
                          </button>
                        </>
                      ) : (
                        <button className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center hover:scale-110 transition-all shadow-lg transform translate-y-2 group-hover:translate-y-0">
                          <Play className="w-5 h-5 fill-current ml-0.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <h4 className={`font-bold text-lg truncate transition-colors ${isCurrent ? 'text-indigo-400' : 'text-white'}`}>{song.title}</h4>
                  <p className="text-slate-500 text-sm truncate">{song.artist}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* New Albums Section */}
      {albums.length > 0 && (
        <div className="mb-14 animate-fade-in-up delay-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Albums</h2>
            <button 
                onClick={() => navigate('/library/albums')}
                className="text-slate-400 text-base font-bold hover:text-white flex items-center gap-1"
            >
                See all <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {albums.slice(0, 4).map(album => {
              const active = isAlbumActive(album.title);
              const activePlaying = active && isPlaying;

              return (
                <div
                  key={album.id}
                  onClick={() => navigate(`/album/${album.id}`)}
                  className={`p-4 rounded-2xl hover:bg-white/10 transition-all group cursor-pointer border ${active ? 'bg-white/10 border-indigo-500/50 shadow-lg shadow-indigo-900/20' : 'bg-white/5 border-white/5'}`}
                >
                  <div className="relative mb-4 overflow-hidden rounded-xl">
                    <img src={album.coverUrl} className="w-full aspect-square object-cover shadow-md transition-transform duration-500 group-hover:scale-105" alt={album.title} />

                    {/* Hover Overlay & Play Controls */}
                    <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300 ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                      {activePlaying ? (
                        <>
                          <div className="absolute inset-0 flex items-center justify-center group-hover:opacity-0 transition-opacity">
                            <div className="w-12 h-12 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center">
                              <PlayingIndicator />
                            </div>
                          </div>
                          <div className="w-12 h-12 bg-indigo-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 shadow-lg">
                            <Music className="w-5 h-5" />
                          </div>
                        </>
                      ) : (
                        <button className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center hover:scale-110 transition-all shadow-lg transform translate-y-2 group-hover:translate-y-0">
                          <Play className="w-5 h-5 fill-current ml-0.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <h4 className={`font-bold text-lg truncate transition-colors ${active ? 'text-indigo-400' : 'text-white'}`}>{album.title}</h4>
                  <p className="text-slate-500 text-sm truncate">{album.artist}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Playlists Section */}
      {playlists.length > 0 && (
        <div className="mb-14 animate-fade-in-up delay-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Playlists</h2>
            <button 
                onClick={() => navigate('/library/playlists')}
                className="text-slate-400 text-base font-bold hover:text-white flex items-center gap-1"
            >
                See all <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {playlists.slice(0, 4).map(playlist => (
               <div
                  key={playlist.id}
                  onClick={() => navigate(`/playlist/${playlist.id}`)}
                  className="p-4 rounded-2xl hover:bg-white/10 transition-all group cursor-pointer border bg-white/5 border-white/5"
                >
                  <div className="relative mb-4 overflow-hidden rounded-xl bg-[#2c2c2e] aspect-square flex items-center justify-center shadow-md">
                     {playlist.coverUrl ? (
                         <img src={playlist.coverUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={playlist.name} />
                     ) : (
                        <ListMusic className="w-20 h-20 text-slate-500 group-hover:scale-110 transition-transform duration-500" />
                     )}
                     
                     <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <button className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center hover:scale-110 transition-all shadow-lg transform translate-y-2 group-hover:translate-y-0">
                          <Play className="w-5 h-5 fill-current ml-0.5" />
                        </button>
                     </div>
                  </div>

                  <h4 className="font-bold text-lg truncate text-white">{playlist.name}</h4>
                  <p className="text-slate-500 text-sm truncate">{playlist.songIds.length} Songs</p>
                </div>
            ))}
          </div>
        </div>
      )}

      {/* Artists Section */}
      {artists.length > 0 && (
        <div className="mb-14 animate-fade-in-up delay-300">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Artists</h2>
            <button 
                onClick={() => navigate('/library/artists')}
                className="text-slate-400 text-base font-bold hover:text-white flex items-center gap-1"
            >
                See all <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
            {artists.slice(0, 6).map(artist => (
              <div
                key={artist.id}
                onClick={() => navigate(`/artist/${artist.id}`)}
                className="flex flex-col items-center text-center cursor-pointer group"
              >
                <img src={artist.avatarUrl} className="w-32 h-32 rounded-full object-cover mb-4 shadow-lg group-hover:scale-105 transition-transform border-4 border-white/5 group-hover:border-indigo-500/30" alt={artist.name} />
                <h4 className="text-white font-bold text-base truncate w-full group-hover:text-indigo-400 transition-colors">{artist.name}</h4>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Genres */}
      <div className="mb-14 animate-fade-in-up delay-300">
        <h2 className="text-2xl font-bold text-white mb-6">Genres</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {genres.map(genre => (
            <div key={genre.title} className={`${genre.color} h-28 rounded-2xl p-5 relative overflow-hidden cursor-pointer hover:scale-[1.03] transition-transform shadow-lg group`}>
              <span className="font-bold text-white text-xl relative z-10 group-hover:scale-105 block transition-transform">{genre.title}</span>
              <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-white/20 rounded-full blur-xl group-hover:scale-125 transition-transform duration-500"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Moods */}
      <div className="animate-fade-in-up delay-300">
        <h2 className="text-2xl font-bold text-white mb-6">Moods</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {moods.map(mood => (
            <div key={mood.title} className="relative h-48 rounded-3xl overflow-hidden cursor-pointer group shadow-lg">
              <img src={mood.img} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={mood.title} />
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors"></div>
              <span className="absolute bottom-5 left-6 text-white font-bold text-2xl group-hover:translate-x-2 transition-transform">{mood.title}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Browse;
