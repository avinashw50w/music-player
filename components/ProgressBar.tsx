import React, { useState, useEffect, useRef, useCallback } from 'react';

interface ProgressBarProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ currentTime, duration, onSeek, className = "" }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState(0);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Update drag value when not dragging to sync with playback
  useEffect(() => {
    if (!isDragging) {
      setDragValue(currentTime);
    }
  }, [currentTime, isDragging]);

  const calculateTime = useCallback((clientX: number) => {
    if (!progressBarRef.current || !duration) return 0;
    const rect = progressBarRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return percent * duration;
  }, [duration]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    const newTime = calculateTime(e.clientX);
    setDragValue(newTime);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    const newTime = calculateTime(e.touches[0].clientX);
    setDragValue(newTime);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setDragValue(calculateTime(e.clientX));
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging) {
        setDragValue(calculateTime(e.touches[0].clientX));
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (isDragging) {
        const finalTime = calculateTime(e.clientX);
        onSeek(finalTime);
        setIsDragging(false);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (isDragging) {
        // For touch end, we use the last known drag value since there are no touches
        onSeek(dragValue); 
        setIsDragging(false);
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, calculateTime, onSeek, dragValue]);

  const displayTime = isDragging ? dragValue : currentTime;
  const progressPercent = duration ? (displayTime / duration) * 100 : 0;

  return (
    <div 
      className={`flex-1 h-1.5 bg-white/10 rounded-full cursor-pointer relative group ${className}`}
      ref={progressBarRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <div 
        className="absolute h-full bg-indigo-500 rounded-full group-hover:bg-indigo-400 transition-colors pointer-events-none" 
        style={{ width: `${progressPercent}%` }}
      >
        <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md transition-transform ${isDragging ? 'scale-125 opacity-100' : 'scale-0 opacity-0 group-hover:scale-125 group-hover:opacity-100'}`}></div>
      </div>
    </div>
  );
};