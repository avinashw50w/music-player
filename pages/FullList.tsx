import React from 'react';
import { ArrowLeft, Play, ListMusic } from 'lucide-react';
import { Song, Album, Artist, Playlist, NavigationState } from '../types';
import { SongListItem } from '../components/SongListItem';

interface FullListProps {
  type: 'songs' | 'albums' | 'artists' | 'playlists';
  items: Song[] | Album[] | Artist[] | Playlist[];
  onBack: () => void;
  onNavigate: (view: NavigationState['view'], id?: string) => void;
  onPlaySong?: (song: Song) => void;
  currentSongId?: string;
  isPlaying?: boolean;
  onToggleFavorite?: (id: string) => void;
  onAddToPlaylist?: (song: Song) => void;
}

const BackButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <button
      onClick={onClick}
      className="p-3 text-slate-400 hover:text-white transition-colors hover:bg-white/10 rounded-full backdrop-blur-md"
    >
      <ArrowLeft className="w-6 h-6" />
    </button>
  );

const FullList: React.FC<FullListProps> = ({ type, items, onBack, onNavigate, onPlaySong, currentSongId, isPlaying, onToggleFavorite, onAddToPlaylist }) => {
  const getTitle = () => {
    switch(type) {
      case 'songs': return 'All Songs';
      case 'albums': return 'All Albums';
      case 'artists': return 'All Artists';
      case 'playlists': return 'All Playlists';
      default: return 'List';
    }
  };

  const renderContent = () => {
    switch (type) {
      case 'songs':
        return (
          <div className="space-y-1">
            {(items as Song[]).map((song, i) => (
               <SongListItem 
                  key={song.id}
                  song={song}
                  index={i}
                  currentSongId={currentSongId}
                  isPlaying={!!isPlaying}
                  onPlay={() => onPlaySong?.(song)}
                  onNavigate={onNavigate}
                  onToggleFavorite={onToggleFavorite || (() => {})}
                  onAddToPlaylist={onAddToPlaylist || (() => {})}
               />
            ))}
          </div>
        );
      
      case 'albums':
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {(items as Album[]).map((album) => (
              <div 
                key={album.id} 
                onClick={() => onNavigate('album_details', album.id)}
                className="bg-white/5 hover:bg-white/10 p-5 rounded-[2rem] cursor-pointer transition-colors border border-white/5 group"
              >
                <div className="overflow-hidden rounded-2xl mb-4 shadow-lg">
                   <img src={album.coverUrl} alt={album.title} className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <h4 className="text-white font-bold text-lg truncate">{album.title}</h4>
                <p className="text-slate-500 text-sm truncate">{album.artist}</p>
              </div>
            ))}
          </div>
        );

      case 'artists':
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {(items as Artist[]).map((artist) => (
                <div 
                key={artist.id} 
                onClick={() => onNavigate('artist_details', artist.id)}
                className="bg-white/5 hover:bg-white/10 p-5 rounded-[2rem] flex flex-col items-center text-center cursor-pointer transition-colors border border-white/5 group"
                >
                    <img src={artist.avatarUrl} alt={artist.name} className="w-32 h-32 rounded-full object-cover mb-4 shadow-lg group-hover:scale-105 transition-transform" />
                    <h4 className="text-white font-bold text-lg truncate w-full">{artist.name}</h4>
                    <p className="text-slate-500 text-sm">{artist.followers} Followers</p>
                </div>
            ))}
            </div>
        );

      case 'playlists':
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {(items as Playlist[]).map((playlist) => (
                <div 
                    key={playlist.id} 
                    onClick={() => onNavigate('playlist_details', playlist.id)}
                    className="bg-white/5 hover:bg-white/10 p-5 rounded-[2rem] cursor-pointer transition-colors border border-white/5 group"
                >
                    <div className="relative mb-4 overflow-hidden rounded-2xl bg-[#2c2c2e] aspect-square flex items-center justify-center shadow-md">
                        {playlist.coverUrl ? (
                            <img src={playlist.coverUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={playlist.name} />
                        ) : (
                            <ListMusic className="w-20 h-20 text-slate-500 group-hover:scale-110 transition-transform duration-500" />
                        )}
                    </div>
                    <h4 className="text-white font-bold text-lg truncate">{playlist.name}</h4>
                    <p className="text-slate-500 text-sm truncate">{playlist.songIds.length} Songs</p>
                </div>
            ))}
            </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-10 pb-10">
        <div className="flex items-center gap-4 mb-10">
            <BackButton onClick={onBack} />
            <h1 className="text-4xl font-bold text-white tracking-tight">{getTitle()}</h1>
        </div>
        {renderContent()}
    </div>
  );
};

export default FullList;