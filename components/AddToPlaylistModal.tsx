
import React, { useState } from 'react';
import { Playlist, Song } from '../types';
import { X, ListMusic, Plus, Loader2 } from 'lucide-react';

interface AddToPlaylistModalProps {
  song: Song;
  playlists: Playlist[];
  onClose: () => void;
  onSelect: (playlistId: string) => Promise<void> | void;
  onCreateNew: () => void;
}

export const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({ song, playlists, onClose, onSelect, onCreateNew }) => {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleSelect = async (playlistId: string) => {
      if (loadingId) return;
      setLoadingId(playlistId);
      try {
          await onSelect(playlistId);
      } catch (e) {
          console.error("Failed to add to playlist", e);
          setLoadingId(null);
      }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-[#1c1c1e] border border-white/10 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">Add to Playlist</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6 p-3 bg-white/5 rounded-xl">
             <img src={song.coverUrl} className="w-12 h-12 rounded-lg object-cover" alt={song.title} />
             <div className="min-w-0">
               <h4 className="text-white font-bold truncate">{song.title}</h4>
               <p className="text-slate-400 text-sm truncate">{song.artist}</p>
             </div>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
            {playlists.map(playlist => {
               const isAlreadyIn = playlist.songIds.includes(song.id);
               const isLoading = loadingId === playlist.id;
               const isDisabled = isAlreadyIn || (loadingId !== null);

               return (
                <button
                  key={playlist.id}
                  onClick={() => !isAlreadyIn && handleSelect(playlist.id)}
                  disabled={isDisabled}
                  className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all ${
                    isDisabled 
                      ? 'opacity-50 cursor-not-allowed bg-white/5' 
                      : 'hover:bg-indigo-600/20 hover:border-indigo-500/50 border border-transparent cursor-pointer'
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                    {playlist.coverUrl ? (
                      <img src={playlist.coverUrl} className="w-full h-full object-cover rounded-lg" alt="" />
                    ) : (
                      <ListMusic className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-white font-medium truncate">{playlist.name}</div>
                    <div className="text-slate-500 text-xs">{playlist.songIds.length} songs</div>
                  </div>
                  {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                  ) : isAlreadyIn ? (
                      <span className="text-xs text-slate-500">Added</span>
                  ) : null}
                </button>
               );
            })}

            <button
              onClick={onCreateNew}
              disabled={loadingId !== null}
              className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 border border-dashed border-white/20 hover:border-white/50 transition-all group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-600 transition-colors">
                <Plus className="w-5 h-5 text-slate-400 group-hover:text-white" />
              </div>
              <div className="text-white font-medium">Create New Playlist</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
