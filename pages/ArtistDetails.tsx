
import React, { useState, useEffect } from 'react';
import { Song, Album, Artist } from '../types';
import * as api from '../services/api';
import { DetailHeader } from '../components/DetailHeader';
import { ActionButtons } from '../components/ActionButtons';
import { TrackList } from '../components/TrackList';
import { EditModal } from '../components/EditModal';
import { useParams, useNavigate } from 'react-router-dom';

interface DetailProps {
  currentSongId?: string;
  isPlaying: boolean;
  onPlaySong: (song: Song, context?: Song[]) => void;
  onPlayContext: (context: Song[]) => void;
  onToggleFavorite: (id: string) => void;
  onAddToPlaylist: (song: Song) => void;
  onUpdateArtist?: (artist: Artist) => void;
}

export const ArtistDetails: React.FC<DetailProps> = ({ currentSongId, isPlaying, onPlaySong, onPlayContext, onToggleFavorite, onUpdateArtist, onAddToPlaylist }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [artist, setArtist] = useState<Artist | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (id) {
        setLoading(true);
        api.getArtist(id)
            .then(data => {
                const { songs, albums, ...artistData } = data;
                setArtist(artistData);
                setSongs(songs);
                setAlbums(albums);
            })
            .catch(err => {
                console.error("Failed to fetch artist details", err);
                setArtist(null);
            })
            .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
      return (
          <div className="min-h-full flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
      );
  }

  if (!artist) {
    return (
        <div className="min-h-full flex items-center justify-center">
            <p className="text-slate-400">Artist not found</p>
        </div>
    );
  }

  const isContextPlaying = isPlaying && currentSongId && songs.some(s => s.id === currentSongId);

  const handleSave = async (data: any) => {
    try {
        const updated = await api.updateArtist(artist.id, {
            name: data.name
        });
        setArtist(prev => prev ? { ...prev, ...updated } : null);
        onUpdateArtist?.(updated);
        setIsEditing(false);
    } catch (err) {
        console.error("Failed to update artist", err);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    try {
      const updated = await api.updateArtistAvatar(artist.id, file);
      setArtist(prev => prev ? { ...prev, avatarUrl: updated.avatarUrl } : null);
      onUpdateArtist?.(updated);
    } catch (err) {
      console.error("Failed to update artist avatar", err);
    }
  };

  const handlePlayToggle = () => {
    if (isContextPlaying && currentSongId) {
        const song = songs.find(s => s.id === currentSongId);
        if (song) onPlaySong(song);
    } else {
        onPlayContext(songs);
    }
  };

  const handleToggleFavoriteInternal = (targetId: string) => {
      onToggleFavorite(targetId);
      if (targetId === artist.id) {
          setArtist(prev => prev ? { ...prev, isFavorite: !prev.isFavorite } : null);
      } else {
          setSongs(prev => prev.map(s => s.id === targetId ? { ...s, isFavorite: !s.isFavorite } : s));
      }
  }

  return (
    <div className="min-h-full">
      <DetailHeader
        title={artist.name}
        subtitle={null}
        meta={<>{artist.followers} Monthly Listeners</>}
        image={artist.avatarUrl}
        type="Artist"
        onBack={() => navigate(-1)}
        heroColor="from-purple-500/20"
        onImageUpload={handleAvatarUpload}
      />
      <ActionButtons 
        isPlaying={!!isContextPlaying}
        onPlay={handlePlayToggle} 
        onFollow={() => { }} 
        onEdit={() => setIsEditing(true)}
        isFavorite={artist.isFavorite}
        onToggleFavorite={() => handleToggleFavoriteInternal(artist.id)}
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
        songs={songs}
        currentSongId={currentSongId}
        isPlaying={isPlaying}
        onPlaySong={onPlaySong}
        onToggleFavorite={handleToggleFavoriteInternal}
        onAddToPlaylist={onAddToPlaylist}
        onNavigate={(view, id) => {
             if (view === 'song_details') navigate(`/song/${id}`);
             else if (view === 'artist_details') navigate(`/artist/${id}`);
             else if (view === 'album_details') navigate(`/album/${id}`);
        }}
        showHeader={false}
      />

      {albums.length > 0 && (
        <div className="px-10 max-w-7xl mx-auto mt-16 mb-12">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-white">Albums</h2>
            <button className="text-slate-400 text-base font-bold hover:text-white transition-colors">See all</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {albums.map(album => (
              <div 
                key={album.id} 
                onClick={() => navigate(`/album/${album.id}`)}
                className="bg-white/5 p-5 rounded-[2rem] hover:bg-white/10 transition-all hover:-translate-y-1 duration-300 cursor-pointer group shadow-xl border border-white/5"
              >
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
