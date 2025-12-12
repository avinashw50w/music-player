import React, { useState } from 'react';
import { Pause, Play, Shuffle, Heart, MoreHorizontal, Edit3, Trash2 } from 'lucide-react';

interface ActionButtonsProps {
  isPlaying: boolean;
  onPlay: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showEditControls?: boolean;
  isFollowing?: boolean;
  onFollow?: () => void;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({ isPlaying, onPlay, onEdit, onDelete, showEditControls, isFollowing, onFollow }) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="px-10 py-2 flex items-center gap-6 relative z-20 max-w-7xl mx-auto">
      <button
        onClick={onPlay}
        className="w-16 h-16 bg-white rounded-full flex items-center justify-center hover:scale-105 hover:bg-indigo-50 transition-all shadow-xl shadow-white/5 active:scale-95 group"
      >
        {isPlaying ? (
           <Pause className="w-7 h-7 text-black fill-current ml-0 group-hover:scale-110 transition-transform" />
        ) : (
           <Play className="w-7 h-7 text-black fill-current ml-1 group-hover:scale-110 transition-transform" />
        )}
      </button>

      {onFollow && (
        <button
          onClick={onFollow}
          className={`px-8 py-3 rounded-full font-bold text-base border-2 transition-all ${isFollowing
            ? 'border-indigo-500 text-indigo-400 hover:bg-indigo-950'
            : 'border-slate-600 text-white hover:border-white'
            }`}
        >
          {isFollowing ? 'Following' : 'Follow'}
        </button>
      )}

      <div className="flex items-center gap-4 ml-2">
        <button className="p-3 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-white/5">
          <Shuffle className="w-7 h-7" />
        </button>
        <button className="p-3 text-slate-400 hover:text-rose-500 transition-colors rounded-full hover:bg-white/5">
          <Heart className="w-7 h-7" />
        </button>
      </div>

      {(showEditControls || onEdit) && (
        <div className="ml-auto relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="text-slate-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
          >
            <MoreHorizontal className="w-7 h-7" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-[#1c1c1e] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden ring-1 ring-black/50">
              {onEdit && (
                <button
                  onClick={() => { setShowMenu(false); onEdit(); }}
                  className="w-full text-left px-5 py-4 text-base text-slate-200 hover:bg-white/5 flex items-center gap-3 transition-colors"
                >
                  <Edit3 className="w-5 h-5" /> Edit Details
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => { setShowMenu(false); onDelete(); }}
                  className="w-full text-left px-5 py-4 text-base text-rose-400 hover:bg-white/5 flex items-center gap-3 transition-colors"
                >
                  <Trash2 className="w-5 h-5" /> Delete
                </button>
              )}
            </div>
          )}
          {showMenu && <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)}></div>}
        </div>
      )}
    </div>
  );
};