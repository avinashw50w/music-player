
import React, { useState } from 'react';
import { Mic2, Search, Music, Loader2 } from 'lucide-react';

interface LyricsSectionProps {
  lyrics: string;
  isEditing: boolean;
  isFetching: boolean;
  onLyricsChange: (text: string) => void;
  onEditToggle: (editing: boolean) => void;
  onFetchSynced: () => void;
  onSave: () => Promise<void> | void;
}

export const LyricsSection: React.FC<LyricsSectionProps> = ({ 
  lyrics, isEditing, isFetching, onLyricsChange, onEditToggle, onFetchSynced, onSave 
}) => {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
      if (isSaving) return;
      setIsSaving(true);
      try {
          await onSave();
      } catch (e) {
          console.error("Failed to save lyrics", e);
          setIsSaving(false);
      }
  };

  return (
    <div className="bg-[#1c1c1e]/80 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-10 flex flex-col min-h-[400px] shadow-2xl relative overflow-hidden">
      <div className="flex items-center justify-between mb-8 relative z-10">
        <h3 className="text-2xl font-bold text-white flex items-center gap-2">
          <Mic2 className="w-6 h-6 text-indigo-400" /> Lyrics
        </h3>
        <div className="flex items-center gap-3">
            {!isEditing && (
                <button
                    onClick={onFetchSynced}
                    disabled={isFetching}
                    className="text-sm font-bold text-indigo-300 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/20 px-4 py-2 rounded-full transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                    {isFetching ? (
                        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <Search className="w-3 h-3" />
                    )}
                    {lyrics ? 'Refetch Synced' : 'Find Synced'}
                </button>
            )}
            {!isEditing && (
                <button
                    onClick={() => onEditToggle(true)}
                    className="text-sm font-bold text-slate-400 hover:text-white bg-white/5 px-4 py-2 rounded-full transition-colors cursor-pointer"
                >
                    {lyrics ? 'Edit' : 'Add'}
                </button>
            )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
        {isEditing ? (
          <div className="h-full flex flex-col">
            <textarea
              value={lyrics}
              onChange={(e) => onLyricsChange(e.target.value)}
              placeholder="Paste lyrics here..."
              disabled={isSaving}
              className="w-full min-h-[300px] bg-black/20 text-white rounded-xl p-6 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xl leading-relaxed font-medium placeholder:text-slate-600 mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => !isSaving && onEditToggle(false)}
                disabled={isSaving}
                className="px-6 py-2 rounded-full font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2 rounded-full font-bold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-lg cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                    </>
                ) : 'Save Lyrics'}
              </button>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            {lyrics ? (
              <p className="whitespace-pre-line text-2xl leading-relaxed text-slate-300 font-medium text-center max-w-4xl mx-auto">
                {lyrics}
              </p>
            ) : (
              <div className="text-center py-10">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-500">
                  <Music className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">No Lyrics</h4>
                <div className="flex items-center justify-center gap-4 mt-6">
                    <button onClick={onFetchSynced} disabled={isFetching} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed">
                        {isFetching ? 'Searching...' : 'Find Synced'}
                    </button>
                    <button onClick={() => onEditToggle(true)} className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all cursor-pointer">
                        Manual Entry
                    </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
