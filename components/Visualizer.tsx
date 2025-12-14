import React, { useEffect, useRef, useState } from 'react';
import { X, Play, Pause, SkipBack, SkipForward, ChevronDown } from 'lucide-react';
import { Song } from '../types';
import { ProgressBar } from './ProgressBar';

interface VisualizerProps {
    currentSong: Song;
    isPlaying: boolean;
    onClose: () => void;
    wavis: any; // Using any for the Wavis class instance
    onPlayPause: () => void;
    onNext: () => void;
    onPrev: () => void;
    currentTime: number;
    duration: number;
    onSeek: (time: number) => void;
    activeVisualizer: string;
    onVisualizerChange: (visualizer: string) => void;
}

const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const Visualizer: React.FC<VisualizerProps> = ({
    currentSong,
    isPlaying,
    onClose,
    wavis,
    onPlayPause,
    onNext,
    onPrev,
    currentTime,
    duration,
    onSeek,
    activeVisualizer,
    onVisualizerChange
}) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [showControls, setShowControls] = useState(true);
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [visualizerOptions, setVisualizerOptions] = useState<any[]>([]);

    useEffect(() => {
        const isCanvasVisualizer = activeVisualizer !== 'album cover' && activeVisualizer !== 'none';
        
        if (isCanvasVisualizer && canvasRef.current) {
            wavis.mount(canvasRef.current);
            wavis.start();
            wavis.setVisualizer(activeVisualizer);
        } else {
            wavis.unmount();
        }

        // Get visualizers from original Wavis class (returns array of strings)
        if (wavis && wavis.getVisualizers) {
            const presets = wavis.getVisualizers();
            // Map strings to object format for dropdown
            const formattedPresets = presets.map((p: string) => ({
                name: p,
                displayName: p.charAt(0).toUpperCase() + p.slice(1),
                type: 'custom'
            }));
            setVisualizerOptions(formattedPresets);
        }
        
    }, [activeVisualizer, wavis]);

    const handleMouseMove = () => {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => {
            if (!isDropdownOpen) setShowControls(false);
        }, 3000);
    };

    useEffect(() => {
        // Initial timeout
        handleMouseMove();
        window.addEventListener('mousemove', handleMouseMove);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        };
    }, [isDropdownOpen]); // Re-bind if dropdown state changes to update closure in handleMouseMove

    // Combine custom visualizers with static modes
    const allOptions = [
        { name: 'album cover', displayName: 'Album Cover', type: 'static' },
        { name: 'none', displayName: 'None', type: 'static' },
        ...visualizerOptions,
    ];

    return (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center overflow-hidden">
            {/* Render Canvas if not album cover or none */}
            {activeVisualizer !== 'album cover' && activeVisualizer !== 'none' && (
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
            )}

            {/* Album Cover Mode */}
            {activeVisualizer === 'album cover' && (
                <div className="relative z-10 animate-in fade-in duration-700">
                    <img 
                        src={currentSong.coverUrl} 
                        alt={currentSong.title} 
                        className="w-[50vh] h-[50vh] object-cover rounded-[3rem] shadow-2xl shadow-indigo-500/20"
                    />
                    {/* Reflection */}
                    <img 
                        src={currentSong.coverUrl} 
                        alt="" 
                        className="absolute top-full left-0 w-full h-full object-cover rounded-[3rem] opacity-20 blur-xl transform scale-y-[-1] mask-linear-fade"
                        style={{ maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1), transparent)' }}
                    />
                </div>
            )}

            {/* Controls Overlay */}
            <div 
                className={`absolute inset-0 flex flex-col justify-between p-8 transition-opacity duration-500 ${showControls || isDropdownOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.5), transparent 20%, transparent 80%, rgba(0,0,0,0.8))' }}
            >
                {/* Header */}
                <div className="flex justify-between items-start relative z-50">
                    <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/5 flex items-center gap-2 pointer-events-auto">
                        <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Visualizer</span>
                        <div className="w-[1px] h-3 bg-white/20"></div>
                        <div className="relative">
                            <button 
                                onClick={(e) => { e.stopPropagation(); setIsDropdownOpen(!isDropdownOpen); }}
                                className="flex items-center gap-1 text-white text-sm font-bold hover:text-indigo-400 transition-colors uppercase"
                            >
                                {activeVisualizer.replace(/_/g, ' ')} <ChevronDown className={`w-3 h-3 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {/* Dropdown */}
                            {isDropdownOpen && (
                                <>
                                    <div 
                                        className="fixed inset-0 z-40" 
                                        onClick={() => setIsDropdownOpen(false)} 
                                    ></div>
                                    <div className="absolute top-full left-0 mt-4 w-64 bg-[#1c1c1e] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                                        <div className="max-h-80 overflow-y-auto custom-scrollbar">
                                            {allOptions.map(v => (
                                                <button
                                                    key={v.name}
                                                    onClick={() => { onVisualizerChange(v.name); setIsDropdownOpen(false); }}
                                                    className={`w-full text-left px-4 py-3 text-sm font-medium hover:bg-white/10 transition-colors capitalize border-b border-white/5 last:border-0 ${activeVisualizer === v.name ? 'text-indigo-400 bg-white/5' : 'text-slate-300'}`}
                                                >
                                                    {v.displayName}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors backdrop-blur-md pointer-events-auto"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Footer Controls */}
                <div className="w-full max-w-3xl mx-auto space-y-6 pointer-events-auto">
                    <div className="text-center space-y-2">
                        <h1 className="text-4xl font-bold text-white tracking-tight drop-shadow-lg">{currentSong.title}</h1>
                        <p className="text-xl text-indigo-300 font-medium drop-shadow-md">{currentSong.artist} • <span className="text-slate-400">{currentSong.album}</span></p>
                    </div>

                    <div className="flex items-center gap-4 w-full">
                        <span className="text-sm font-bold text-slate-400 tabular-nums w-10 text-right">{formatTime(currentTime)}</span>
                        <ProgressBar 
                            currentTime={currentTime} 
                            duration={duration} 
                            onSeek={onSeek} 
                            className="bg-white/20"
                        />
                        <span className="text-sm font-bold text-slate-400 tabular-nums w-10">{formatTime(duration)}</span>
                    </div>

                    <div className="flex items-center justify-center gap-10">
                        <button onClick={onPrev} className="text-slate-300 hover:text-white transition-colors hover:scale-110 transform">
                            <SkipBack className="w-8 h-8 fill-current" />
                        </button>
                        <button
                            onClick={onPlayPause}
                            className="w-16 h-16 bg-white rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-xl hover:shadow-indigo-500/50"
                        >
                            {isPlaying ? (
                                <Pause className="w-7 h-7 text-black fill-current" />
                            ) : (
                                <Play className="w-7 h-7 text-black fill-current ml-1" />
                            )}
                        </button>
                        <button onClick={onNext} className="text-slate-300 hover:text-white transition-colors hover:scale-110 transform">
                            <SkipForward className="w-8 h-8 fill-current" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};