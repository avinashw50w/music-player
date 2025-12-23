
import React from 'react';
import { Camera, Edit3, Heart, ListPlus, Pause, Play, Trash2, Wand2, Sparkles, Bot } from 'lucide-react';
import { Song } from '../types';

interface HeroProps {
  song: Song;
  isPlaying: boolean;
  currentSongId?: string;
  isIdentifying: boolean;
  isIdentifyingSpotify: boolean;
  isRefining: boolean;
  identifyError: string | null;
  onPlay: () => void;
  onToggleFavorite: () => void;
  onAddToPlaylist: () => void;
  onCoverUpload: (file: File) => void;
  onIdentify: () => void;
  onIdentifySpotify: () => void;
  onRefine: () => void;
  onEdit: () => void;
  onDelete: () => void;
  renderArtists: () => React.ReactNode;
}

export const SongDetailsHero: React.FC<HeroProps> = (props) => {
  const { song, isPlaying, currentSongId, isIdentifying, isIdentifyingSpotify, isRefining, identifyError } = props;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-12 items-end">
      {/* Left: Album Art */}
      <div className="relative group w-80 h-80 rounded-[2.5rem] overflow-hidden shadow-2xl flex-shrink-0 mx-auto lg:mx-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] bg-indigo-500/30 blur-3xl rounded-full opacity-50 -z-10"></div>
          <img
            src={song.coverUrl}
            alt={song.title}
            className="w-full h-full object-cover relative z-10"
          />
          <label className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-20">
            <Camera className="w-10 h-10 text-white mb-2" />
            <span className="text-white font-medium text-sm">Change Image</span>
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  props.onCoverUpload(e.target.files[0]);
                }
              }}
            />
          </label>
      </div>

      {/* Right: Info & Controls */}
      <div className="flex flex-col gap-6 w-full min-w-0">
         <div className="flex justify-end relative">
            <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 shadow-xl">
                <button onClick={props.onIdentify} disabled={isIdentifying} title="Identify Song with MusicBrainz" className={`p-2 text-slate-300 hover:text-white rounded-xl hover:bg-white/10 transition-all cursor-pointer ${isIdentifying ? 'animate-pulse text-indigo-400' : ''}`}>
                    <Wand2 className="w-5 h-5"/>
                </button>
                <button onClick={props.onIdentifySpotify} disabled={isIdentifyingSpotify} title="Find Metadata on Spotify" className={`p-2 text-slate-300 hover:text-green-400 rounded-xl hover:bg-white/10 transition-all cursor-pointer ${isIdentifyingSpotify ? 'animate-pulse text-green-400' : ''}`}>
                    <Sparkles className="w-5 h-5"/>
                </button>
                <button onClick={props.onRefine} disabled={isRefining} title="Refine Metadata with AI" className={`p-2 text-slate-300 hover:text-indigo-300 rounded-xl hover:bg-white/10 transition-all cursor-pointer ${isRefining ? 'animate-pulse text-indigo-300' : ''}`}>
                    <Bot className="w-5 h-5"/>
                </button>
                <div className="w-[1px] h-5 bg-white/20 mx-1"></div>
                <button onClick={props.onEdit} className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-white/10 cursor-pointer" title="Edit Info">
                    <Edit3 className="w-5 h-5"/>
                </button>
                <button onClick={props.onDelete} className="p-2 text-rose-400 hover:text-rose-300 rounded-xl hover:bg-rose-500/20 cursor-pointer" title="Delete Song">
                    <Trash2 className="w-5 h-5"/>
                </button>
            </div>
            {identifyError && (
                <div className="absolute -top-12 right-0 bg-rose-500/90 text-white text-xs px-3 py-2 rounded-xl animate-in fade-in slide-in-from-bottom-1 shadow-lg border border-rose-400/50 z-50 whitespace-nowrap">
                    {identifyError}
                </div>
            )}
         </div>

         <div>
            <h1 className="text-4xl md:text-6xl font-black text-white mb-2 tracking-tight leading-tight">{song.title}</h1>
            <p className="text-2xl text-indigo-300 font-medium">{props.renderArtists()}</p>
         </div>

         <div className="flex items-center justify-start gap-4 flex-wrap">
            <button
              onClick={props.onPlay}
              className="px-8 py-3 bg-white text-black rounded-full font-bold flex items-center gap-2 hover:scale-105 transition-transform cursor-pointer"
            >
              {currentSongId === song.id && isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
              {currentSongId === song.id && isPlaying ? "Pause" : "Play"}
            </button>
            <button
              onClick={props.onToggleFavorite}
              className={`p-3 rounded-full border border-white/10 hover:bg-white/10 transition-colors cursor-pointer ${song.isFavorite ? 'text-rose-500' : 'text-slate-400'}`}
            >
              <Heart className={`w-6 h-6 ${song.isFavorite ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={props.onAddToPlaylist}
              className="p-3 rounded-full border border-white/10 hover:bg-white/10 transition-colors text-slate-400 hover:text-white cursor-pointer"
              title="Add to Playlist"
            >
              <ListPlus className="w-6 h-6" />
            </button>
         </div>
      </div>
    </div>
  );
};
