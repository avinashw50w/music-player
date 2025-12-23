
import React, { useState, useEffect } from 'react';
import { Song, Album, Artist, LibraryEvent } from '../types';
import * as api from '../services/api';
import { DetailHeader } from '../components/DetailHeader';
import { ActionButtons } from '../components/ActionButtons';
import { TrackList } from '../components/TrackList';
import { EditModal } from '../components/EditModal';
import { DetailSkeleton } from '../components/Skeletons';
import { useParams, useNavigate } from 'react-router-dom';

interface DetailProps {
  currentSongId?: string;
  isPlaying: boolean;
  onPlaySong: (song: Song, context?: Song[]) => void;
  onPlayContext: (context: Song[]) => void;
  onToggleFavorite: (id: string, type?: 'song' | 'album' | 'artist' | 'playlist') => void;
  onAddToPlaylist: (song: Song) => void;
  onUpdateArtist?: (artist: Artist) => void;
  lastEvent?: LibraryEvent | null;
}

export const ArtistDetails: React.FC<DetailProps> = ({ currentSongId, isPlaying, onPlaySong, onPlayContext, onToggleFavorite, onUpdateArtist, onAddToPlaylist, lastEvent }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [artist, setArtist] = useState<Artist | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // Pagination State
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_LIMIT = 20;

  useEffect(() => {
    if (id) {
        setLoading(true);
        // Reset state
        setArtist(null);
        setSongs([]);
        setAlbums([]);
        setOffset(0);
        setHasMore(true);

        api.getArtist(id, PAGE_LIMIT, 0)
            .then(data => {
                const { songs, albums, ...artistData } = data;
                setArtist(artistData);
                setSongs(songs);
                setAlbums(albums);
                if (songs.length < PAGE_LIMIT) setHasMore(false);
                setOffset(PAGE_LIMIT);
            })
            .catch(err => {
                console.error("Failed to fetch artist details", err);
                setArtist(null);
            })
            .finally(() => setLoading(false));
    }
  }, [id]);

  // Handle Real-time Updates
  useEffect(() => {
      if (!lastEvent || !id) return;

      const { type, payload } = lastEvent;

      if (type === 'song:update') {
          // If song is in the list, update it
          setSongs(prev => prev.map(s => s.id === payload.id ? payload : s));
      } else if (type === 'artist:update' && payload.id === id) {
          setArtist(prev => prev ? { ...prev, ...payload } : null);
      }
  }, [lastEvent, id]);

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore || !artist) return;
    setLoadingMore(true);
    try {
        const newSongs = await api.getArtistSongs(artist.id, PAGE_LIMIT, offset);
        if (newSongs.length < PAGE_LIMIT) setHasMore(false);
        setSongs(prev => [...prev, ...newSongs]);
        setOffset(prev => prev + PAGE_LIMIT);
    } catch (err) {
        console.error("Failed to load more songs", err);
    } finally {
        setLoadingMore(false);
    }
  };

  if (loading) {
      return <DetailSkeleton />;
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
      if (targetId === artist.id) {
          onToggleFavorite(targetId, 'artist');
          setArtist(prev => prev ? { ...prev, isFavorite: !prev.isFavorite } : null);
      } else {
          onToggleFavorite(targetId, 'song');
          setSongs(prev => prev.map(s => s.id === targetId ? { ...s, isFavorite: !s.isFavorite } : s));
      }
  }

  return (
    <div className="min-h-full animate-fade-in-up">
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
      
      {/* Load More Button */}
      {hasMore && (
        <div className="px-10 max-w-7xl mx-auto mb-10 flex justify-center">
            <button 
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-6 py-2 rounded-full font-bold bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
                {loadingMore ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Loading...
                  </>
                ) : 'Load More Songs'}
            </button>
        </div>
      )}

      {albums.length > 0 && (
        <div className="px-10 max-w-7xl mx-auto mt-16 mb-12">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-white">Albums</h2>
            <button className="text-slate-400 text-base font-bold hover:text-white transition-colors cursor-pointer">See all</button>
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
