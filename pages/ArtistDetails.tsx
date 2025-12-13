
import React, { useState } from 'react';
import { Song, Album, Artist } from '../types';
import * as api from '../services/api';
import { DetailHeader } from '../components/DetailHeader';
import { ActionButtons } from '../components/ActionButtons';
import { TrackList } from '../components/TrackList';
import { EditModal } from '../components/EditModal';
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
  onUpdateArtist?: (artist: Artist) => void;
}

export const ArtistDetails: React.FC<DetailProps> = ({ songs, albums = [], artists = [], currentSongId, isPlaying, onPlaySong, onPlayContext, onToggleFavorite, onUpdateArtist, onAddToPlaylist }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const artist = artists.find(a => a.id === id) || artists[0]; // Fallback purely for dev safety, real app should fetch
  const [isEditing, setIsEditing] = useState(false);

  // In a real refactor with router, we might fetch specific artist details here like AlbumDetails, 
  // but for now we rely on the props passed down from App state (which contains all artists)
  
  if (!artist || artist.id !== id) {
     // If not in the pre-loaded list, one might fetch it here. 
     // For this step, we'll assume the list is sufficient or display not found
     if (!artist) {
        return (
            <div className="min-h-full flex items-center justify-center">
                <p className="text-slate-400">Artist not found</p>
            </div>
        );
     }
  }

  const artistSongs = songs.filter(s => s.artist === artist.name);
  const artistAlbums = albums.filter(a => a.artist === artist.name);
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

  const handleAvatarUpload = async (file: File) => {
    try {
      const updated = await api.updateArtistAvatar(artist.id, file);
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
        onPlayContext(artistSongs);
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
        onToggleFavorite={() => onToggleFavorite(artist.id)}
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
        onAddToPlaylist={onAddToPlaylist}
        onNavigate={(view, id) => {
             if (view === 'song_details') navigate(`/song/${id}`);
             else if (view === 'artist_details') navigate(`/artist/${id}`);
             else if (view === 'album_details') navigate(`/album/${id}`);
        }}
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
