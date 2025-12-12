import React from 'react';
import { Home, Search, FolderOpen, Heart, PlusSquare, Music, ListMusic } from 'lucide-react';
import { NavigationState, Playlist } from '../types';

interface SidebarProps {
  currentView: NavigationState['view'];
  onNavigate: (view: NavigationState['view']) => void;
  onPlaylistClick: (id: string) => void;
  onCreatePlaylist: () => void;
  playlists: Playlist[];
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, onPlaylistClick, onCreatePlaylist, playlists }) => {
  const menuItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'browse', label: 'Browse', icon: FolderOpen },
    { id: 'favorites', label: 'Favorite', icon: Heart },
  ];

  return (
    <div className="w-72 h-full flex flex-col flex-shrink-0 z-20">
      <div className="p-8 flex-1 flex flex-col">
        {/* Logo */}
        <div className="flex items-center gap-3 text-white mb-12 px-2">
          <Music className="w-8 h-8 text-indigo-500" />
          <span className="text-2xl font-bold tracking-tight">Myousic</span>
        </div>

        {/* Menu */}
        <div className="mb-10">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-5 px-3">Menu</h3>
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
        <div className="flex-1 min-h-0 flex flex-col">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-5 px-3">Playlists</h3>
          <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-2">
            <button 
              onClick={onCreatePlaylist}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-base font-medium group"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center group-hover:bg-indigo-500 transition-colors">
                <PlusSquare className="w-5 h-5" />
              </div>
              Create New
            </button>
            {playlists.map((pl) => (
              <button
                key={pl.id}
                onClick={() => onPlaylistClick(pl.id)}
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-base font-medium truncate"
              >
                <ListMusic className="w-5 h-5 flex-shrink-0" />
                <span className="truncate">{pl.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* User Profile */}
      {/*<div className="p-6 mx-2 mb-2">
        <div className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 transition-colors cursor-pointer">
          <img 
            src="https://picsum.photos/id/64/100/100" 
            alt="User" 
            className="w-12 h-12 rounded-full object-cover border border-white/10"
          />
          <div className="overflow-hidden">
            <h4 className="text-base font-bold text-white truncate">Mardo Umulumu</h4>
            <p className="text-sm text-slate-500 truncate">Free Plan</p>
          </div>
        </div>
      </div>*/}
    </div>
  );
};

export default Sidebar;