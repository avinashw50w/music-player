import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, Play, Pause, Shuffle, MoreHorizontal, Heart, Trash2, GripVertical, Edit3, Music, CheckCircle2, Mic2, ListPlus, Save } from 'lucide-react';
import { Album, Artist, Playlist, Song } from '../types';
import PlayingIndicator from '../components/PlayingIndicator';
import * as api from '../services/api';

// --- Sub Components ---

const BackButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="p-3 text-slate-400 hover:text-white transition-colors hover:bg-white/10 rounded-full backdrop-blur-md"
  >
    <ArrowLeft className="w-6 h-6" />
  </button>
);

interface DetailHeaderProps {
  title: string;
  subtitle: React.ReactNode;
  meta?: React.ReactNode;
  image: string;
  type: 'Album' | 'Artist' | 'Playlist';
  onBack: () => void;
  heroColor?: string;
}

const DetailHeader: React.FC<DetailHeaderProps> = ({ title, subtitle, meta, image, type, onBack, heroColor = "from-indigo-500/20" }) => (
  <div className="relative">
    {/* Background Atmosphere */}
    <div className="absolute inset-0 h-[500px] overflow-hidden pointer-events-none">
      <div className={`absolute top-0 left-0 w-full h-full bg-gradient-to-b ${heroColor} to-transparent z-0 opacity-40`}></div>
      <div className="absolute top-[-50%] left-[-20%] w-[80%] h-[80%] rounded-full bg-white/5 blur-[120px] mix-blend-overlay"></div>
    </div>

    {/* Header Navigation */}
    <div className="relative z-30 pt-8 pl-8">
      <BackButton onClick={onBack} />
    </div>

    <div className="relative px-10 pb-12 pt-4 flex flex-col md:flex-row gap-10 items-end z-20 max-w-7xl mx-auto">
      <div className={`relative group ${type === 'Artist' ? 'rounded-full' : 'rounded-[2rem]'} overflow-hidden shadow-2xl shadow-black/50 flex-shrink-0`}>
        <img
          src={image}
          alt={title}
          className={`w-64 h-64 md:w-72 md:h-72 object-cover transition-transform duration-700 group-hover:scale-105`}
        />
        {/* Shine effect */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
      </div>

      <div className="flex-1 mb-2">
        <div className="flex items-center gap-3 mb-4">
          {type === 'Artist' && (
            <span className="bg-[#8b5cf6] text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-lg shadow-purple-900/20">
              <CheckCircle2 className="w-3 h-3" /> Verified Artist
            </span>
          )}
          <span className="text-sm font-bold tracking-[0.2em] text-indigo-300 uppercase">{type}</span>
        </div>

        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white mb-6 tracking-tight leading-[0.9] drop-shadow-lg">
          {title}
        </h1>

        <div className="flex flex-col gap-2">
          {subtitle && <div className="text-2xl font-bold text-white">{subtitle}</div>}
          {meta && <div className="flex items-center gap-3 text-slate-400 text-lg font-medium">{meta}</div>}
        </div>
      </div>
    </div>
  </div>
);

interface ActionButtonsProps {
  isPlaying: boolean;
  onPlay: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showEditControls?: boolean;
  isFollowing?: boolean;
  onFollow?: () => void;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({ isPlaying, onPlay, onEdit, onDelete, showEditControls, isFollowing, onFollow }) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="px-10 py-2 flex items-center gap-6 relative z-20 max-w-7xl mx-auto">
      <button
        onClick={onPlay}
        className="w-16 h-16 bg-white rounded-full flex items-center justify-center hover:scale-105 hover:bg-indigo-50 transition-all shadow-xl shadow-white/5 active:scale-95 group"
      >
        {isPlaying ? (
           <Pause className="w-7 h-7 text-black fill-current ml-0 group-hover:scale-110 transition-transform" />
        ) : (
           <Play className="w-7 h-7 text-black fill-current ml-1 group-hover:scale-110 transition-transform" />
        )}
      </button>

      {onFollow && (
        <button
          onClick={onFollow}
          className={`px-8 py-3 rounded-full font-bold text-base border-2 transition-all ${isFollowing
            ? 'border-indigo-500 text-indigo-400 hover:bg-indigo-950'
            : 'border-slate-600 text-white hover:border-white'
            }`}
        >
          {isFollowing ? 'Following' : 'Follow'}
        </button>
      )}

      <div className="flex items-center gap-4 ml-2">
        <button className="p-3 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-white/5">
          <Shuffle className="w-7 h-7" />
        </button>
        <button className="p-3 text-slate-400 hover:text-rose-500 transition-colors rounded-full hover:bg-white/5">
          <Heart className="w-7 h-7" />
        </button>
      </div>

      {(showEditControls || onEdit) && (
        <div className="ml-auto relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="text-slate-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
          >
            <MoreHorizontal className="w-7 h-7" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-[#1c1c1e] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden ring-1 ring-black/50">
              {onEdit && (
                <button
                  onClick={() => { setShowMenu(false); onEdit(); }}
                  className="w-full text-left px-5 py-4 text-base text-slate-200 hover:bg-white/5 flex items-center gap-3 transition-colors"
                >
                  <Edit3 className="w-5 h-5" /> Edit
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => { setShowMenu(false); onDelete(); }}
                  className="w-full text-left px-5 py-4 text-base text-rose-400 hover:bg-white/5 flex items-center gap-3 transition-colors"
                >
                  <Trash2 className="w-5 h-5" /> Delete
                </button>
              )}
            </div>
          )}
          {showMenu && <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)}></div>}
        </div>
      )}
    </div>
  );
};

