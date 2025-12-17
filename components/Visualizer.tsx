
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { X, Play, Pause, SkipBack, SkipForward, ChevronDown, Mic2, Search } from 'lucide-react';
import { Song } from '../types';
import { ProgressBar } from './ProgressBar';
import { parseLrc, LrcLine } from '../lib/lrcParser';
import * as api from '../services/api';

interface VisualizerProps {
    currentSong: Song;
    isPlaying: boolean;
    onClose: () => void;
    wavis: any;
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

// 1. Memoized Canvas Component
const VisualizerCanvas = React.memo(({ wavis, activeVisualizer }: { wavis: any, activeVisualizer: string }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const isCanvasVisualizer = activeVisualizer !== 'album cover' && activeVisualizer !== 'none' && activeVisualizer !== 'lyrics';
        
        if (isCanvasVisualizer && canvasRef.current) {
            wavis.mount(canvasRef.current);
            wavis.start();
            wavis.setVisualizer(activeVisualizer);
        } else {
            wavis.unmount();
        }

        return () => {
            wavis.unmount();
        };
    }, [activeVisualizer, wavis]);

    if (activeVisualizer === 'album cover' || activeVisualizer === 'none' || activeVisualizer === 'lyrics') {
        return null;
    }

    return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
});

// 2. Memoized Background Component
const VisualizerBackground = React.memo(({ 
    activeVisualizer, 
    coverUrl, 
    title,
    dominantColor 
}: { 
    activeVisualizer: string, 
    coverUrl: string, 
    title: string,
    dominantColor: string
}) => {
    const isModeWithBg = activeVisualizer === 'album cover' || activeVisualizer === 'lyrics' || activeVisualizer === 'none';
    
    // Create a themed background style
    const themedBgStyle = {
        background: `radial-gradient(circle at center, ${dominantColor} 0%, #000000 100%)`,
        transition: 'background 1.5s ease-in-out'
    };

    return (
        <div className="absolute inset-0 z-0 overflow-hidden" style={themedBgStyle}>
            {/* Blurred Background for Lyrics */}
            {activeVisualizer === 'lyrics' && (
                <>
                    <div className="absolute inset-0 w-full h-full bg-black">
                        <img 
                            src={coverUrl} 
                            className="w-full h-full object-cover opacity-40"
                            style={{ filter: 'blur(60px)', transform: 'scale(1.2)' }}
                            alt="" 
                        />
                    </div>
                    {/* Color Overlay to deepen the theme */}
                    <div 
                        className="absolute inset-0 opacity-40 transition-colors duration-1000" 
                        style={{ backgroundColor: dominantColor }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black/80"></div>
                </>
            )}

            {/* Album Cover Mode */}
            {activeVisualizer === 'album cover' && (
                <div className="relative z-10 w-full h-full flex items-center justify-center animate-in fade-in duration-1000">
                    <div className="relative group">
                        {/* Glow behind the cover */}
                        <div 
                            className="absolute inset-0 blur-[100px] opacity-50 scale-110 rounded-full transition-colors duration-1000"
                            style={{ backgroundColor: dominantColor }}
                        />
                        
                        <img 
                            src={coverUrl} 
                            alt={title} 
                            className="w-[min(50vh,80vw)] h-[min(50vh,80vw)] object-cover rounded-[2.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] z-20 relative border border-white/10"
                        />
                    </div>
                </div>
            )}
        </div>
    );
});

// 3. Memoized Lyric Line
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
            className={`transition-all duration-500 ease-out origin-center cursor-pointer py-3 select-none ${
                isActive 
                  ? 'text-white text-3xl md:text-4xl font-bold opacity-100 scale-105' 
                  : 'text-neutral-500 text-2xl md:text-3xl font-medium opacity-30 blur-[0.5px] hover:opacity-60 hover:blur-0'
            }`}
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
    const lyricsContainerRef = useRef<HTMLDivElement>(null);
    const [showControls, setShowControls] = useState(true);
    const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    
    // Dynamic Color State
    const [dominantColor, setDominantColor] = useState('rgba(30, 30, 40, 0.5)');
    
    // Lyrics State
    const [parsedLyrics, setParsedLyrics] = useState<LrcLine[]>([]);
    const [activeLineIndex, setActiveLineIndex] = useState(-1);
    const [isFetchingLyrics, setIsFetchingLyrics] = useState(false);
    
    // Background fetch tracking
    const [fetchedDetailsForId, setFetchedDetailsForId] = useState<string | null>(null);
    const [isFetchingDetails, setIsFetchingDetails] = useState(false);

    // Extract dominant color from image
    useEffect(() => {
        if (!currentSong.coverUrl) return;

        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            
            // Draw to a 1x1 canvas to get average color
            canvas.width = 1;
            canvas.height = 1;
            ctx.drawImage(img, 0, 0, 1, 1);
            
            try {
                const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
                // Set the color with a dark multiplier to keep it background-friendly
                setDominantColor(`rgba(${Math.floor(r * 0.6)}, ${Math.floor(g * 0.6)}, ${Math.floor(b * 0.6)}, 0.4)`);
            } catch (e) {
                console.warn("Could not extract pixel data due to CORS or other issue");
                setDominantColor('rgba(40, 40, 60, 0.4)');
            }
        };
        img.onerror = () => setDominantColor('rgba(40, 40, 60, 0.4)');
        img.src = currentSong.coverUrl;
    }, [currentSong.coverUrl]);

    // Initial Visualizer Options
    const [visualizerOptions] = useState(() => {
        if (wavis && wavis.getVisualizers) {
            return wavis.getVisualizers().map((p: string) => ({
                name: p,
                displayName: p.charAt(0).toUpperCase() + p.slice(1),
                type: 'custom'
            }));
        }
        return [];
    });

    const stableSeek = useCallback((t: number) => onSeek(t), [onSeek]);

    // Parse Lyrics logic
    useEffect(() => {
        if (currentSong.lyrics) {
            const parsed = parseLrc(currentSong.lyrics);
            setParsedLyrics(parsed);
            setIsFetchingDetails(false);
        } else {
            setParsedLyrics([]);
            if (fetchedDetailsForId !== currentSong.id) {
                setFetchedDetailsForId(currentSong.id);
                setIsFetchingDetails(true);
                api.getSong(currentSong.id).then(fullSong => {
                    if (fullSong.lyrics) {
                        onUpdateSong(fullSong);
                    }
                })
                .catch(e => console.error("Failed to background fetch details", e))
                .finally(() => setIsFetchingDetails(false));
            }
        }
        setActiveLineIndex(-1);
    }, [currentSong.lyrics, currentSong.id, fetchedDetailsForId, onUpdateSong]);

    // Active Lyric Index Logic
    useEffect(() => {
        if (activeVisualizer !== 'lyrics' || parsedLyrics.length === 0) return;

        let newIndex = activeLineIndex;
        const currentLine = parsedLyrics[activeLineIndex];
        const nextLine = parsedLyrics[activeLineIndex + 1];
        
        if (currentLine && currentTime >= currentLine.time && (!nextLine || currentTime < nextLine.time)) {
            return;
        }

        if (nextLine && currentTime >= nextLine.time && (!parsedLyrics[activeLineIndex + 2] || currentTime < parsedLyrics[activeLineIndex + 2].time)) {
            newIndex = activeLineIndex + 1;
        } else {
            newIndex = parsedLyrics.findIndex((line, i) => {
                const next = parsedLyrics[i + 1];
                return currentTime >= line.time && (!next || currentTime < next.time);
            });
        }
        
        if (newIndex !== activeLineIndex) {
            setActiveLineIndex(newIndex);
            
            if (lyricsContainerRef.current && newIndex !== -1) {
                const activeEl = lyricsContainerRef.current.children[newIndex + 1] as HTMLElement;
                if (activeEl) {
                    activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }
    }, [currentTime, parsedLyrics, activeVisualizer, activeLineIndex]);

    const handleMouseMove = useCallback(() => {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => {
            if (!isDropdownOpen) setShowControls(false);
        }, 3000);
    }, [isDropdownOpen]);

    useEffect(() => {
        handleMouseMove();
        window.addEventListener('mousemove', handleMouseMove);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        };
    }, [handleMouseMove]); 

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

    const allOptions = useMemo(() => [
        { name: 'none', displayName: 'None', type: 'static' },
        { name: 'lyrics', displayName: 'Lyrics', type: 'mode' },
        { name: 'album cover', displayName: 'Album Cover', type: 'static' },
        ...visualizerOptions,
    ], [visualizerOptions]);

    return (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center overflow-hidden font-sans">
            
            {/* Layer 1: Background & Themed Gradient (Dynamic) */}
            <VisualizerBackground 
                activeVisualizer={activeVisualizer} 
                coverUrl={currentSong.coverUrl} 
                title={currentSong.title}
                dominantColor={dominantColor}
            />

            {/* Layer 2: Canvas (Visualizer Bars/Waves) */}
            <VisualizerCanvas wavis={wavis} activeVisualizer={activeVisualizer} />

            {/* Layer 3: Lyrics Content */}
            {activeVisualizer === 'lyrics' && (
                <div className="relative z-10 w-full h-full flex flex-col items-center justify-center pb-56 pt-20">
                    {parsedLyrics.length > 0 ? (
                        <div 
                            ref={lyricsContainerRef}
                            className="w-full max-w-5xl h-full overflow-y-auto px-8 md:px-12 text-center space-y-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                            style={{ 
                                maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
                            }}
                        >
                            <div className="h-[45vh]"></div>
                            {parsedLyrics.map((line, i) => (
                                <LyricLine 
                                    key={i} 
                                    line={line} 
                                    isActive={i === activeLineIndex} 
                                    onSeek={stableSeek} 
                                />
                            ))}
                            <div className="h-[45vh]"></div>
                        </div>
                    ) : isFetchingDetails ? (
                        <div className="flex flex-col items-center justify-center">
                            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-slate-400 font-medium">Loading lyrics...</p>
                        </div>
                    ) : currentSong.lyrics ? (
                        <div className="w-full max-w-4xl h-full overflow-y-auto px-8 text-center space-y-4 custom-scrollbar">
                             <div className="h-[20vh]"></div>
                             <p className="text-slate-400 text-sm mb-8 uppercase tracking-widest">Unsynced Lyrics</p>
                             <p className="whitespace-pre-line text-white/90 text-2xl font-medium leading-loose">
                                {currentSong.lyrics}
                             </p>
                             <div className="h-[20vh]"></div>
                        </div>
                    ) : (
                        <div className="text-center relative z-20 animate-in fade-in zoom-in duration-300">
                            <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400">
                                <Mic2 className="w-10 h-10" />
                            </div>
                            <h2 className="text-3xl font-bold text-white mb-2">No Synced Lyrics</h2>
                            <p className="text-slate-400 mb-8 max-w-md mx-auto">
                                We couldn't find time-synced lyrics for this track.
                            </p>
                            <button
                                onClick={handleFetchLyrics}
                                disabled={isFetchingLyrics}
                                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-bold transition-all shadow-lg hover:shadow-indigo-500/25 flex items-center gap-2 mx-auto disabled:opacity-50 pointer-events-auto"
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

            {/* Layer 4: Controls Overlay */}
            <div 
                className={`absolute inset-0 flex flex-col justify-between p-8 transition-opacity duration-300 z-[100] pointer-events-none ${showControls || isDropdownOpen ? 'opacity-100' : 'opacity-0'}`}
                style={{ background: showControls ? 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent 20%, transparent 80%, rgba(0,0,0,0.8))' : 'none' }}
            >
                {/* Header */}
                <div className="flex justify-between items-start relative z-50">
                    <div className="bg-black/40 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10 flex items-center gap-2 pointer-events-auto shadow-lg">
                        <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Visualizer</span>
                        <div className="w-[1px] h-3 bg-white/20"></div>
                        <div className="relative">
                            <button 
                                onClick={(e) => { e.stopPropagation(); setIsDropdownOpen(!isDropdownOpen); }}
                                className="flex items-center gap-1 text-white text-sm font-bold hover:text-indigo-400 transition-colors uppercase"
                            >
                                {activeVisualizer.replace(/_/g, ' ')} <ChevronDown className={`w-3 h-3 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>
                            
                            {isDropdownOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)}></div>
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
                        className="p-3 bg-black/40 hover:bg-white/10 rounded-full text-white transition-colors backdrop-blur-xl border border-white/10 shadow-lg pointer-events-auto"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Footer Controls */}
                <div className="w-full max-w-3xl mx-auto pointer-events-auto">
                    <div className="bg-black/60 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl space-y-6">
                        <div className="text-center space-y-2">
                            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight drop-shadow-lg truncate">{currentSong.title}</h1>
                            <p className="text-lg md:text-xl text-indigo-300 font-medium drop-shadow-md truncate">{currentSong.artist}</p>
                        </div>

                        <div className="flex items-center gap-4 w-full">
                            <span className="text-md font-bold text-slate-400 tabular-nums w-10 text-right">{formatTime(currentTime)}</span>
                            <ProgressBar 
                                currentTime={currentTime} 
                                duration={duration} 
                                onSeek={onSeek} 
                                className="bg-white/10"
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
