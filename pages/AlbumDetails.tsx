
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
  onUpdateAlbum?: (album: Album) => void;
}

export const AlbumDetails: React.FC<DetailProps> = ({ 
  currentSongId, 
  isPlaying, 
  onPlaySong, 
  onPlayContext, 
  onToggleFavorite, 
  onUpdateAlbum, 
  onAddToPlaylist
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [album, setAlbum] = useState<Album | null>(null);
  const [tracks, setTracks] = useState<Song[]>([]);
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
        // Clean up internal state to prevent flashing old data
        setAlbum(null);
        setTracks([]);
        setOffset(0);
        setHasMore(true);
        
        api.getAlbum(id, PAGE_LIMIT, 0)
            .then(data => {
                const { songs, ...albumData } = data;
                setAlbum(albumData);
                setTracks(songs);
                if (songs.length < PAGE_LIMIT) setHasMore(false);
                setOffset(PAGE_LIMIT);
            })
            .catch(err => {
                console.error("Failed to fetch album details", err);
                setAlbum(null);
            })
            .finally(() => setLoading(false));
    }
  }, [id]);

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore || !album) return;
    setLoadingMore(true);
    try {
        const newSongs = await api.getAlbumSongs(album.id, PAGE_LIMIT, offset);
        if (newSongs.length < PAGE_LIMIT) setHasMore(false);
        setTracks(prev => [...prev, ...newSongs]);
        setOffset(prev => prev + PAGE_LIMIT);
    } catch (err) {
        console.error("Failed to load more songs", err);
    } finally {
        setLoadingMore(false);
    }
  };

  if (loading) {
      return (
          <div className="min-h-full flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
      );
  }

  if (!album) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <p className="text-slate-400">Album not found</p>
      </div>
    );
  }

  const isContextPlaying = isPlaying && currentSongId && tracks.some(s => s.id === currentSongId);

  const handleSave = async (data: any) => {
    try {
      const genres = data.genre.split(',').map((g: string) => g.trim()).filter(Boolean);
      const updated = await api.updateAlbum(album.id, {
        title: data.title,
        genre: genres,
        year: parseInt(data.year) || album.year
      });
      setAlbum(prev => prev ? { ...prev, ...updated } : null);
      onUpdateAlbum?.(updated);
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to update album", err);
    }
  };

  const handleCoverUpload = async (file: File) => {
    try {
      const updated = await api.updateAlbumCover(album.id, file);
      setAlbum(prev => prev ? { ...prev, coverUrl: updated.coverUrl } : null);
      onUpdateAlbum?.(updated);
    } catch (err) {
      console.error("Failed to update album cover", err);
    }
  };

  const handlePlayToggle = () => {
    if (isContextPlaying && currentSongId) {
        const song = tracks.find(s => s.id === currentSongId);
        if (song) onPlaySong(song);
    } else {
        onPlayContext(tracks);
    }
  };

  // Wrapper for toggling favorite to update local state optimistically
  const handleToggleFavoriteInternal = (targetId: string) => {
      onToggleFavorite(targetId);
      
      // Update if it's the album
      if (targetId === album.id) {
          setAlbum(prev => prev ? { ...prev, isFavorite: !prev.isFavorite } : null);
      } 
      // Update if it's a song
      else {
          setTracks(prev => prev.map(s => s.id === targetId ? { ...s, isFavorite: !s.isFavorite } : s));
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
        meta={<>{album.trackCount} songs <span className="text-slate-600 mx-2">•</span> {album.genre.join(', ')}</>}
        image={album.coverUrl}
        type="Album"
        onBack={() => navigate(-1)}
        heroColor="from-blue-500/20"
        onImageUpload={handleCoverUpload}
      />
      <ActionButtons 
        isPlaying={!!isContextPlaying}
        onPlay={handlePlayToggle} 
        onFollow={() => { }} 
        onEdit={() => setIsEditing(true)}
        isFavorite={album.isFavorite}
        onToggleFavorite={() => handleToggleFavoriteInternal(album.id)}
      />
      <div className="mt-8">
        <TrackList
          songs={tracks}
          currentSongId={currentSongId}
          isPlaying={isPlaying}
          onPlaySong={onPlaySong}
          onToggleFavorite={handleToggleFavoriteInternal}
          onAddToPlaylist={onAddToPlaylist}
          onNavigate={(view, id) => {
            // Mapping navigation state to routes
             if (view === 'song_details') navigate(`/song/${id}`);
             else if (view === 'artist_details') navigate(`/artist/${id}`);
             else if (view === 'album_details') navigate(`/album/${id}`);
          }}
        />
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="px-10 max-w-7xl mx-auto mb-10 mt-4 flex justify-center">
            <button 
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-6 py-2 rounded-full font-bold bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-50"
            >
                {loadingMore ? 'Loading...' : 'Load More Songs'}
            </button>
        </div>
      )}

      {isEditing && (
        <EditModal
          title="Edit Album"
          onClose={() => setIsEditing(false)}
          onSave={handleSave}
          fields={[
            { name: 'title', label: 'Title', value: album.title },
            { name: 'year', label: 'Year', value: String(album.year) },
            { name: 'genre', label: 'Genre', value: album.genre.join(', ') }
          ]}
        />
      )}
    </div>
  );
};
