
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Play, Pause, SkipBack, SkipForward, ChevronDown, Mic2, Search } from 'lucide-react';
import { Song } from '../types';
import { ProgressBar } from './ProgressBar';
import { parseLrc, LrcLine } from '../lib/lrcParser';
import * as api from '../services/api';

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
    onUpdateSong: (song: Song) => void;
}

const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Optimized Lyric Line Component to prevent unnecessary re-renders
const LyricLine = React.memo(({ 
    line, 
    isActive, 
    onSeek 
}: { 
    line: LrcLine, 
    isActive: boolean, 
    onSeek: (time: number) => void 
}) => {
    return (
        <p 
            className={`transition-all duration-650 ease-out origin-center cursor-pointer py-2 select-none ${
                isActive 
                  ? 'text-white text-2xl md:text-3xl font-bold opacity-100 blur-0' 
                  : 'text-neutral-400 text-xl md:text-2xl font-medium opacity-30 blur-[1px]'
            }`}
            style={{ willChange: 'transform, opacity, filter' }}
            onClick={() => onSeek(line.time)}
        >
            {line.text}
        </p>
    );
}, (prev, next) => prev.isActive === next.isActive && prev.line === next.line);

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
    onVisualizerChange,
    onUpdateSong
}) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const lyricsContainerRef = useRef<HTMLDivElement>(null);
    const [showControls, setShowControls] = useState(true);
    const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [visualizerOptions, setVisualizerOptions] = useState<any[]>([]);
    
    // Lyrics State
    const [parsedLyrics, setParsedLyrics] = useState<LrcLine[]>([]);
    const [activeLineIndex, setActiveLineIndex] = useState(-1);
    const [isFetchingLyrics, setIsFetchingLyrics] = useState(false);
    
    // New state to track background fetch of song details
    const [isFetchingDetails, setIsFetchingDetails] = useState(false);
    const [fetchedDetailsForId, setFetchedDetailsForId] = useState<string | null>(null);

    // Create a stable onSeek reference to pass to memoized components
    const onSeekRef = useRef(onSeek);
    useEffect(() => { onSeekRef.current = onSeek; }, [onSeek]);
    const stableSeek = useCallback((t: number) => onSeekRef.current(t), []);

    useEffect(() => {
        const isCanvasVisualizer = activeVisualizer !== 'album cover' && activeVisualizer !== 'none' && activeVisualizer !== 'lyrics';
        
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
            const formattedPresets = presets.map((p: string) => ({
                name: p,
                displayName: p.charAt(0).toUpperCase() + p.slice(1),
                type: 'custom'
            }));
            setVisualizerOptions(formattedPresets);
        }
        
    }, [activeVisualizer, wavis]);

    // Parse Lyrics when song changes
    useEffect(() => {
        if (currentSong.lyrics) {
            const parsed = parseLrc(currentSong.lyrics);
            setParsedLyrics(parsed);
            setIsFetchingDetails(false);
        } else {
            setParsedLyrics([]);
            
            // If lyrics are missing, try fetching the full song object once
            // This is the "on-demand" fetching logic
            if (fetchedDetailsForId !== currentSong.id) {
                setFetchedDetailsForId(currentSong.id);
                setIsFetchingDetails(true);
                api.getSong(currentSong.id).then(fullSong => {
                    // Update global state with full details (including lyrics if they exist)
                    if (fullSong.lyrics) {
                        onUpdateSong(fullSong);
                    }
                })
                .catch(e => console.error("Failed to background fetch song details", e))
                .finally(() => setIsFetchingDetails(false));
            }
        }
        setActiveLineIndex(-1);
    }, [currentSong.lyrics, currentSong.id, fetchedDetailsForId, onUpdateSong]);

    // Determine Active Lyric Line (Optimized)
    useEffect(() => {
        if (activeVisualizer !== 'lyrics' || parsedLyrics.length === 0) return;

        // Optimization: Check if current active line is still valid (avoids array scan)
        const currentLine = parsedLyrics[activeLineIndex];
        const nextLine = parsedLyrics[activeLineIndex + 1];
        
        if (currentLine && currentTime >= currentLine.time && (!nextLine || currentTime < nextLine.time)) {
            return; // Still on the same line
        }

        // Optimization: Check the immediate next line (sequential playback scenario)
        if (nextLine && currentTime >= nextLine.time && (!parsedLyrics[activeLineIndex + 2] || currentTime < parsedLyrics[activeLineIndex + 2].time)) {
            setActiveLineIndex(activeLineIndex + 1);
            return;
        }

        // Fallback: Binary search or full scan for seek/jumps
        const index = parsedLyrics.findIndex((line, i) => {
            const next = parsedLyrics[i + 1];
            return currentTime >= line.time && (!next || currentTime < next.time);
        });
        
        if (index !== activeLineIndex) {
            setActiveLineIndex(index);
        }
    }, [currentTime, parsedLyrics, activeVisualizer, activeLineIndex]);

    // Auto-scroll lyrics
    useEffect(() => {
        if (activeVisualizer === 'lyrics' && activeLineIndex !== -1 && lyricsContainerRef.current) {
             const activeEl = lyricsContainerRef.current.children[activeLineIndex + 1] as HTMLElement; // +1 because of spacer
             if (activeEl) {
                 activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
             }
        }
    }, [activeLineIndex, activeVisualizer]);

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
    }, [isDropdownOpen]); 

    const handleFetchLyrics = async () => {
        if (isFetchingLyrics) return;
        setIsFetchingLyrics(true);
        try {
            const updatedSong = await api.fetchSyncedLyrics(currentSong.id);
            if (updatedSong) {
                onUpdateSong(updatedSong);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsFetchingLyrics(false);
        }
    };

    const allOptions = [
        { name: 'none', displayName: 'None', type: 'static' },
        { name: 'lyrics', displayName: 'Lyrics', type: 'mode' },
        { name: 'album cover', displayName: 'Album Cover', type: 'static' },
        ...visualizerOptions,
    ];

    return (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center overflow-hidden">
            {/* Render Canvas if a visualizer preset */}
            {activeVisualizer !== 'album cover' && activeVisualizer !== 'none' && activeVisualizer !== 'lyrics' && (
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
            )}

            {/* Album Cover Mode or Background for Lyrics */}
            {(activeVisualizer === 'album cover' || activeVisualizer === 'lyrics') && (
                <div className="absolute inset-0 z-0 overflow-hidden">
                     {/* Blurred Background for Lyrics */}
                     {activeVisualizer === 'lyrics' && (
                        <>
                            <img 
                                src={currentSong.coverUrl} 
                                className="absolute inset-0 w-full h-full object-cover blur-[80px] opacity-40 scale-110"
                                alt=""
                                style={{ transform: 'translate3d(0,0,0)' }} // Force GPU layer
                            />
                            <div className="absolute inset-0 bg-black/60"></div>
                        </>
                     )}

                     {activeVisualizer === 'album cover' && (
                        <div className="relative z-10 w-full h-full flex items-center justify-center animate-in fade-in duration-700">
                            <img 
                                src={currentSong.coverUrl} 
                                alt={currentSong.title} 
                                className="w-[50vh] h-[50vh] object-cover rounded-[3rem] shadow-2xl shadow-indigo-500/20"
                            />
                             <img 
                                src={currentSong.coverUrl} 
                                alt="" 
                                className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-[25vh] w-[50vh] h-[50vh] object-cover rounded-[3rem] opacity-20 blur-xl transform scale-y-[-1] mask-linear-fade pointer-events-none"
                                style={{ maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1), transparent)' }}
                            />
                        </div>
                     )}
                </div>
            )}

            {/* Lyrics View */}
            {activeVisualizer === 'lyrics' && (
                <div className="relative z-10 w-full h-full flex flex-col items-center justify-center pb-56 pt-20">
                    {parsedLyrics.length > 0 ? (
                        <div 
                            ref={lyricsContainerRef}
                            className="w-full max-w-6xl h-full overflow-y-auto px-8 md:px-24 text-center space-y-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                            style={{ 
                                maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
                                transform: 'translate3d(0,0,0)' // Force layer
                            }}
                        >
                            <div className="h-[45vh]"></div> {/* Spacer for center alignment */}
                            {parsedLyrics.map((line, i) => (
                                <LyricLine 
                                    key={i} 
                                    line={line} 
                                    isActive={i === activeLineIndex} 
                                    onSeek={stableSeek} 
                                />
                            ))}
                            <div className="h-[45vh]"></div> {/* Spacer */}
                        </div>
                    ) : isFetchingDetails ? (
                        <div className="flex flex-col items-center justify-center">
                            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-slate-400 font-medium">Loading lyrics...</p>
                        </div>
                    ) : currentSong.lyrics ? (
                        // Unsynced Lyrics View
                        <div className="w-full max-w-4xl h-full overflow-y-auto px-8 text-center space-y-4 custom-scrollbar">
                             <div className="h-[20vh]"></div>
                             <p className="text-slate-400 text-sm mb-8 uppercase tracking-widest">Unsynced Lyrics</p>
                             <p className="whitespace-pre-line text-white/80 text-xl md:text-2xl font-medium leading-relaxed">
                                {currentSong.lyrics}
                             </p>
                             <div className="h-[20vh]"></div>
                        </div>
                    ) : (
                        // Empty State
                        <div className="text-center relative z-20">
                            <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400">
                                <Mic2 className="w-10 h-10" />
                            </div>
                            <h2 className="text-3xl font-bold text-white mb-2">No Synced Lyrics Found</h2>
                            <p className="text-slate-400 mb-8 max-w-md mx-auto">
                                We couldn't find time-synced lyrics for this track in your library.
                            </p>
                            <button
                                onClick={handleFetchLyrics}
                                disabled={isFetchingLyrics}
                                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-bold transition-all shadow-lg hover:shadow-indigo-500/25 flex items-center gap-2 mx-auto disabled:opacity-50 relative pointer-events-auto"
                            >
                                {isFetchingLyrics ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Searching...
                                    </>
                                ) : (
                                    <>
                                        <Search className="w-5 h-5" />
                                        Find Synced Lyrics
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Controls Overlay */}
            <div 
                className={`absolute inset-0 flex flex-col justify-between p-8 transition-opacity duration-500 z-[100] pointer-events-none ${showControls || isDropdownOpen ? 'opacity-100' : 'opacity-0'}`}
                style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.5), transparent 20%, transparent 80%, rgba(0,0,0,0.8))' }}
            >
                {/* Header */}
                <div className="flex justify-between items-start relative z-50">
                    <div className="bg-white/10 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10 flex items-center gap-2 pointer-events-auto shadow-lg">
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
                                                    <div className="flex items-center justify-between">
                                                        {v.displayName}
                                                        {v.name === 'lyrics' && <Mic2 className="w-3 h-3 opacity-50" />}
                                                    </div>
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
                        className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors backdrop-blur-xl border border-white/10 shadow-lg pointer-events-auto"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Footer Controls */}
                <div className="w-full max-w-3xl mx-auto pointer-events-auto">
                    <div className="bg-black/40 backdrop-blur-2xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl space-y-6">
                        <div className="text-center space-y-2">
                            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight drop-shadow-lg truncate">{currentSong.title}</h1>
                            <p className="text-lg md:text-xl text-indigo-300 font-medium drop-shadow-md truncate">{currentSong.artist} • <span className="text-slate-400">{currentSong.album}</span></p>
                        </div>

                        <div className="flex items-center gap-4 w-full">
                            <span className="text-md font-bold text-slate-400 tabular-nums w-10 text-right">{formatTime(currentTime)}</span>
                            <ProgressBar 
                                currentTime={currentTime} 
                                duration={duration} 
                                onSeek={onSeek} 
                                className="bg-white/20"
                            />
                            <span className="text-md font-bold text-slate-400 tabular-nums w-10">{formatTime(duration)}</span>
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
        </div>
    );
};
