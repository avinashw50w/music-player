import React, { useRef, useState } from 'react';
import { FolderOpen, ArrowRight, Music, UploadCloud, Play, Pause, ListMusic } from 'lucide-react';
import { Song, Album, Artist, NavigationState, Playlist } from '../types';
import PlayingIndicator from '../components/PlayingIndicator';
import { uploadFolder, UploadProgress } from '../services/api';

interface BrowseProps {
  onImportSongs: (songs: Song[]) => void;
  onNavigate: (view: NavigationState['view'], id?: string) => void;
  onPlaySong: (song: Song) => void;
  currentSongId?: string;
  isPlaying?: boolean;
  albums: Album[];
  artists: Artist[];
  songs: Song[];
  playlists: Playlist[];
}

const Browse: React.FC<BrowseProps> = ({
  onImportSongs,
  onNavigate,
  onPlaySong,
  currentSongId,
  isPlaying,
  albums,
  artists,
  songs,
  playlists
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [folderName, setFolderName] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Helper to check if an album is active (contains the current song)
  const isAlbumActive = (albumTitle: string) => {
    const currentSong = songs.find(s => s.id === currentSongId);
    return currentSong?.album === albumTitle;
  };

  const handleFolderSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const fileArray: File[] = Array.from(files) as File[];
      const audioFiles = fileArray.filter(
        (f: File) => f.type.startsWith('audio/') ||
          f.name.endsWith('.mp3') ||
          f.name.endsWith('.flac') ||
          f.name.endsWith('.m4a') ||
          f.name.endsWith('.wav')
      );

      if (audioFiles.length === 0) {
        setUploadError('No audio files found in the selected folder');
        return;
      }

      const path = files[0].webkitRelativePath;
      const folder = path.split('/')[0];
      setFolderName(folder || 'Selected Folder');
      setIsUploading(true);
      setUploadProgress({ loaded: 0, total: 0, percentage: 0 });
      setUploadError(null);

      try {
        const result = await uploadFolder(audioFiles, (progress) => {
          setUploadProgress(progress);
        });

        if (result.songs && result.songs.length > 0) {
          onImportSongs(result.songs);
          setImportedCount(result.count);
        }
      } catch (err) {
        console.error('Upload failed:', err);
        setUploadError('Failed to upload files. Make sure the backend is running.');
        setFolderName(null);
      } finally {
        setIsUploading(false);
        setUploadProgress(null);
      }
    }
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
    <div className="p-10 pb-40">
      <h1 className="text-4xl font-bold text-white mb-10">Browse</h1>

      {/* Local Files Section */}
      <div className="mb-14">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Import Music</h2>
        </div>

        {/* Upload Progress */}
        {isUploading && uploadProgress && (
          <div className="mb-6 bg-indigo-900/30 border border-indigo-500/30 rounded-2xl p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center">
                <UploadCloud className="w-5 h-5 text-indigo-400 animate-pulse" />
              </div>
              <div className="flex-1">
                <p className="text-white font-bold">Uploading music...</p>
                <p className="text-indigo-300 text-sm">Processing files from "{folderName}"</p>
              </div>
              <span className="text-2xl font-bold text-indigo-400">{uploadProgress.percentage}%</span>
            </div>
            <div className="w-full h-3 bg-black/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress.percentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Error Message */}
        {uploadError && (
          <div className="mb-6 bg-red-900/30 border border-red-500/30 rounded-2xl p-4 text-red-300">
            {uploadError}
          </div>
        )}

        {!folderName && !isUploading ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-white/10 rounded-3xl p-12 flex flex-col items-center justify-center text-center hover:bg-white/5 transition-all cursor-pointer group bg-white/[0.02]"
          >
            <div className="w-24 h-24 bg-indigo-500/20 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <UploadCloud className="w-10 h-10 text-indigo-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Import Local Folder</h3>
            <p className="text-slate-400 text-lg max-w-md">Select a folder from your device to add all audio files to your library instantly.</p>
          </div>
        ) : !isUploading ? (
          <div className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-white/10 rounded-3xl p-8 flex items-center gap-6 shadow-xl">
            <div className="w-20 h-20 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-lg">
              <FolderOpen className="w-10 h-10 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-white mb-1">Successfully Imported!</h3>
              <p className="text-indigo-200 text-lg">Added {importedCount} songs from <span className="font-bold text-white">"{folderName}"</span> to your library.</p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-white transition-colors"
            >
              Import Another
            </button>
          </div>
        ) : null}
        <input type="file" ref={fileInputRef} className="hidden" webkitdirectory="" directory="" multiple onChange={handleFolderSelect} />
      </div>

      {/* Top Songs Section */}
      {songs.length > 0 && (
        <div className="mb-14">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Top Songs</h2>
            <button 
                onClick={() => onNavigate('all_songs')}
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
        <div className="mb-14">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Albums</h2>
            <button 
                onClick={() => onNavigate('all_albums')}
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
                  onClick={() => onNavigate('album_details', album.id)}
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
        <div className="mb-14">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Playlists</h2>
            <button 
                onClick={() => onNavigate('all_playlists')}
                className="text-slate-400 text-base font-bold hover:text-white flex items-center gap-1"
            >
                See all <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {playlists.slice(0, 4).map(playlist => (
               <div
                  key={playlist.id}
                  onClick={() => onNavigate('playlist_details', playlist.id)}
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
        <div className="mb-14">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Artists</h2>
            <button 
                onClick={() => onNavigate('all_artists')}
                className="text-slate-400 text-base font-bold hover:text-white flex items-center gap-1"
            >
                See all <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
            {artists.slice(0, 6).map(artist => (
              <div
                key={artist.id}
                onClick={() => onNavigate('artist_details', artist.id)}
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
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-white mb-6">Genres</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {genres.map(genre => (
            <div key={genre.title} className={`${genre.color} h-28 rounded-2xl p-5 relative overflow-hidden cursor-pointer hover:scale-[1.03] transition-transform shadow-lg`}>
              <span className="font-bold text-white text-xl relative z-10">{genre.title}</span>
              <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-white/20 rounded-full blur-xl"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Moods */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Moods</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {moods.map(mood => (
            <div key={mood.title} className="relative h-48 rounded-3xl overflow-hidden cursor-pointer group shadow-lg">
              <img src={mood.img} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={mood.title} />
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors"></div>
              <span className="absolute bottom-5 left-6 text-white font-bold text-2xl">{mood.title}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// @ts-ignore - webkitdirectory is a non-standard attribute
declare module 'react' {
  interface InputHTMLAttributes<T> {
    webkitdirectory?: string;
    directory?: string;
  }
}

export default Browse;