import React from 'react';
import { Camera, CheckCircle2 } from 'lucide-react';
import { BackButton } from './BackButton';

interface DetailHeaderProps {
  title: string;
  subtitle: React.ReactNode;
  meta?: React.ReactNode;
  image: string;
  type: 'Album' | 'Artist' | 'Playlist';
  onBack: () => void;
  heroColor?: string;
  onImageUpload?: (file: File) => void;
}

export const DetailHeader: React.FC<DetailHeaderProps> = ({ title, subtitle, meta, image, type, onBack, heroColor = "from-indigo-500/20", onImageUpload }) => (
  <div className="relative">
    {/* Background Atmosphere */}
    <div className="absolute inset-0 h-[500px] overflow-hidden pointer-events-none">
      <div className={`absolute top-0 left-0 w-full h-full bg-gradient-to-b ${heroColor} to-transparent z-0 opacity-40`}></div>
      <div className="absolute top-[-50%] left-[-20%] w-[80%] h-[80%] rounded-full bg-white/5 blur-[120px] mix-blend-overlay"></div>
    </div>

    {/* Header Navigation */}
    <div className="relative z-30 pt-8 pl-8">
      <BackButton onClick={onBack} />
    </div>

    <div className="relative px-10 pb-12 pt-4 flex flex-col md:flex-row gap-10 items-end z-20 max-w-7xl mx-auto">
      <div className={`relative group ${type === 'Artist' ? 'rounded-full' : 'rounded-[2rem]'} overflow-hidden shadow-2xl shadow-black/50 flex-shrink-0 bg-[#1c1c1e]`}>
        <img
          src={image}
          alt={title}
          className={`w-64 h-64 md:w-72 md:h-72 object-cover transition-transform duration-700 group-hover:scale-105`}
        />
        {/* Shine effect */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
        
        {/* Image Upload Overlay */}
        {onImageUpload && (
          <label className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10">
            <Camera className="w-10 h-10 text-white mb-2" />
            <span className="text-white font-medium text-sm">Change Image</span>
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  onImageUpload(e.target.files[0]);
                }
              }}
            />
          </label>
        )}
      </div>

      <div className="flex-1 mb-2">
        <div className="flex items-center gap-3 mb-4">
          {type === 'Artist' && (
            <span className="bg-[#8b5cf6] text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-lg shadow-purple-900/20">
              <CheckCircle2 className="w-3 h-3" /> Verified Artist
            </span>
          )}
          <span className="text-sm font-bold tracking-[0.2em] text-indigo-300 uppercase">{type}</span>
        </div>

        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white mb-6 tracking-tight leading-[0.9] drop-shadow-lg">
          {title}
        </h1>

        <div className="flex flex-col gap-2">
          {subtitle && <div className="text-2xl font-bold text-white">{subtitle}</div>}
          {meta && <div className="flex items-center gap-3 text-slate-400 text-lg font-medium">{meta}</div>}
        </div>
      </div>
    </div>
  </div>
);