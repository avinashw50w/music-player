import React, { useState } from 'react';

interface CreatePlaylistModalProps {
  onClose: () => void;
  onCreate: (name: string) => void;
}

export const CreatePlaylistModal: React.FC<CreatePlaylistModalProps> = ({ onClose, onCreate }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreate(name);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-[#1c1c1e] border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
        <h3 className="text-2xl font-bold text-white mb-6">Create New Playlist</h3>
        <form onSubmit={handleSubmit}>
            <div className="mb-8">
              <label className="block text-sm font-medium text-slate-400 mb-2">Playlist Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Awesome Playlist"
                autoFocus
                className="w-full bg-black/50 text-white border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button 
                type="button"
                onClick={onClose} 
                className="px-6 py-2.5 rounded-full font-bold text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={!name.trim()}
                className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full font-bold transition-colors shadow-lg shadow-indigo-500/20"
              >
                Create
              </button>
            </div>
        </form>
      </div>
    </div>
  );
};