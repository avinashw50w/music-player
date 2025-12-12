import React from 'react';
import { Playlist, Song } from '../types';
import { X, ListMusic, Plus } from 'lucide-react';

interface AddToPlaylistModalProps {
  song: Song;
  playlists: Playlist[];
  onClose: () => void;
  onSelect: (playlistId: string) => void;
  onCreateNew: () => void;
}

export const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({ song, playlists, onClose, onSelect, onCreateNew }) => {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-[#1c1c1e] border border-white/10 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">Add to Playlist</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
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
               return (
                <button
                  key={playlist.id}
                  onClick={() => !isAlreadyIn && onSelect(playlist.id)}
                  disabled={isAlreadyIn}
                  className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all ${
                    isAlreadyIn 
                      ? 'opacity-50 cursor-not-allowed bg-white/5' 
                      : 'hover:bg-indigo-600/20 hover:border-indigo-500/50 border border-transparent'
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
                  {isAlreadyIn && <span className="text-xs text-slate-500">Added</span>}
                </button>
               );
            })}

            <button
              onClick={onCreateNew}
              className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 border border-dashed border-white/20 hover:border-white/50 transition-all group"
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