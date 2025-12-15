
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Sparkles } from 'lucide-react';

interface SuggestionData {
    title: string;
    artist: string;
    album: string;
    genre: string[];
}

interface SuggestionModalProps {
  currentData: SuggestionData;
  suggestedData: SuggestionData;
  onClose: () => void;
  onConfirm: (data: SuggestionData) => void;
}

export const SuggestionModal: React.FC<SuggestionModalProps> = ({ currentData, suggestedData, onClose, onConfirm }) => {
  // Local state for editing. Convert genre array to string for input.
  const [formData, setFormData] = useState({
      title: suggestedData.title || '',
      artist: suggestedData.artist || '',
      album: suggestedData.album || '',
      genre: (suggestedData.genre || []).join(', ')
  });

  const handleChange = (field: string, value: string) => {
      setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleConfirm = () => {
      onConfirm({
          title: formData.title,
          artist: formData.artist,
          album: formData.album,
          genre: formData.genre.split(',').map(g => g.trim()).filter(Boolean)
      });
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="bg-[#1c1c1e] border border-white/10 rounded-3xl p-8 w-full max-w-5xl shadow-2xl relative z-10 animate-in fade-in zoom-in duration-200 flex flex-col">
        <div className="flex items-center gap-3 mb-8">
            <div className="p-3 rounded-full bg-indigo-500/20 text-indigo-400">
                <Sparkles className="w-6 h-6" />
            </div>
            <div>
                <h3 className="text-2xl font-bold text-white">AI Suggestion</h3>
                <p className="text-slate-400">Review and edit changes before applying them.</p>
            </div>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] gap-6 items-stretch mb-8">
            {/* Current Side */}
            <div className="bg-white/5 rounded-2xl p-6 border border-white/5 flex flex-col justify-center min-w-0">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">Current Metadata</h4>
                <div className="space-y-6">
                    <div>
                        <span className="block text-xs text-slate-500 mb-1">Title</span>
                        <span className="font-bold text-white text-lg block truncate" title={currentData.title}>{currentData.title}</span>
                    </div>
                    <div>
                        <span className="block text-xs text-slate-500 mb-1">Artist</span>
                        <span className="text-slate-300 font-medium block truncate" title={currentData.artist}>{currentData.artist}</span>
                    </div>
                    <div>
                        <span className="block text-xs text-slate-500 mb-1">Album</span>
                        <span className="text-slate-300 font-medium block truncate" title={currentData.album}>{currentData.album}</span>
                    </div>
                    <div>
                        <span className="block text-xs text-slate-500 mb-1">Genre</span>
                        <span className="text-slate-300 font-medium block truncate" title={currentData.genre.join(', ')}>{currentData.genre.join(', ')}</span>
                    </div>
                </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center items-center">
                <ArrowRight className="w-8 h-8 text-slate-600" />
            </div>

            {/* Suggested Side (Editable) */}
            <div className="bg-indigo-500/10 rounded-2xl p-6 border border-indigo-500/20 relative overflow-hidden flex flex-col justify-center min-w-0">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-3xl rounded-full pointer-events-none"></div>
                <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-6 relative z-10">Suggested Changes</h4>
                <div className="space-y-4 relative z-10">
                    <div>
                        <label className="block text-xs text-indigo-300/70 mb-1">Title</label>
                        <input 
                            type="text" 
                            value={formData.title} 
                            onChange={(e) => handleChange('title', e.target.value)}
                            placeholder="Song Title"
                            className="w-full bg-black/20 border border-indigo-500/30 rounded-lg px-3 py-2 text-indigo-100 font-bold text-lg focus:outline-none focus:border-indigo-400 transition-colors placeholder:text-indigo-500/30"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-indigo-300/70 mb-1">Artist</label>
                        <input 
                            type="text" 
                            value={formData.artist} 
                            onChange={(e) => handleChange('artist', e.target.value)}
                            placeholder="Artist Name"
                            className="w-full bg-black/20 border border-indigo-500/30 rounded-lg px-3 py-2 text-indigo-100 font-medium focus:outline-none focus:border-indigo-400 transition-colors placeholder:text-indigo-500/30"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-indigo-300/70 mb-1">Album</label>
                        <input 
                            type="text" 
                            value={formData.album} 
                            onChange={(e) => handleChange('album', e.target.value)}
                            placeholder="Album Name"
                            className="w-full bg-black/20 border border-indigo-500/30 rounded-lg px-3 py-2 text-indigo-100 font-medium focus:outline-none focus:border-indigo-400 transition-colors placeholder:text-indigo-500/30"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-indigo-300/70 mb-1">Genre</label>
                        <input 
                            type="text" 
                            value={formData.genre} 
                            onChange={(e) => handleChange('genre', e.target.value)}
                            placeholder="Genre1, Genre2"
                            className="w-full bg-black/20 border border-indigo-500/30 rounded-lg px-3 py-2 text-indigo-100 font-medium focus:outline-none focus:border-indigo-400 transition-colors placeholder:text-indigo-500/30"
                        />
                    </div>
                </div>
            </div>
        </div>

        <div className="flex justify-end gap-4">
          <button 
            onClick={onClose} 
            className="px-6 py-3 text-slate-300 hover:text-white font-bold transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleConfirm} 
            className="px-8 py-3 bg-white text-black rounded-full font-bold transition-transform hover:scale-105 shadow-lg shadow-white/10 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 fill-current" />
            Apply Changes
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
