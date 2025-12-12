import React, { useState } from 'react';
import { Home, Search, FolderOpen, Heart, PlusSquare, Music, ListMusic, ChevronDown, ChevronUp } from 'lucide-react';
import { NavigationState, Playlist } from '../types';

interface SidebarProps {
  currentView: NavigationState['view'];
  onNavigate: (view: NavigationState['view']) => void;
  onPlaylistClick: (id: string) => void;
  onCreatePlaylist: () => void;
  playlists: Playlist[];
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, onPlaylistClick, onCreatePlaylist, playlists }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const menuItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'browse', label: 'Browse', icon: FolderOpen },
    { id: 'favorites', label: 'Favorite', icon: Heart },
  ];

  const visiblePlaylists = isExpanded ? playlists : playlists.slice(0, 3);
  const showExpandButton = playlists.length > 3;

  return (
    <div className="w-72 h-full flex flex-col flex-shrink-0 z-20">
      {/* Fixed Header/Logo */}
      <div className="p-8 pb-4 flex-shrink-0">
        <div className="flex items-center gap-3 text-white px-2">
          <Music className="w-8 h-8 text-indigo-500" />
          <span className="text-2xl font-bold tracking-tight">Myousic</span>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] px-6 pb-6">
        {/* Menu */}
        <div className="mb-8 mt-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 px-4">Menu</h3>
          <nav className="space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id as any)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all text-base font-semibold ${
                  currentView === item.id
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon className={`w-5 h-5 ${currentView === item.id ? 'text-white' : 'text-slate-400'}`} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Playlists */}
        <div>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 px-4">Playlists</h3>
          <div className="space-y-2">
            <button 
              onClick={onCreatePlaylist}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-base font-medium group"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center group-hover:bg-indigo-500 transition-colors">
                <PlusSquare className="w-4 h-4" />
              </div>
              Create New
            </button>
            
            {visiblePlaylists.map((pl) => (
              <button
                key={pl.id}
                onClick={() => onPlaylistClick(pl.id)}
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-base font-medium truncate"
              >
                <ListMusic className="w-5 h-5 flex-shrink-0" />
                <span className="truncate">{pl.name}</span>
              </button>
            ))}

            {showExpandButton && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-4 py-3 mt-1 text-xs font-bold text-slate-500 hover:text-white transition-colors uppercase tracking-wider group rounded-xl hover:bg-white/5"
              >
                <span>{isExpanded ? 'View Less' : `View All (${playlists.length})`}</span>
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;