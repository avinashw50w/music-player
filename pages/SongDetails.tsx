
import React, { useState, useEffect, useRef } from 'react';
import { Song, Album, Artist } from '../types';
import { BackButton } from '../components/BackButton';
import { EditModal, SuggestionItem } from '../components/EditModal';
import { SuggestionModal } from '../components/SuggestionModal';
import { Camera, Edit3, Heart, ListPlus, Mic2, Music, Pause, Play, Trash2, Wand2, Sparkles, Bot, Search } from 'lucide-react';
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

export const SongDetails: React.FC<DetailProps> = ({ songs, albums, artists, currentSongId, isPlaying, onPlaySong, onToggleFavorite, onAddToPlaylist, onUpdateSong }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [song, setSong] = useState<Song | undefined>(songs.find(s => s.id === id));
  const [loading, setLoading] = useState(!song);
  const [lyrics, setLyrics] = useState<string>("");
  const [isEditingLyrics, setIsEditingLyrics] = useState(false);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  
  // Suggestions State - Typed to handle both strings and rich objects
  const [albumSuggestions, setAlbumSuggestions] = useState<(string | SuggestionItem)[]>([]);
  const [artistSuggestions, setArtistSuggestions] = useState<(string | SuggestionItem)[]>([]);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Identify & Refine State
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [isIdentifyingSpotify, setIsIdentifyingSpotify] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [identifyError, setIdentifyError] = useState<string | null>(null);
  
  // Lyrics Fetching State
  const [isFetchingLyrics, setIsFetchingLyrics] = useState(false);
  
  // Suggestion Modal State
  const [suggestionData, setSuggestionData] = useState<any>(null);

  useEffect(() => {
    // Fetch full details if song is missing OR if lyrics are undefined (incomplete data from list view)
    if (id && (!song || song.lyrics === undefined)) {
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
      setLoading(false);
    }
  }, [id]);

  // Update local state if props change (e.g. favorite toggle from parent)
  // CRITICAL: Preserve lyrics if the incoming prop song (from list) doesn't have them
  useEffect(() => {
      const propSong = songs.find(s => s.id === id);
      if (propSong) {
          setSong(prev => {
              if (prev?.lyrics && propSong.lyrics === undefined) {
                  return { ...propSong, lyrics: prev.lyrics };
              }
              return propSong;
          });
          if (propSong.lyrics) setLyrics(propSong.lyrics);
      }
  }, [songs, id]);

  useEffect(() => {
      if (isEditingInfo && albums) {
          setAlbumSuggestions(albums.map(a => ({ 
              text: a.title, 
              subtext: `${a.trackCount || 0} songs`,
              image: a.coverUrl,
              id: a.id
          })).slice(0, 20));
      }
      if (isEditingInfo && artists) {
          setArtistSuggestions(artists.map(a => ({
              text: a.name,
              image: a.avatarUrl,
              id: a.id
          })).slice(0, 20));
      }
  }, [isEditingInfo, albums, artists]);

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

  const handleFieldChange = (name: string, value: string) => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      
      searchTimeoutRef.current = setTimeout(async () => {
          // Determine query based on field type (multi vs single)
          const query = (name === 'artist' || name === 'genre') 
            ? value.split(',').pop()?.trim() 
            : value.trim();

          if (query && query.length > 1) {
              try {
                  const type = name === 'artist' ? 'artist' : (name === 'album' ? 'album' : undefined);
                  const results = await api.search(query, type ? { type } : undefined);
                  
                  if (name === 'album') {
                      setAlbumSuggestions(results.albums.map(a => ({
                          text: a.title,
                          subtext: `${a.trackCount || 0} songs`,
                          image: a.coverUrl,
                          id: a.id
                      })));
                  } else if (name === 'artist') {
                      setArtistSuggestions(results.artists.map(a => ({
                          text: a.name,
                          image: a.avatarUrl,
                          id: a.id
                      })));
                  }
              } catch (e) {
                  console.error("Error searching suggestions", e);
              }
          }
      }, 300);
  };

  const handleSaveInfo = async (data: any, ids?: Record<string, string>) => {
    try {
        // Split comma-separated genres back into array
        const genres = data.genre.split(',').map((g: string) => g.trim()).filter(Boolean);

        const updated = await api.updateSong(song.id, {
            title: data.title,
            artist: data.artist,
            album: data.album,
            albumId: ids?.album, // Pass the captured album ID if selected
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
          // Now returns candidate metadata, not updated song
          const candidate = await api.identifySong(song.id);
          setSuggestionData(candidate);
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
          // Now returns candidate metadata
          const candidate = await api.identifySongSpotify(song.id);
          setSuggestionData(candidate);
      } catch (e: any) {
          setIdentifyError(e.message || "Spotify identification failed");
          setTimeout(() => setIdentifyError(null), 4000);
      } finally {
          setIsIdentifyingSpotify(false);
      }
  };

  const handleRefine = async () => {
      if (isRefining) return;
      setIsRefining(true);
      setIdentifyError(null);
      try {
          const suggestion = await api.getGeminiSuggestion(song.id);
          setSuggestionData(suggestion);
      } catch (e: any) {
          setIdentifyError(e.message || "Refinement failed");
          setTimeout(() => setIdentifyError(null), 4000);
      } finally {
          setIsRefining(false);
      }
  };

  const handleFetchSyncedLyrics = async () => {
      if (isFetchingLyrics) return;
      setIsFetchingLyrics(true);
      setIdentifyError(null);
      try {
          const updated = await api.fetchSyncedLyrics(song.id);
          setSong(updated);
          setLyrics(updated.lyrics || "");
          onUpdateSong?.(updated);
      } catch (e: any) {
          console.error("Failed to fetch synced lyrics", e);
          setIdentifyError(e.message || "Could not find synced lyrics");
          setTimeout(() => setIdentifyError(null), 4000);
      } finally {
          setIsFetchingLyrics(false);
      }
  };

  const handleApplySuggestion = async (finalData: any) => {
      try {
          const updated = await api.updateSong(song.id, {
              title: finalData.title,
              artist: finalData.artist,
              album: finalData.album,
              genre: finalData.genre,
              year: finalData.year,
              remoteCoverUrl: finalData.coverUrl 
          });
          setSong(updated);
          onUpdateSong?.(updated);
          setSuggestionData(null);
      } catch (e) {
          console.error("Failed to apply suggestion", e);
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
                    <button 
                        onClick={handleRefine}
                        disabled={isRefining}
                        title="Refine Metadata with AI"
                        className={`p-2 text-slate-300 hover:text-indigo-300 rounded-xl hover:bg-white/10 transition-all ${isRefining ? 'animate-pulse text-indigo-300' : ''}`}
                    >
                        <Bot className="w-5 h-5"/>
                    </button>
                    <div className="w-[1px] h-5 bg-white/20 mx-1"></div>
                    <button onClick={() => setIsEditingInfo(true)} className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-white/10" title="Edit Info">
                        <Edit3 className="w-5 h-5"/>
                    </button>
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

             {/* Metadata Grid */}
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
                    {(song.genre || []).join(', ')}
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
                <div className="flex items-center gap-3">
                    {!isEditingLyrics && (
                        <button
                            onClick={handleFetchSyncedLyrics}
                            disabled={isFetchingLyrics}
                            className="text-sm font-bold text-indigo-300 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/20 px-4 py-2 rounded-full transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {isFetchingLyrics ? (
                                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Search className="w-3 h-3" />
                            )}
                            {lyrics ? 'Refetch Synced' : 'Find Synced'}
                        </button>
                    )}
                    {!isEditingLyrics && (
                        <button
                            onClick={() => setIsEditingLyrics(true)}
                            className="text-sm font-bold text-slate-400 hover:text-white bg-white/5 px-4 py-2 rounded-full transition-colors"
                        >
                            {lyrics ? 'Edit Lyrics' : 'Add Lyrics'}
                        </button>
                    )}
                </div>
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
                        <div className="flex items-center justify-center gap-4">
                            <button
                                onClick={handleFetchSyncedLyrics}
                                disabled={isFetchingLyrics}
                                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-indigo-500/25 flex items-center gap-2 disabled:opacity-50"
                            >
                                {isFetchingLyrics ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Searching...
                                    </>
                                ) : (
                                    <>
                                        <Search className="w-4 h-4" />
                                        Find Synced Lyrics
                                    </>
                                )}
                            </button>
                            <button
                                onClick={() => setIsEditingLyrics(true)}
                                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all"
                            >
                                Manual Entry
                            </button>
                        </div>
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
            onFieldChange={handleFieldChange}
            fields={[
                { name: 'title', label: 'Title', value: song.title },
                { 
                    name: 'artist', 
                    label: 'Artist (comma separated)', 
                    value: song.artist, 
                    isMulti: true, // Enable multi-value support
                    suggestions: artistSuggestions
                },
                { 
                    name: 'album', 
                    label: 'Album', 
                    value: song.album, 
                    suggestions: albumSuggestions 
                },
                { 
                    name: 'genre', 
                    label: 'Genre (comma separated)', 
                    value: (song.genre || []).join(', '),
                    isMulti: true // Enable multi-value support
                }
            ]}
        />
      )}

      {suggestionData && (
          <SuggestionModal
              currentData={{
                  title: song.title,
                  artist: song.artist,
                  album: song.album,
                  genre: song.genre || [],
                  coverUrl: song.coverUrl
              }}
              suggestedData={{
                  title: suggestionData.title,
                  artist: suggestionData.artist,
                  album: suggestionData.album || 'Unknown',
                  genre: suggestionData.genre || [],
                  year: suggestionData.year,
                  coverUrl: suggestionData.coverUrl
              }}
              onClose={() => setSuggestionData(null)}
              onConfirm={handleApplySuggestion}
          />
      )}
    </div>
  );
};
