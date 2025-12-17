
import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight, Play, Pause } from 'lucide-react';
import { Song } from '../types';
import PlayingIndicator from './PlayingIndicator';
import { useNavigate } from 'react-router-dom';

interface CarouselProps {
  songs: Song[];
  currentSongId?: string;
  isPlaying: boolean;
  onPlaySong: (song: Song, context?: Song[]) => void;
}

export const RecentlyAddedCarousel: React.FC<CarouselProps> = ({ songs, currentSongId, isPlaying, onPlaySong }) => {
  const navigate = useNavigate();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
        const { current } = scrollContainerRef;
        const scrollAmount = direction === 'left' ? -current.offsetWidth / 1.5 : current.offsetWidth / 1.5;
        current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (songs.length === 0) return null;

  return (
    <div className="flex-1 mb-10">
        <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-white">Recently Added</h2>
            <button 
                onClick={() => navigate('/library/songs')}
                className="text-slate-400 text-sm font-bold hover:text-white flex items-center gap-1 transition-colors"
            >
                See all <ArrowRight className="w-4 h-4" />
            </button>
        </div>
        
        <div className="relative group/scroll">
            <button
                onClick={() => scroll('left')}
                className="absolute left-0 top-1/2 -translate-y-[calc(50%+10px)] z-20 p-3 bg-black/50 backdrop-blur-md rounded-full text-white opacity-0 group-hover/scroll:opacity-100 transition-opacity -ml-4 border border-white/10 hover:bg-black/70 hover:scale-110 shadow-lg"
                aria-label="Scroll left"
            >
                <ChevronLeft className="w-6 h-6" />
            </button>

            <div 
                ref={scrollContainerRef}
                className="flex gap-6 overflow-x-auto pb-6 -mx-2 px-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] scroll-smooth"
            >
                {songs.slice(0, 15).map(song => {
                    const isCurrent = currentSongId === song.id;
                    const isCurrentPlaying = isCurrent && isPlaying;
                    return (
                        <div 
                            key={song.id} 
                            onClick={() => onPlaySong(song, songs)}
                            className="group flex-shrink-0 w-44 cursor-pointer"
                        >
                            <div className="relative w-44 h-44 mb-3 rounded-2xl overflow-hidden shadow-lg bg-[#2c2c2e]">
                                <img 
                                    src={song.coverUrl} 
                                    alt={song.title} 
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                                <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300 ${isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                    {isCurrentPlaying ? (
                                        <>
                                            <div className="absolute inset-0 flex items-center justify-center group-hover:opacity-0 transition-opacity">
                                                <div className="w-12 h-12 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center">
                                                    <PlayingIndicator />
                                                </div>
                                            </div>
                                            <button className="w-12 h-12 bg-indigo-500 text-white rounded-full flex items-center justify-center hover:scale-110 transition-all opacity-0 group-hover:opacity-100 shadow-lg transform translate-y-2 group-hover:translate-y-0">
                                                <Pause className="w-5 h-5 fill-current" />
                                            </button>
                                        </>
                                    ) : (
                                        <button className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center hover:scale-110 transition-all shadow-lg transform translate-y-2 group-hover:translate-y-0">
                                            <Play className="w-5 h-5 fill-current ml-0.5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <h4 className={`font-bold text-base truncate transition-colors ${isCurrent ? 'text-indigo-400' : 'text-white group-hover:text-white'}`}>{song.title}</h4>
                            <p className="text-slate-400 text-sm truncate group-hover:text-slate-300 transition-colors">{song.artist}</p>
                        </div>
                    )
                })}
            </div>

            <button
                onClick={() => scroll('right')}
                className="absolute right-0 top-1/2 -translate-y-[calc(50%+10px)] z-20 p-3 bg-black/50 backdrop-blur-md rounded-full text-white opacity-0 group-hover/scroll:opacity-100 transition-opacity -mr-4 border border-white/10 hover:bg-black/70 hover:scale-110 shadow-lg"
                aria-label="Scroll right"
            >
                <ChevronRight className="w-6 h-6" />
            </button>
        </div>
    </div>
  );
};
