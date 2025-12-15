
import React, { useState, useEffect } from 'react';
import { Song, Album, Artist } from '../types';
import { BackButton } from '../components/BackButton';
import { EditModal } from '../components/EditModal';
import { Camera, Edit3, Heart, ListPlus, Mic2, Music, Pause, Play, Trash2, Wand2, Sparkles } from 'lucide-react';
import { SongDetailSkeleton } from '../components/Skeletons';
import * as api from '../services/api';
import { useParams, useNavigate } from 'react-router-dom';

interface DetailProps {
  songs: Song[];
  albums?: Album[];
  artists?: Artist[];
  currentSongId?: string;
  isPlaying: boolean;
  onPlaySong: (song: Song, context?: Song[]) => void;
  onPlayContext: (context: Song[]) => void;
  onToggleFavorite: (id: string) => void;
  onAddToPlaylist: (song: Song) => void;
  onUpdateSong?: (song: Song) => void;
}

export const SongDetails: React.FC<DetailProps> = ({ songs, currentSongId, isPlaying, onPlaySong, onToggleFavorite, onAddToPlaylist, onUpdateSong }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [song, setSong] = useState<Song | undefined>(songs.find(s => s.id === id));
  const [loading, setLoading] = useState(!song);
  const [lyrics, setLyrics] = useState<string>("");
  const [isEditingLyrics, setIsEditingLyrics] = useState(false);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  
  // Identify State
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [isIdentifyingSpotify, setIsIdentifyingSpotify] = useState(false);
  const [identifyError, setIdentifyError] = useState<string | null>(null);

  useEffect(() => {
    // If song is not found in initial props (e.g. refresh or direct link), fetch it
    if (!song && id) {
        setLoading(true);
        api.getSong(id)
            .then(data => {
                setSong(data);
                if (data.lyrics) setLyrics(data.lyrics);
            })
            .catch(err => {
                console.error("Failed to fetch song", err);
            })
            .finally(() => setLoading(false));
    } else if (song?.lyrics) {
      setLyrics(song.lyrics);
    }
  }, [id, song]);

  // Update local state if props change (e.g. favorite toggle from parent)
  useEffect(() => {
      const propSong = songs.find(s => s.id === id);
      if (propSong) {
          setSong(propSong);
          if (propSong.lyrics) setLyrics(propSong.lyrics);
      }
  }, [songs, id]);

  if (loading) {
      return <SongDetailSkeleton />;
  }

  if (!song) {
      return (
          <div className="min-h-full flex items-center justify-center">
              <p className="text-slate-400">Song not found</p>
          </div>
      );
  }

  const handleSaveInfo = async (data: any) => {
    try {
        // Split comma-separated genres back into array
        const genres = data.genre.split(',').map((g: string) => g.trim()).filter(Boolean);

        const updated = await api.updateSong(song.id, {
            title: data.title,
            artist: data.artist,
            album: data.album,
            genre: genres
        });
        setSong(updated);
        onUpdateSong?.(updated);
        setIsEditingInfo(false);
    } catch (err) {
        console.error("Failed to update song info", err);
    }
  };

  const handleSaveLyrics = async () => {
    try {
        const updated = await api.updateSongLyrics(song.id, lyrics);
        setSong(updated);
        onUpdateSong?.(updated);
        setIsEditingLyrics(false);
    } catch (err) {
        console.error("Failed to update lyrics", err);
    }
  };

  const handleCoverUpload = async (file: File) => {
    try {
      const updated = await api.updateSongCover(song.id, file);
      setSong(updated);
      onUpdateSong?.(updated);
    } catch (err) {
      console.error("Failed to update song cover", err);
    }
  };
  
  const handleIdentify = async () => {
      if (isIdentifying) return;
      setIsIdentifying(true);
      setIdentifyError(null);
      try {
          const updated = await api.identifySong(song.id);
          setSong(updated);
          onUpdateSong?.(updated);
      } catch (e: any) {
          setIdentifyError(e.message || "Identification failed");
          setTimeout(() => setIdentifyError(null), 4000);
      } finally {
          setIsIdentifying(false);
      }
  };

  const handleIdentifySpotify = async () => {
      if (isIdentifyingSpotify) return;
      setIsIdentifyingSpotify(true);
      setIdentifyError(null);
      try {
          const updated = await api.identifySongSpotify(song.id);
          setSong(updated);
          onUpdateSong?.(updated);
      } catch (e: any) {
          setIdentifyError(e.message || "Spotify identification failed");
          setTimeout(() => setIdentifyError(null), 4000);
      } finally {
          setIsIdentifyingSpotify(false);
      }
  };

  const handleDelete = async () => {
      if (window.confirm(`Are you sure you want to delete "${song.title}" from your library?`)) {
          try {
              await api.deleteSong(song.id);
              navigate(-1);
          } catch (e) {
              console.error("Failed to delete song", e);
          }
      }
  };

  const renderArtists = () => {
      if (song.artists && song.artists.length > 0) {
          return song.artists.map((artist, i) => (
              <React.Fragment key={artist.id}>
                  {i > 0 && <span className="text-indigo-300/50">, </span>}
                  <span 
                      className="cursor-pointer hover:text-white transition-colors hover:underline"
                      onClick={() => navigate(`/artist/${artist.id}`)}
                  >
                      {artist.name}
                  </span>
              </React.Fragment>
          ));
      }
      return song.artist;
  };


  return (
    <div className="min-h-full flex flex-col p-8 pb-10 relative overflow-hidden animate-fade-in-up">
      {/* Ambient Backdrops */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-rose-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col gap-10">
        <div className="flex justify-start">
          <BackButton />
        </div>

        {/* Top Section: Split Image and Details */}
        <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-12 items-end">
          
          {/* Left: Album Art */}
          <div className="relative group w-80 h-80 rounded-[2.5rem] overflow-hidden shadow-2xl flex-shrink-0 mx-auto lg:mx-0">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] bg-indigo-500/30 blur-3xl rounded-full opacity-50 -z-10"></div>
              <img
                src={song.coverUrl}
                alt={song.title}
                className="w-full h-full object-cover relative z-10"
              />
              
              {/* Image Upload Overlay */}
              <label className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-20">
                <Camera className="w-10 h-10 text-white mb-2" />
                <span className="text-white font-medium text-sm">Change Image</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleCoverUpload(e.target.files[0]);
                    }
                  }}
                />
              </label>
          </div>

          {/* Right: Info & Controls */}
          <div className="flex flex-col gap-6 w-full min-w-0">
             
             {/* Admin Controls (Floating Top Right relative to this block) */}
             <div className="flex justify-end">
                <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 shadow-xl">
                    <button 
                        onClick={handleIdentify}
                        disabled={isIdentifying}
                        title="Identify Song with MusicBrainz"
                        className={`p-2 text-slate-300 hover:text-white rounded-xl hover:bg-white/10 transition-all ${isIdentifying ? 'animate-pulse text-indigo-400' : ''}`}
                    >
                        <Wand2 className="w-5 h-5"/>
                    </button>
                    <button 
                        onClick={handleIdentifySpotify}
                        disabled={isIdentifyingSpotify}
                        title="Find Metadata on Spotify"
                        className={`p-2 text-slate-300 hover:text-green-400 rounded-xl hover:bg-white/10 transition-all ${isIdentifyingSpotify ? 'animate-pulse text-green-400' : ''}`}
                    >
                        <Sparkles className="w-5 h-5"/>
                    </button>
                    <button onClick={() => setIsEditingInfo(true)} className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-white/10" title="Edit Info">
                        <Edit3 className="w-5 h-5"/>
                    </button>
                    <div className="w-[1px] h-5 bg-white/20 mx-1"></div>
                    <button onClick={handleDelete} className="p-2 text-rose-400 hover:text-rose-300 rounded-xl hover:bg-rose-500/20" title="Delete Song">
                        <Trash2 className="w-5 h-5"/>
                    </button>
                </div>
                {identifyError && (
                    <div className="absolute top-0 right-0 bg-rose-500/90 text-white text-xs px-3 py-2 rounded-xl animate-in fade-in slide-in-from-bottom-1 shadow-lg border border-rose-400/50 z-50">
                        {identifyError}
                    </div>
                )}
             </div>

             <div>
                <h1 className="text-4xl md:text-6xl font-black text-white mb-2 tracking-tight leading-tight">{song.title}</h1>
                <p className="text-2xl text-indigo-300 font-medium">{renderArtists()}</p>
             </div>

             <div className="flex items-center justify-start gap-4 flex-wrap">
                <button
                  onClick={() => onPlaySong(song)}
                  className="px-8 py-3 bg-white text-black rounded-full font-bold flex items-center gap-2 hover:scale-105 transition-transform"
                >
                  {currentSongId === song.id && isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                  {currentSongId === song.id && isPlaying ? "Pause" : "Play"}
                </button>
                <button
                  onClick={() => onToggleFavorite(song.id)}
                  className={`p-3 rounded-full border border-white/10 hover:bg-white/10 transition-colors ${song.isFavorite ? 'text-rose-500' : 'text-slate-400'}`}
                >
                  <Heart className={`w-6 h-6 ${song.isFavorite ? 'fill-current' : ''}`} />
                </button>
                <button
                  onClick={() => onAddToPlaylist(song)}
                  className="p-3 rounded-full border border-white/10 hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
                  title="Add to Playlist"
                >
                  <ListPlus className="w-6 h-6" />
                </button>
             </div>

             {/* Metadata Grid (Moved here) */}
             <div className="grid grid-cols-2 md:grid-cols-6 gap-4 w-full bg-white/5 p-6 rounded-3xl border border-white/5 mt-2">
                <div className="flex flex-col gap-1 md:col-span-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Album</span>
                    <span 
                    className="text-white font-medium truncate cursor-pointer hover:text-indigo-400 transition-colors hover:underline"
                    onClick={() => song.albumId && navigate(`/album/${song.albumId}`)}
                    >
                    {song.album}
                    </span>
                </div>
                <div className="flex flex-col gap-1 md:col-span-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Genre</span>
                    <span className="text-white font-medium truncate">
                    {song.genre.join(', ')}
                    </span>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Length</span>
                    <span className="text-white font-medium">{song.duration}</span>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Format</span>
                    <div className="flex items-center gap-2">
                    <span className="bg-white/10 text-xs px-2 py-0.5 rounded text-indigo-200 uppercase">{song.format}</span>
                    </div>
                </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Lyrics (Full Width) */}
        <div className="w-full">
            <div className="bg-[#1c1c1e]/80 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-10 flex flex-col min-h-[400px] shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-8 relative z-10">
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Mic2 className="w-6 h-6 text-indigo-400" /> Lyrics
                </h3>
                {!isEditingLyrics && (
                  <button
                    onClick={() => setIsEditingLyrics(true)}
                    className="text-sm font-bold text-slate-400 hover:text-white bg-white/5 px-4 py-2 rounded-full transition-colors"
                  >
                    {lyrics ? 'Edit Lyrics' : 'Add Lyrics'}
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
                {isEditingLyrics ? (
                  <div className="h-full flex flex-col">
                    <textarea
                      value={lyrics}
                      onChange={(e) => setLyrics(e.target.value)}
                      placeholder="Paste lyrics here..."
                      className="w-full min-h-[300px] bg-black/20 text-white rounded-xl p-6 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xl leading-relaxed font-medium placeholder:text-slate-600 mb-4"
                    />
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => setIsEditingLyrics(false)}
                        className="px-6 py-2 rounded-full font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveLyrics}
                        className="px-6 py-2 rounded-full font-bold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-lg"
                      >
                        Save Lyrics
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    {lyrics ? (
                      <p className="whitespace-pre-line text-2xl leading-relaxed text-slate-300 font-medium text-center max-w-4xl mx-auto">
                        {lyrics}
                      </p>
                    ) : (
                      <div className="text-center py-10">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-500">
                          <Music className="w-8 h-8" />
                        </div>
                        <h4 className="text-lg font-bold text-white mb-2">No Lyrics Available</h4>
                        <p className="text-slate-500 max-w-xs mx-auto mb-6">You can add lyrics for this song to sing along.</p>
                        <button
                          onClick={() => setIsEditingLyrics(true)}
                          className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all"
                        >
                          Add Lyrics
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
        </div>
      </div>
      
      {isEditingInfo && (
        <EditModal
            title="Edit Song Info"
            onClose={() => setIsEditingInfo(false)}
            onSave={handleSaveInfo}
            fields={[
                { name: 'title', label: 'Title', value: song.title },
                { name: 'artist', label: 'Artist', value: song.artist },
                { name: 'album', label: 'Album', value: song.album },
                { name: 'genre', label: 'Genre (comma separated)', value: song.genre.join(', ') }
            ]}
        />
      )}
    </div>
  );
};