interface TrackListProps {
  songs: Song[];
  currentSongId?: string;
  isPlaying: boolean;
  onPlaySong: (song: Song, context?: Song[]) => void;
  onToggleFavorite: (id: string) => void;
  isEditable?: boolean;
  onRemoveSong?: (songId: string) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
  showHeader?: boolean;
}

const TrackList: React.FC<TrackListProps> = ({
  songs,
  currentSongId,
  isPlaying,
  onPlaySong,
  onToggleFavorite,
  isEditable,
  onRemoveSong,
  onReorder,
  showHeader = true
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  return (
    <div className="px-6 md:px-10 pb-32 max-w-7xl mx-auto">
      {showHeader && (
        <div className="grid grid-cols-[auto_1fr_auto] md:grid-cols-[auto_1fr_1fr_auto] gap-6 px-4 py-4 border-b border-white/5 text-slate-400 text-xs font-bold uppercase tracking-widest sticky top-0 bg-black/40 backdrop-blur-md z-10 mb-2 rounded-xl">
          <span className="w-10 text-center">#</span>
          <span>Title</span>
          <span className="hidden md:block">Album</span>
          <span className="w-16 text-center"><Clock className="w-4 h-4 mx-auto" /></span>
        </div>
      )}
      <div className="space-y-1">
        {songs.map((song, i) => {
          const isCurrent = currentSongId === song.id;
          const isCurrentPlaying = isCurrent && isPlaying;

          return (
            <div
              key={`${song.id}-${i}`}
              draggable={isEditable}
              onDragStart={() => isEditable && setDraggedIndex(i)}
              onDragOver={(e) => { e.preventDefault(); }}
              onDrop={(e) => {
                e.preventDefault();
                if (isEditable && draggedIndex !== null && draggedIndex !== i) {
                  onReorder?.(draggedIndex, i);
                  setDraggedIndex(null);
                }
              }}
              className={`grid grid-cols-[auto_1fr_auto] md:grid-cols-[auto_1fr_1fr_auto] gap-6 px-4 py-3.5 rounded-xl hover:bg-white/5 group transition-all duration-200 items-center cursor-pointer ${isCurrent ? 'bg-white/10 shadow-lg shadow-black/20' : ''}`}
              onClick={() => onPlaySong(song, songs)}
            >
              <div className="w-10 h-10 flex items-center justify-center relative">
                {isEditable ? (
                  <div className="cursor-grab active:cursor-grabbing p-1 text-slate-600 hover:text-slate-300">
                    <GripVertical className="w-5 h-5" />
                  </div>
                ) : (
                  <span className={`text-base font-medium tabular-nums ${isCurrent ? 'text-indigo-400 font-bold' : 'text-slate-500'}`}>
                    {i + 1}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-5">
                <div className="relative w-12 h-12 flex-shrink-0">
                  <img src={song.coverUrl} className="w-full h-full rounded-lg object-cover shadow-sm" alt="" />
                  {isCurrentPlaying && (
                    <>
                      <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center backdrop-blur-sm group-hover:opacity-0 transition-opacity">
                        <PlayingIndicator />
                      </div>
                      <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Pause className="w-5 h-5 text-white fill-current" />
                      </div>
                    </>
                  )}
                  {!isCurrentPlaying && (
                    <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[1px]">
                      <Play className="w-5 h-5 text-white fill-current ml-0.5" />
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <div className={`font-bold text-base truncate transition-colors ${isCurrent ? 'text-[#818cf8]' : 'text-white'}`}>{song.title}</div>
                  <div className="text-slate-500 text-sm md:hidden mt-0.5 truncate">{song.artist}</div>
                </div>
              </div>

              <div className="text-slate-400 text-base font-medium hidden md:block hover:text-white transition-colors truncate pr-4">{song.album}</div>

              <div className="flex items-center justify-end gap-4">
                {isEditable ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemoveSong?.(song.id); }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-rose-500 p-2"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                ) : (
                  <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(song.id); }} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-rose-500 p-2 transform hover:scale-110 active:scale-90 transition-all">
                    <Heart className={`w-5 h-5 ${song.isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
                  </button>
                )}
                <div className="text-slate-500 text-base tabular-nums text-center w-16">{song.duration}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- Edit Modals ---

const EditModal: React.FC<{
  title: string;
  onClose: () => void;
  onSave: (data: any) => void;
  fields: { name: string; label: string; value: string }[];
}> = ({ title, onClose, onSave, fields }) => {
  const [formData, setFormData] = useState<Record<string, string>>(
    fields.reduce((acc, field) => ({ ...acc, [field.name]: field.value }), {})
  );

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-[#1c1c1e] border border-white/10 rounded-3xl p-8 w-full max-w-lg shadow-2xl">
        <h3 className="text-2xl font-bold text-white mb-6">{title}</h3>
        <div className="space-y-4 mb-8">
          {fields.map(field => (
            <div key={field.name}>
              <label className="block text-sm font-medium text-slate-400 mb-2">{field.label}</label>
              <input
                type="text"
                value={formData[field.name]}
                onChange={(e) => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
                className="w-full bg-black/50 text-white border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500"
              />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-4">
          <button onClick={onClose} className="px-6 py-2 text-slate-300 hover:text-white font-medium">Cancel</button>
          <button onClick={() => onSave(formData)} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-bold">Save Changes</button>
        </div>
      </div>
    </div>
  );
};

// --- Main Pages ---

interface DetailProps {
  id?: string;
  onBack: () => void;
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
  onUpdateAlbum?: (album: Album) => void;
  onUpdateArtist?: (artist: Artist) => void;
}

export const AlbumDetails: React.FC<DetailProps> = ({ id, onBack, songs, albums = [], currentSongId, isPlaying, onPlaySong, onPlayContext, onToggleFavorite, onUpdateAlbum }) => {
  const album = albums.find(a => a.id === id) || albums[0];
  const [isEditing, setIsEditing] = useState(false);

  if (!album) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <p className="text-slate-400">Album not found</p>
      </div>
    );
  }

  const albumSongs = songs.filter(s => s.album === album.title);
  // Determine if this specific album context is currently playing
  const isContextPlaying = isPlaying && currentSongId && albumSongs.some(s => s.id === currentSongId);

  const handleSave = async (data: any) => {
    try {
      const updated = await api.updateAlbum(album.id, {
        title: data.title,
        genre: data.genre,
        year: parseInt(data.year) || album.year
      });
      onUpdateAlbum?.(updated);
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to update album", err);
    }
  };

  return (
    <div className="min-h-full">
      <DetailHeader
        title={album.title}
        subtitle={
          <div className="flex items-center gap-2">
            <span>{album.artist}</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400 font-normal">{album.year}</span>
          </div>
        }
        meta={<>{album.trackCount} songs <span className="text-slate-600 mx-2">•</span> {album.genre}</>}
        image={album.coverUrl}
        type="Album"
        onBack={onBack}
        heroColor="from-blue-500/20"
      />
      <ActionButtons 
        isPlaying={!!isContextPlaying}
        onPlay={() => onPlayContext(albumSongs)} 
        onFollow={() => { }} 
        onEdit={() => setIsEditing(true)}
      />
      <div className="mt-8">
        <TrackList
          songs={albumSongs}
          currentSongId={currentSongId}
          isPlaying={isPlaying}
          onPlaySong={onPlaySong}
          onToggleFavorite={onToggleFavorite}
        />
      </div>
      {isEditing && (
        <EditModal
          title="Edit Album"
          onClose={() => setIsEditing(false)}
          onSave={handleSave}
          fields={[
            { name: 'title', label: 'Title', value: album.title },
            { name: 'year', label: 'Year', value: String(album.year) },
            { name: 'genre', label: 'Genre', value: album.genre }
          ]}
        />
      )}
    </div>
  );
};

export const ArtistDetails: React.FC<DetailProps> = ({ id, onBack, songs, albums = [], artists = [], currentSongId, isPlaying, onPlaySong, onPlayContext, onToggleFavorite, onUpdateArtist }) => {
  const artist = artists.find(a => a.id === id) || artists[0];
  const [isEditing, setIsEditing] = useState(false);

  if (!artist) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <p className="text-slate-400">Artist not found</p>
      </div>
    );
  }

  const artistSongs = songs.filter(s => s.artist === artist.name);
  const artistAlbums = albums.filter(a => a.artist === artist.name);
  
  // Determine if this artist context is playing
  const isContextPlaying = isPlaying && currentSongId && artistSongs.some(s => s.id === currentSongId);

  const handleSave = async (data: any) => {
    try {
        const updated = await api.updateArtist(artist.id, {
            name: data.name
        });
        onUpdateArtist?.(updated);
        setIsEditing(false);
    } catch (err) {
        console.error("Failed to update artist", err);
    }
  };

  return (
    <div className="min-h-full">
      <DetailHeader
        title={artist.name}
        subtitle={null}
        meta={<>{artist.followers} Monthly Listeners</>}
        image={artist.avatarUrl}
        type="Artist"
        onBack={onBack}
        heroColor="from-purple-500/20"
      />
      <ActionButtons 
        isPlaying={!!isContextPlaying}
        onPlay={() => onPlayContext(artistSongs)} 
        onFollow={() => { }} 
        onEdit={() => setIsEditing(true)}
      />

      {/* Biography Section */}
      <div className="px-10 max-w-7xl mx-auto mt-6 mb-12">
        <h2 className="text-2xl font-bold text-white mb-4">Biography</h2>
        <p className="text-slate-400 text-lg leading-relaxed max-w-3xl">
          {artist.name} is a renowned artist known for their unique blend of genres and soulful performances.
        </p>
      </div>

      <div className="px-10 max-w-7xl mx-auto mt-4 mb-4">
        <h2 className="text-2xl font-bold text-white mb-6">Popular Songs</h2>
      </div>

      <TrackList
        songs={artistSongs}
        currentSongId={currentSongId}
        isPlaying={isPlaying}
        onPlaySong={onPlaySong}
        onToggleFavorite={onToggleFavorite}
        showHeader={false}
      />

      {artistAlbums.length > 0 && (
        <div className="px-10 max-w-7xl mx-auto mt-16 mb-12">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-white">Albums</h2>
            <button className="text-slate-400 text-base font-bold hover:text-white transition-colors">See all</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {artistAlbums.map(album => (
              <div key={album.id} className="bg-white/5 p-5 rounded-[2rem] hover:bg-white/10 transition-all hover:-translate-y-1 duration-300 cursor-pointer group shadow-xl border border-white/5">
                <div className="overflow-hidden rounded-2xl mb-4 shadow-lg">
                  <img src={album.coverUrl} alt={album.title} className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <h4 className="text-white text-lg font-bold truncate pr-2">{album.title}</h4>
                <p className="text-slate-500 text-base mt-1">{album.year} • Album</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {isEditing && (
        <EditModal
            title="Edit Artist"
            onClose={() => setIsEditing(false)}
            onSave={handleSave}
            fields={[
                { name: 'name', label: 'Name', value: artist.name }
            ]}
        />
      )}
    </div>
  );
};

export const PlaylistDetails: React.FC<any> = (props) => {
  const { playlist, onDeletePlaylist, onRenamePlaylist, onRemoveSong, onReorderSongs, ...rest } = props;

  if (!playlist) return null;

  const playlistSongs = playlist.songIds
    .map((id: string) => props.songs.find((s: Song) => s.id === id))
    .filter((s: Song | undefined): s is Song => !!s);

  // Determine if this playlist is playing
  const isContextPlaying = props.isPlaying && props.currentSongId && playlistSongs.some((s: Song) => s.id === props.currentSongId);

  const handleEdit = () => {
    const newName = window.prompt("Rename Playlist", playlist.name);
    if (newName && newName.trim() !== "") {
      onRenamePlaylist(playlist.id, newName);
    }
  };

  return (
    <div className="min-h-full">
      <DetailHeader
        title={playlist.name}
        subtitle="Public Playlist"
        meta={`${playlistSongs.length} songs`}
        image={playlist.coverUrl || 'https://picsum.photos/200/200'}
        type="Playlist"
        onBack={props.onBack}
        heroColor="from-green-500/20"
      />
      <ActionButtons
        isPlaying={!!isContextPlaying}
        onPlay={() => props.onPlayContext(playlistSongs)}
        showEditControls={true}
        onDelete={() => onDeletePlaylist(playlist.id)}
        onEdit={handleEdit}
      />
      <div className="mt-8 px-4">
        {playlistSongs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 border-2 border-dashed border-white/5 rounded-[3rem] text-center bg-white/[0.02] max-w-4xl mx-auto">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 text-slate-400">
              <Music className="w-10 h-10" />
            </div>
            <p className="text-white font-bold text-2xl mb-3">It's a bit empty here</p>
            <p className="text-slate-500 text-xl">Find songs you love and add them to this playlist!</p>
          </div>
        ) : (
          <TrackList
            songs={playlistSongs}
            currentSongId={props.currentSongId}
            isPlaying={props.isPlaying}
            onPlaySong={props.onPlaySong}
            onToggleFavorite={props.onToggleFavorite}
            isEditable={true}
            onRemoveSong={(songId) => onRemoveSong(playlist.id, songId)}
            onReorder={(from, to) => onReorderSongs(playlist.id, from, to)}
          />
        )}
      </div>
    </div>
  );
};

export const SongDetails: React.FC<DetailProps> = ({ id, onBack, songs, currentSongId, isPlaying, onPlaySong, onToggleFavorite, onAddToPlaylist, onUpdateSong }) => {
  const song = songs.find(s => s.id === id);
  const [lyrics, setLyrics] = useState<string>("");
  const [isEditingLyrics, setIsEditingLyrics] = useState(false);
  const [isEditingInfo, setIsEditingInfo] = useState(false);

  useEffect(() => {
    if (song?.lyrics) {
      setLyrics(song.lyrics);
    }
  }, [song]);

  if (!song) return null;

  const handleSaveInfo = async (data: any) => {
    try {
        const updated = await api.updateSong(song.id, {
            title: data.title,
            artist: data.artist,
            album: data.album,
            genre: data.genre
        });
        onUpdateSong?.(updated);
        setIsEditingInfo(false);
    } catch (err) {
        console.error("Failed to update song info", err);
    }
  };

  const handleSaveLyrics = async () => {
    try {
        const updated = await api.updateSongLyrics(song.id, lyrics);
        onUpdateSong?.(updated);
        setIsEditingLyrics(false);
    } catch (err) {
        console.error("Failed to update lyrics", err);
    }
  };


  return (
    <div className="min-h-full flex flex-col p-8 pb-40 relative overflow-hidden">
      {/* Ambient Backdrops */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-rose-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-7xl mx-auto">
        <div className="flex justify-start mb-8">
          <BackButton onClick={onBack} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left Column: Image & Main Info */}
          <div className="lg:col-span-5 flex flex-col items-center lg:items-start text-center lg:text-left">
            <div className="relative mb-8 group w-full max-w-md aspect-square">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] bg-indigo-500/30 blur-3xl rounded-full opacity-50"></div>
              <img
                src={song.coverUrl}
                alt={song.title}
                className="w-full h-full rounded-[2rem] shadow-2xl object-cover relative z-10"
              />
            </div>

            <div className="mb-6 w-full relative group">
              <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button onClick={() => setIsEditingInfo(true)} className="p-2 text-slate-500 hover:text-white rounded-full hover:bg-white/10">
                     <Edit3 className="w-5 h-5"/>
                 </button>
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tight leading-tight">{song.title}</h1>
              <p className="text-2xl text-indigo-300 font-medium mb-4">{song.artist}</p>

              <div className="flex items-center justify-center lg:justify-start gap-4 flex-wrap">
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
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-4 w-full bg-white/5 p-6 rounded-3xl border border-white/5">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Album</span>
                <span className="text-white font-medium truncate">{song.album}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Genre</span>
                <span className="text-white font-medium truncate">{song.genre}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Length</span>
                <span className="text-white font-medium">{song.duration}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Format</span>
                <div className="flex items-center gap-2">
                  <span className="bg-white/10 text-xs px-2 py-0.5 rounded text-indigo-200">FLAC</span>
                  <span className="text-slate-400 text-sm">24-bit</span>
                </div>
              </div>
              <div className="flex flex-col gap-1 col-span-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bitrate</span>
                <span className="text-white font-medium">320 kbps</span>
              </div>
            </div>
          </div>

          {/* Right Column: Lyrics */}
          <div className="lg:col-span-7 flex flex-col h-full min-h-[500px]">
            <div className="bg-[#1c1c1e]/80 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8 flex flex-col h-full shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-6 relative z-10">
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
                      className="w-full h-full bg-black/20 text-white rounded-xl p-4 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500 text-lg leading-relaxed font-medium placeholder:text-slate-600 mb-4"
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
                      <p className="whitespace-pre-line text-xl leading-relaxed text-slate-300 font-medium text-center">
                        {lyrics}
                      </p>
                    ) : (
                      <div className="text-center">
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
                { name: 'genre', label: 'Genre', value: song.genre }
            ]}
        />
      )}
    </div>
  );
};