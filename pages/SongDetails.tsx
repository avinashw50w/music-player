
import React, { useState, useEffect, useRef } from 'react';
import { Song, Album, Artist } from '../types';
import { BackButton } from '../components/BackButton';
import { EditModal, SuggestionItem } from '../components/EditModal';
import { SuggestionModal } from '../components/SuggestionModal';
import { SongDetailSkeleton } from '../components/Skeletons';
import * as api from '../services/api';
import { useParams, useNavigate } from 'react-router-dom';
import { SongDetailsHero } from '../components/SongDetailsHero';
import { LyricsSection } from '../components/LyricsSection';

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
  
  const [albumSuggestions, setAlbumSuggestions] = useState<(string | SuggestionItem)[]>([]);
  const [artistSuggestions, setArtistSuggestions] = useState<(string | SuggestionItem)[]>([]);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [isIdentifyingSpotify, setIsIdentifyingSpotify] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [identifyError, setIdentifyError] = useState<string | null>(null);
  const [isFetchingLyrics, setIsFetchingLyrics] = useState(false);
  const [suggestionData, setSuggestionData] = useState<any>(null);

  useEffect(() => {
    if (id && (!song || song.lyrics === undefined)) {
        setLoading(true);
        api.getSong(id).then(data => {
            setSong(data);
            if (data.lyrics) setLyrics(data.lyrics);
        }).finally(() => setLoading(false));
    } else if (song?.lyrics) {
      setLyrics(song.lyrics);
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
      const propSong = songs.find(s => s.id === id);
      if (propSong) {
          setSong(prev => (prev?.lyrics && propSong.lyrics === undefined) ? { ...propSong, lyrics: prev.lyrics } : propSong);
          if (propSong.lyrics) setLyrics(propSong.lyrics);
      }
  }, [songs, id]);

  useEffect(() => {
      if (isEditingInfo) {
          if (albums) setAlbumSuggestions(albums.map(a => ({ text: a.title, subtext: `${a.trackCount} songs`, image: a.coverUrl, id: a.id })).slice(0, 20));
          if (artists) setArtistSuggestions(artists.map(a => ({ text: a.name, image: a.avatarUrl, id: a.id })).slice(0, 20));
      }
  }, [isEditingInfo, albums, artists]);

  if (loading || !song) return <SongDetailSkeleton />;

  const handleFieldChange = (name: string, value: string) => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(async () => {
          const query = (name === 'artist' || name === 'genre') ? value.split(',').pop()?.trim() : value.trim();
          if (query && query.length > 1) {
              const type = name === 'artist' ? 'artist' : (name === 'album' ? 'album' : undefined);
              const results = await api.search(query, type ? { type } : undefined);
              if (name === 'album') setAlbumSuggestions(results.albums.map(a => ({ text: a.title, subtext: `${a.trackCount} songs`, image: a.coverUrl, id: a.id })));
              else if (name === 'artist') setArtistSuggestions(results.artists.map(a => ({ text: a.name, image: a.avatarUrl, id: a.id })));
          }
      }, 300);
  };

  const handleSaveInfo = async (data: any, ids?: Record<string, string>) => {
    try {
        const genres = data.genre.split(',').map((g: string) => g.trim()).filter(Boolean);
        const updated = await api.updateSong(song.id, { title: data.title, artist: data.artist, album: data.album, albumId: ids?.album, genre: genres });
        setSong(updated); onUpdateSong?.(updated); setIsEditingInfo(false);
    } catch (err) { console.error(err); }
  };

  const handleSaveLyrics = async () => {
    try {
        const updated = await api.updateSongLyrics(song.id, lyrics);
        setSong(updated); onUpdateSong?.(updated); setIsEditingLyrics(false);
    } catch (err) { console.error(err); }
  };

  const handleIdentify = async () => {
      setIsIdentifying(true); setIdentifyError(null);
      try { const cand = await api.identifySong(song.id); setSuggestionData(cand); } 
      catch (e: any) { setIdentifyError(e.message || "Failed"); setTimeout(() => setIdentifyError(null), 4000); }
      finally { setIsIdentifying(false); }
  };

  const handleIdentifySpotify = async () => {
      setIsIdentifyingSpotify(true); setIdentifyError(null);
      try { const cand = await api.identifySongSpotify(song.id); setSuggestionData(cand); } 
      catch (e: any) { setIdentifyError(e.message || "Failed"); setTimeout(() => setIdentifyError(null), 4000); }
      finally { setIsIdentifyingSpotify(false); }
  };

  const handleRefine = async () => {
      setIsRefining(true); setIdentifyError(null);
      try { const sug = await api.getGeminiSuggestion(song.id); setSuggestionData(sug); } 
      catch (e: any) { setIdentifyError(e.message || "Failed"); setTimeout(() => setIdentifyError(null), 4000); }
      finally { setIsRefining(false); }
  };

  const handleFetchSyncedLyrics = async () => {
      setIsFetchingLyrics(true);
      try { const upd = await api.fetchSyncedLyrics(song.id); setSong(upd); setLyrics(upd.lyrics || ""); onUpdateSong?.(upd); } 
      catch (e) { console.error(e); }
      finally { setIsFetchingLyrics(false); }
  };

  const handleDelete = async () => {
      if (window.confirm(`Delete "${song.title}"?`)) { await api.deleteSong(song.id); navigate(-1); }
  };

  return (
    <div className="min-h-full flex flex-col p-8 pb-10 relative overflow-hidden animate-fade-in-up">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col gap-10">
        <div className="w-fit">
          <BackButton />
        </div>
        <SongDetailsHero 
          song={song} isPlaying={isPlaying} currentSongId={currentSongId}
          isIdentifying={isIdentifying} isIdentifyingSpotify={isIdentifyingSpotify} isRefining={isRefining} identifyError={identifyError}
          onPlay={() => onPlaySong(song)} onToggleFavorite={() => onToggleFavorite(song.id)} onAddToPlaylist={() => onAddToPlaylist(song)}
          onCoverUpload={async (f) => { const u = await api.updateSongCover(song.id, f); setSong(u); onUpdateSong?.(u); }}
          onIdentify={handleIdentify} onIdentifySpotify={handleIdentifySpotify} onRefine={handleRefine} onEdit={() => setIsEditingInfo(true)} onDelete={handleDelete}
          renderArtists={() => song.artists?.map((a, i) => <span key={a.id} onClick={() => navigate(`/artist/${a.id}`)} className="cursor-pointer hover:underline">{i > 0 ? `, ${a.name}` : a.name}</span>) || song.artist}
        />

        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 w-full bg-white/5 p-6 rounded-3xl border border-white/5">
            <div className="md:col-span-2 flex flex-col gap-1">
                <span className="text-xs font-bold text-slate-500 uppercase">Album</span>
                <span className="text-white font-medium truncate hover:underline cursor-pointer" onClick={() => song.albumId && navigate(`/album/${song.albumId}`)}>{song.album}</span>
            </div>
            <div className="md:col-span-2 flex flex-col gap-1">
                <span className="text-xs font-bold text-slate-500 uppercase">Genre</span>
                <span className="text-white font-medium truncate">{(song.genre || []).join(', ')}</span>
            </div>
            <div className="flex flex-col gap-1"><span className="text-xs font-bold text-slate-500 uppercase">Length</span><span className="text-white font-medium">{song.duration}</span></div>
            <div className="flex flex-col gap-1"><span className="text-xs font-bold text-slate-500 uppercase">Format</span><span className="bg-white/10 text-[10px] px-2 py-0.5 rounded text-indigo-200 uppercase w-fit">{song.format}</span></div>
        </div>

        <LyricsSection 
          lyrics={lyrics} isEditing={isEditingLyrics} isFetching={isFetchingLyrics}
          onLyricsChange={setLyrics} onEditToggle={setIsEditingLyrics} onFetchSynced={handleFetchSyncedLyrics} onSave={handleSaveLyrics}
        />
      </div>
      {isEditingInfo && <EditModal title="Edit Song" onClose={() => setIsEditingInfo(false)} onSave={handleSaveInfo} onFieldChange={handleFieldChange} fields={[{ name: 'title', label: 'Title', value: song.title }, { name: 'artist', label: 'Artist', value: song.artist, isMulti: true, suggestions: artistSuggestions }, { name: 'album', label: 'Album', value: song.album, suggestions: albumSuggestions }, { name: 'genre', label: 'Genre', value: (song.genre || []).join(', '), isMulti: true }]} />}
      {suggestionData && <SuggestionModal currentData={song} suggestedData={suggestionData} onClose={() => setSuggestionData(null)} onConfirm={async (d) => { const u = await api.updateSong(song.id, { ...d, remoteCoverUrl: d.coverUrl }); setSong(u); onUpdateSong?.(u); setSuggestionData(null); }} />}
    </div>
  );
};
