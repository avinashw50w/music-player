
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Sparkles, Loader2 } from 'lucide-react';

interface SuggestionData {
    title: string;
    artist: string;
    album: string;
    genre: string[];
    year?: number;
    coverUrl?: string;
}

interface SuggestionModalProps {
  currentData: SuggestionData;
  suggestedData: SuggestionData;
  onClose: () => void;
  onConfirm: (data: SuggestionData) => Promise<void> | void;
}

export const SuggestionModal: React.FC<SuggestionModalProps> = ({ currentData, suggestedData, onClose, onConfirm }) => {
  // Helper to determine initial value: fallback to current if suggested is invalid
  const getInitialValue = (suggested: string | undefined, current: string, invalidValues: string[] = []) => {
      if (!suggested || suggested.trim() === '' || invalidValues.includes(suggested)) {
          return current;
      }
      return suggested;
  };

  // Local state for editing. Convert genre array to string for input.
  const [formData, setFormData] = useState(() => ({
      title: getInitialValue(suggestedData.title, currentData.title, ['Unknown Title']),
      artist: getInitialValue(suggestedData.artist, currentData.artist, ['Unknown Artist', 'Unknown']),
      album: getInitialValue(suggestedData.album, currentData.album, ['Unknown Album', 'Unknown']),
      genre: (suggestedData.genre && suggestedData.genre.length > 0) 
          ? suggestedData.genre.join(', ') 
          : currentData.genre.join(', '),
      year: suggestedData.year ? String(suggestedData.year) : (currentData.year ? String(currentData.year) : '')
  }));

  const [isSaving, setIsSaving] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
      return () => { isMounted.current = false; };
  }, []);

  const handleChange = (field: string, value: string) => {
      setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleConfirm = async () => {
      if (isSaving) return;
      setIsSaving(true);
      try {
        await onConfirm({
            title: formData.title,
            artist: formData.artist,
            album: formData.album,
            genre: formData.genre.split(',').map(g => g.trim()).filter(Boolean),
            year: parseInt(formData.year) || undefined,
            coverUrl: suggestedData.coverUrl // Pass through the cover URL if available
        });
      } finally {
        if (isMounted.current) {
            setIsSaving(false);
        }
      }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
        onClick={() => !isSaving && onClose()}
      />
      
      {/* Modal Content */}
      <div className="bg-[#1c1c1e] border border-white/10 rounded-3xl p-8 w-full max-w-5xl shadow-2xl relative z-10 animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        <div className="flex items-center gap-3 mb-8 flex-shrink-0">
            <div className="p-3 rounded-full bg-indigo-500/20 text-indigo-400">
                <Sparkles className="w-6 h-6" />
            </div>
            <div>
                <h3 className="text-2xl font-bold text-white">Metadata Suggestion</h3>
                <p className="text-slate-400">Review and edit changes before applying them.</p>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar pr-2 -mr-2">
            <div className="grid grid-cols-[1fr_auto_1fr] gap-6 items-stretch mb-2">
                {/* Current Side */}
                <div className="bg-white/5 rounded-2xl p-6 border border-white/5 flex flex-col justify-start min-w-0 h-full">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">Current Metadata</h4>
                    
                    {/* Current Image */}
                    {currentData.coverUrl && (
                        <div className="mb-6 flex justify-center">
                            <img src={currentData.coverUrl} alt="Current Cover" className="w-40 h-40 rounded-xl object-cover shadow-lg opacity-70" />
                        </div>
                    )}

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
                <div className="bg-indigo-500/10 rounded-2xl p-6 border border-indigo-500/20 relative overflow-hidden flex flex-col justify-start min-w-0 h-full">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-3xl rounded-full pointer-events-none"></div>
                    <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-6 relative z-10">Suggested Changes</h4>
                    
                    {/* Suggested Image */}
                    {suggestedData.coverUrl && (
                        <div className="mb-6 flex justify-center relative z-10">
                            <img src={suggestedData.coverUrl} alt="New Cover" className="w-40 h-40 rounded-xl object-cover shadow-lg border-2 border-indigo-500/30" />
                        </div>
                    )}

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
                        <div>
                            <label className="block text-xs text-indigo-300/70 mb-1">Year</label>
                            <input 
                                type="text" 
                                value={formData.year} 
                                onChange={(e) => handleChange('year', e.target.value)}
                                placeholder="YYYY"
                                className="w-full bg-black/20 border border-indigo-500/30 rounded-lg px-3 py-2 text-indigo-100 font-medium focus:outline-none focus:border-indigo-400 transition-colors placeholder:text-indigo-500/30"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div className="flex justify-end gap-4 flex-shrink-0 mt-8">
          <button 
            onClick={onClose} 
            disabled={isSaving}
            className="px-6 py-3 text-slate-300 hover:text-white font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button 
            onClick={handleConfirm} 
            disabled={isSaving}
            className="px-8 py-3 bg-white text-black rounded-full font-bold transition-transform hover:scale-105 shadow-lg shadow-white/10 flex items-center gap-2 disabled:opacity-70 disabled:hover:scale-100 disabled:cursor-wait"
          >
            {isSaving ? (
                <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Applying...
                </>
            ) : (
                <>
                    <Sparkles className="w-4 h-4 fill-current" />
                    Apply Changes
                </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
