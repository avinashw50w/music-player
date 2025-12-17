
import { useState, useEffect, useRef, useCallback } from 'react';
import { Song } from '../types';
import Wavis from '../lib/waviz';
import { getCookie, setCookie } from '../lib/cookies';

export const useAudioPlayer = (addToHistory: (song: Song) => void) => {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Persistent Preferences
  const [volume, setVolume] = useState(() => {
    const saved = getCookie('myousic_volume');
    return saved !== '' ? parseFloat(saved) : 1;
  });
  
  const [isShuffle, setIsShuffle] = useState(() => {
    return getCookie('myousic_shuffle') === 'true';
  });

  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>(() => {
    const saved = getCookie('myousic_repeat');
    return (saved as any) || 'off';
  });

  const [activeVisualizer, setActiveVisualizer] = useState(() => {
    return getCookie('myousic_visualizer') || 'bars';
  });

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const [playbackQueue, setPlaybackQueue] = useState<Song[]>([]);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wavisRef = useRef<any>(null);

  // Sync Preferences to Cookies
  useEffect(() => { setCookie('myousic_volume', volume.toString()); }, [volume]);
  useEffect(() => { setCookie('myousic_visualizer', activeVisualizer); }, [activeVisualizer]);
  useEffect(() => { setCookie('myousic_shuffle', isShuffle.toString()); }, [isShuffle]);
  useEffect(() => { setCookie('myousic_repeat', repeatMode); }, [repeatMode]);

  // Initialize Wavis
  useEffect(() => {
      if (audioRef.current && !wavisRef.current) wavisRef.current = new Wavis(audioRef.current);
  }, []);

  const playAudio = useCallback(async () => {
    if (!audioRef.current || !currentSong) return;
    try { await audioRef.current.play(); } catch (err: any) { if (err.name !== 'AbortError') console.error("Playback failed", err); }
  }, [currentSong]);

  useEffect(() => {
    if (audioRef.current) {
        audioRef.current.volume = volume;
        if (isPlaying) playAudio();
        else audioRef.current.pause();
    }
  }, [isPlaying, currentSong, playAudio, volume]);

  const handlePlaySong = useCallback((song: Song, context?: Song[]) => {
    addToHistory(song);
    if (currentSong?.id === song.id) {
        setIsPlaying(prev => !prev);
    } else {
        if (audioRef.current) audioRef.current.currentTime = 0;
        setCurrentTime(0);
        setCurrentSong(song);
        setIsPlaying(true);
        if (context) setPlaybackQueue(context);
        else setPlaybackQueue(prev => prev.length === 0 || !prev.find(s => s.id === song.id) ? [song] : prev); 
    }
  }, [currentSong, addToHistory]);

  const handlePlayContext = useCallback((context: Song[]) => {
    if (context.length > 0) {
      handlePlaySong(context[0], context);
    }
  }, [handlePlaySong]);

  const handleSeek = useCallback((time: number) => {
    if (audioRef.current) {
        audioRef.current.currentTime = time;
        setCurrentTime(time);
    }
  }, []);

  const handleNext = useCallback(() => {
      if (!currentSong || playbackQueue.length === 0) return;
      const currentIndex = playbackQueue.findIndex(s => s.id === currentSong.id);
      let nextIndex = isShuffle ? Math.floor(Math.random() * playbackQueue.length) : currentIndex + 1;
      if (nextIndex >= playbackQueue.length) {
          if (repeatMode === 'all') nextIndex = 0;
          else { setIsPlaying(false); return; }
      }
      handlePlaySong(playbackQueue[nextIndex], playbackQueue);
  }, [currentSong, playbackQueue, isShuffle, repeatMode, handlePlaySong]);

  const handlePrev = useCallback(() => {
    if (!currentSong || playbackQueue.length === 0) return;
    if (audioRef.current && audioRef.current.currentTime > 3) { audioRef.current.currentTime = 0; return; }
    const currentIndex = playbackQueue.findIndex(s => s.id === currentSong.id);
    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) {
        if (repeatMode === 'all' || isShuffle) prevIndex = playbackQueue.length - 1;
        else { if (audioRef.current) audioRef.current.currentTime = 0; return; }
    }
    handlePlaySong(playbackQueue[prevIndex], playbackQueue);
  }, [currentSong, playbackQueue, repeatMode, isShuffle, handlePlaySong]);

  const handleToggleRepeat = useCallback(() => {
    setRepeatMode(prev => {
        if (prev === 'off') return 'all';
        if (prev === 'all') return 'one';
        return 'off';
    });
  }, []);

  const handleTimeUpdate = useCallback(() => {
      if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
          if (audioRef.current.duration && !isNaN(audioRef.current.duration) && audioRef.current.duration !== duration) {
              setDuration(audioRef.current.duration);
          }
      }
  }, [duration]);

  const handleLoadedMetadata = useCallback(() => {
      if (audioRef.current && !isNaN(audioRef.current.duration)) {
          setDuration(audioRef.current.duration);
      }
  }, []);

  // Keyboard Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          setIsPlaying(prev => !prev);
          break;
        case 'ArrowLeft':
          if (e.metaKey || e.ctrlKey) {
             handlePrev();
          } else {
             if (audioRef.current) {
                 audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 5);
                 setCurrentTime(audioRef.current.currentTime);
             }
          }
          break;
        case 'ArrowRight':
          if (e.metaKey || e.ctrlKey) {
             handleNext();
          } else {
             if (audioRef.current) {
                 audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 5);
                 setCurrentTime(audioRef.current.currentTime);
             }
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, duration]);

  // Media Session API
  useEffect(() => {
    if ('mediaSession' in navigator && currentSong) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title,
        artist: currentSong.artist,
        album: currentSong.album,
        artwork: [
          { src: currentSong.coverUrl, sizes: '512x512', type: 'image/jpeg' }
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => setIsPlaying(true));
      navigator.mediaSession.setActionHandler('pause', () => setIsPlaying(false));
      navigator.mediaSession.setActionHandler('previoustrack', handlePrev);
      navigator.mediaSession.setActionHandler('nexttrack', handleNext);
      navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (details.seekTime && audioRef.current) {
              audioRef.current.currentTime = details.seekTime;
              setCurrentTime(details.seekTime);
          }
      });
    }
  }, [currentSong, handleNext, handlePrev]);

  return {
    currentSong, setCurrentSong,
    isPlaying, setIsPlaying,
    volume, setVolume,
    isShuffle, setIsShuffle,
    repeatMode, setRepeatMode,
    activeVisualizer, setActiveVisualizer,
    currentTime,
    duration,
    playbackQueue, setPlaybackQueue,
    audioRef,
    wavisRef,
    handlePlaySong,
    handlePlayContext,
    handleSeek,
    handleNext,
    handlePrev,
    handleToggleRepeat,
    handleTimeUpdate,
    handleLoadedMetadata
  };
};
